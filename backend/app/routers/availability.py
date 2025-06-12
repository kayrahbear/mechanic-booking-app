from fastapi import APIRouter, Query, HTTPException
from datetime import date, timedelta, datetime
from typing import Optional
from ..models import Slot, Mechanic
from ..utils.slots import build_slots
from ..firestore import get_client

router = APIRouter(prefix="/availability", tags=["availability"])

@router.get("", response_model=list[Slot])
async def get_availability(
    date: Optional[date] = Query(None, description="Date to get availability for (YYYY-MM-DD)"),
    day: Optional[date] = Query(None, description="Date to get availability for (YYYY-MM-DD) - legacy parameter"),
    service_id: Optional[str] = Query(None, description="Filter by service ID (currently unused as all mechanics can perform all services)")
):
    """
    Get availability for a specific day. This endpoint generates availability
    dynamically based on mechanic schedules and existing bookings.
    
    Simplified approach: always generate dynamically, no caching complexity.
    Accepts either 'date' or 'day' parameter for backward compatibility.
    """
    # Handle backward compatibility - accept either 'date' or 'day' parameter
    target_date = date or day
    if not target_date:
        raise HTTPException(400, "Either 'date' or 'day' parameter is required")
    
    db = get_client()
    if not db:
        return []

    return await _generate_availability_for_day(db, target_date, service_id)

async def _generate_availability_for_day(db, day: date, service_id: Optional[str] = None) -> list[Slot]:
    """Generate availability for a day based on mechanic schedules and existing bookings."""
    # Get active mechanics
    mechanics_query = db.collection("mechanics").where("active", "==", True)
    
    mechanics = []
    for doc in mechanics_query.stream():
        data = doc.to_dict()
        data["id"] = doc.id
        mechanics.append(Mechanic(**data))
    
    if not mechanics:
        return []
    
    # Get day of week for schedule lookup
    weekday_names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    weekday = weekday_names[day.weekday()]
    
    # Generate all possible slots from all mechanics
    all_slots = {}  # time_str -> {"status": "free", "mechanic_id": mechanic_id}
    
    for mechanic in mechanics:
        day_schedule = getattr(mechanic.schedule, weekday)
        if not day_schedule or not day_schedule.start or not day_schedule.end:
            continue
            
        # Generate slots for this mechanic's schedule
        slot_map = build_slots(day_schedule.start, day_schedule.end)
        for time_str in slot_map.keys():
            if time_str not in all_slots:
                all_slots[time_str] = {"status": "free", "mechanic_id": mechanic.id}
    
    # Check existing bookings for this day to mark slots as booked
    day_start = datetime.combine(day, datetime.min.time())
    day_end = datetime.combine(day, datetime.max.time())
    
    bookings_query = db.collection("bookings").where(
        "slot_start", ">=", day_start
    ).where(
        "slot_start", "<=", day_end
    ).where(
        "status", "in", ["pending", "confirmed"]
    ).stream()
    
    for booking_doc in bookings_query:
        booking_data = booking_doc.to_dict()
        booking_start = booking_data["slot_start"]
        if isinstance(booking_start, str):
            booking_start = datetime.fromisoformat(booking_start.replace('Z', '+00:00'))
        
        # Mark the corresponding slot as booked
        time_str = booking_start.strftime("%H:%M")
        if time_str in all_slots:
            all_slots[time_str]["status"] = "booked"
    
    # Convert to Slot objects
    slots = []
    for time_str, slot_data in all_slots.items():
        start_iso = f"{day}T{time_str}:00"
        slots.append(Slot(
            start=start_iso,
            end=start_iso,
            is_free=(slot_data["status"] == "free"),
            mechanic_id=slot_data["mechanic_id"] if slot_data["status"] == "free" else None
        ))
    
    # Sort slots by time
    slots.sort(key=lambda s: s.start)
    return slots