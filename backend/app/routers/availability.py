from fastapi import APIRouter, Query
from datetime import date
from ..models import Slot
from ..firestore import get_client

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
