from fastapi import APIRouter, Query, Depends, HTTPException
from datetime import date, timedelta, datetime
from ..models import Slot, AvailabilitySeedRequest, AvailabilitySeedResult, DaySchedule, Mechanic
from ..utils.slots import build_slots
from ..auth import get_scheduler_or_mechanic_user, User
from ..firestore import get_client
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential
from google.api_core.exceptions import ServiceUnavailable, Aborted
from google.cloud import firestore

router = APIRouter(prefix="/availability", tags=["availability"])

@router.get("", response_model=list[Slot])
async def get_availability(day: date = Query(...)):
    db = get_client()
    if not db:
        return []

    doc = db.collection("availability").document(day.isoformat()).get()
    if not doc.exists:
        return []           # no slots published yet

    data = doc.to_dict()["slots"]          # { "08:00": "free", … }
    slots = []
    for time_str, status in data.items():
        start_iso = f"{day}T{time_str}"
        # compute end time client‑side (placeholder  :‑) )
        slots.append(Slot(start=start_iso, end=start_iso, is_free=(status=="free")))
    return slots

@router.post("/seed", response_model=AvailabilitySeedResult, status_code=202)
@retry(
    retry=retry_if_exception_type((ServiceUnavailable, Aborted)),
    wait=wait_exponential(multiplier=0.5, max=30),
    stop=stop_after_attempt(5),
)
async def seed_availability(
    req: AvailabilitySeedRequest,
    user: User = Depends(get_scheduler_or_mechanic_user),
):
    """Generate availability documents for a week based on mechanics schedules.
    This route can be triggered by Cloud Scheduler (system) or a mechanic/admin.
    """

    db = get_client()
    if not db:
        raise HTTPException(500, "Firestore client not initialised")

    # Determine week start (Monday)
    today = datetime.utcnow().date()
    if req.week_start:
        week_start = req.week_start
    else:
        # find next Monday relative to today
        days_ahead = (7 - today.weekday()) % 7  # Monday=0
        days_ahead = 7 if days_ahead == 0 else days_ahead
        week_start = today + timedelta(days=days_ahead)

    created = updated = skipped = 0

    mechanics_cur = db.collection("mechanics").where("active", "==", True).stream()
    mechanics: list[Mechanic] = []
    for doc in mechanics_cur:
        data = doc.to_dict()
        data["id"] = doc.id
        mechanics.append(Mechanic(**data))

    # Build date list Monday-Sunday
    days = [week_start + timedelta(days=i) for i in range(7)]
    batch = db.batch()  # Accumulate writes for efficiency; commit later each day.

    for day in days:
        day_doc = db.collection("availability").document(day.isoformat())
        day_data = day_doc.get().to_dict() if day_doc.get().exists else None

    # We'll write per mechanic to avoid large docverts.

    # For each mechanic, build/merge slots per day
    for mech in mechanics:
        for idx, day_date in enumerate(days):
            weekday = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"][
                idx
            ]
            day_sched: DaySchedule | None = getattr(mech.schedule, weekday)
            if not day_sched or not day_sched.start or not day_sched.end:
                skipped += 1
                continue

            slot_map = build_slots(day_sched.start, day_sched.end)
            doc_ref = db.collection("availability").document(day_date.isoformat())

            def txn_fn(transaction, **_):
                nonlocal created, updated
                snap = doc_ref.get(transaction=transaction)
                if not snap.exists:
                    # Create new doc
                    transaction.set(
                        doc_ref,
                        {
                            "day": day_date.isoformat(),
                            "slots": slot_map,
                            "mechanics": {mech.id: True},
                            "created_at": firestore.SERVER_TIMESTAMP,
                            "updated_at": firestore.SERVER_TIMESTAMP,
                        },
                    )
                    created += 1
                else:
                    data = snap.to_dict()
                    merged_slots = data.get("slots", {})
                    for key, val in slot_map.items():
                        # Only overwrite if slot not present or not booked
                        if merged_slots.get(key) in (None, "free", "blocked"):
                            merged_slots[key] = val
                    mechanics_map = data.get("mechanics", {})
                    mechanics_map[mech.id] = True
                    transaction.update(
                        doc_ref,
                        {
                            "slots": merged_slots,
                            "mechanics": mechanics_map,
                            "updated_at": firestore.SERVER_TIMESTAMP,
                        },
                    )
                    updated += 1

            if req.dry_run:
                skipped += 1
                continue

            transaction = db.transaction()
            transaction(txn_fn)

    if not req.dry_run:
        pass  # transactions executed inline above

    return AvailabilitySeedResult(
        week_start=week_start,
        created=created,
        updated=updated,
        skipped=skipped,
        dry_run=req.dry_run,
    )
