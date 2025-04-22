from fastapi import APIRouter, HTTPException
from google.cloud import firestore
from ..models import BookingCreate, BookingOut
from ..firestore import get_client

router = APIRouter(prefix="/bookings", tags=["bookings"])

@router.post("", response_model=BookingOut, status_code=201)
async def create_booking(payload: BookingCreate):
    db = get_client()
    if not db:
        raise HTTPException(500, "DB unavailable")

    booking_ref = db.collection("bookings").document()
    slot_doc = db.collection("availability").document(payload.slot_start.date().isoformat())

    @firestore.transactional
    def txn(transaction: firestore.Transaction):
        slot_snapshot = slot_doc.get(transaction=transaction)
        if not slot_snapshot.exists:
            raise HTTPException(400, "Slot day not published")

        slots = slot_snapshot.to_dict()["slots"]
        if slots.get(payload.slot_start.strftime("%H:%M")) != "free":
            raise HTTPException(409, "Slot already booked")

        # 1) mark slot as booked
        slots[payload.slot_start.strftime("%H:%M")] = "booked"
        transaction.update(slot_doc, {"slots": slots})

        # 2) write booking record
        transaction.set(booking_ref, payload.model_dump())

    try:
        txn(db.transaction())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))

    return BookingOut(id=booking_ref.id, **payload.model_dump())
