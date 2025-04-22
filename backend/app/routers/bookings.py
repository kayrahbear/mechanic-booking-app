from fastapi import APIRouter, HTTPException, Depends, Query
from google.cloud import firestore
from firebase_admin import auth
from firebase_admin.auth import verify_id_token
from datetime import datetime, timedelta
from typing import List, Optional

from ..models import BookingCreate, BookingOut, BookingStatus
from ..firestore import get_client
from ..auth import get_current_user

router = APIRouter(prefix="/bookings", tags=["bookings"])

@router.post("", response_model=BookingOut, status_code=201)
async def create_booking(payload: BookingCreate, current_user = Depends(get_current_user)):
    db = get_client()
    if not db:
        raise HTTPException(500, "DB unavailable")

    # Ensure the user can only book with their own email
    if current_user and current_user.email != payload.customer_email:
        raise HTTPException(403, "You can only create bookings with your own email")
    
    # Get service to calculate end time
    service_ref = db.collection("services").document(payload.service_id)
    service_doc = service_ref.get()
    if not service_doc.exists:
        raise HTTPException(404, "Service not found")
    
    service_data = service_doc.to_dict()
    service_duration = service_data.get("minutes", 30)
    
    # Calculate end time
    slot_end = payload.slot_start + timedelta(minutes=service_duration)
    
    # Create booking with additional fields
    booking_data = payload.model_dump()
    booking_data["slot_end"] = slot_end
    booking_data["status"] = "confirmed"
    booking_data["created_at"] = firestore.SERVER_TIMESTAMP
    booking_data["updated_at"] = firestore.SERVER_TIMESTAMP
    
    booking_ref = db.collection("bookings").document()
    slot_doc = db.collection("availability").document(payload.slot_start.date().isoformat())

    @firestore.transactional
    def txn(transaction: firestore.Transaction):
        slot_snapshot = slot_doc.get(transaction=transaction)
        if not slot_snapshot.exists:
            raise HTTPException(400, "Slot day not published")

        slots = slot_snapshot.to_dict().get("slots", {})
        time_key = payload.slot_start.strftime("%H:%M")
        
        if slots.get(time_key) != "free":
            raise HTTPException(409, "Slot already booked")

        # Mark slot as booked
        slots[time_key] = "booked"
        transaction.update(slot_doc, {"slots": slots, "updated_at": firestore.SERVER_TIMESTAMP})

        # Write booking record
        transaction.set(booking_ref, booking_data)

    try:
        txn(db.transaction())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))

    # Return the fully-populated booking
    return BookingOut(id=booking_ref.id, **booking_data)

@router.get("", response_model=List[BookingOut])
async def get_bookings(
    current_user = Depends(get_current_user),
    from_date: Optional[datetime] = Query(None, description="Filter bookings from this date"),
    to_date: Optional[datetime] = Query(None, description="Filter bookings until this date"),
    status: Optional[BookingStatus] = Query(None, description="Filter by booking status")
):
    db = get_client()
    if not db:
        raise HTTPException(500, "DB unavailable")
    
    # Start with base query
    query = db.collection("bookings")
    
    # Add filters
    if current_user.role != "admin":
        # Regular users can only see their own bookings
        query = query.where("customer_email", "==", current_user.email)
    
    if from_date:
        query = query.where("slot_start", ">=", from_date)
    
    if to_date:
        query = query.where("slot_start", "<=", to_date)
    
    if status:
        query = query.where("status", "==", status)
    
    # Order by date (most recent first)
    query = query.order_by("slot_start", direction=firestore.Query.DESCENDING)
    
    # Execute query and format results
    bookings = []
    for doc in query.stream():
        booking_data = doc.to_dict()
        booking_data["id"] = doc.id
        bookings.append(BookingOut(**booking_data))
    
    return bookings

@router.get("/{booking_id}", response_model=BookingOut)
async def get_booking(booking_id: str, current_user = Depends(get_current_user)):
    db = get_client()
    if not db:
        raise HTTPException(500, "DB unavailable")
    
    booking_ref = db.collection("bookings").document(booking_id)
    booking_doc = booking_ref.get()
    
    if not booking_doc.exists:
        raise HTTPException(404, "Booking not found")
    
    booking_data = booking_doc.to_dict()
    
    # Check permissions - only admins or the booking owner can see it
    if current_user.role != "admin" and booking_data.get("customer_email") != current_user.email:
        raise HTTPException(403, "Not authorized to view this booking")
    
    return BookingOut(id=booking_id, **booking_data)

@router.patch("/{booking_id}/status", response_model=BookingOut)
async def update_booking_status(
    booking_id: str, 
    status: BookingStatus,
    current_user = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(403, "Only admins can update booking status")
    
    db = get_client()
    if not db:
        raise HTTPException(500, "DB unavailable")
    
    booking_ref = db.collection("bookings").document(booking_id)
    booking_doc = booking_ref.get()
    
    if not booking_doc.exists:
        raise HTTPException(404, "Booking not found")
    
    # Update the status
    booking_ref.update({
        "status": status,
        "updated_at": firestore.SERVER_TIMESTAMP
    })
    
    # Get the updated booking
    updated_doc = booking_ref.get()
    booking_data = updated_doc.to_dict()
    
    return BookingOut(id=booking_id, **booking_data)
