from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from google.cloud import firestore
from google.api_core import exceptions as google_exceptions
from firebase_admin import auth
from firebase_admin.auth import verify_id_token
from datetime import datetime, timedelta
from typing import List, Optional
import logging
import tenacity
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from ..models import BookingCreate, BookingOut, BookingStatus, SlotStatus, UserRole
from ..firestore import get_client
from ..auth import get_current_user
from ..notifications import send_booking_notification

router = APIRouter(prefix="/bookings", tags=["bookings"])

# Setup logging
logger = logging.getLogger(__name__)

# Retry configuration for transient Firestore errors
retry_config = {
    'stop': stop_after_attempt(3),
    'wait': wait_exponential(multiplier=1, min=1, max=10),
    'retry': retry_if_exception_type((google_exceptions.ServiceUnavailable, 
                                      google_exceptions.DeadlineExceeded)),
    'reraise': True,
}

class BookingError(Exception):
    """Base exception for booking errors."""
    pass

class SlotUnavailableError(BookingError):
    """Raised when a slot is not available for booking."""
    pass

class ServiceNotFoundError(BookingError):
    """Raised when a service is not found."""
    pass

class DayNotPublishedError(BookingError):
    """Raised when availability for a day has not been published."""
    pass

@router.post("", response_model=BookingOut, status_code=201)
async def create_booking(
    payload: BookingCreate, 
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user)
):
    """
    Create a new booking with transactional integrity.
    
    This endpoint:
    1. Validates that the service exists
    2. Validates that the requested time slot is available
    3. Uses a Firestore transaction to atomically:
       - Mark the slot as booked
       - Create the booking record
    
    Returns the created booking with all fields populated.
    """
    db = get_client()
    if not db:
        raise HTTPException(500, "DB unavailable")

    # Ensure the user can only book with their own email
    if current_user and current_user.email != payload.customer_email:
        raise HTTPException(403, "You can only create bookings with your own email")
    
    try:
        # Execute booking process with retries for transient errors
        booking = await create_booking_with_transaction(db, payload)
        
        # Add background task for notifications
        background_tasks.add_task(send_booking_notification, booking)
        
        return booking
        
    except ServiceNotFoundError:
        raise HTTPException(404, "Service not found")
    except DayNotPublishedError:
        raise HTTPException(400, "No availability published for the requested day")
    except SlotUnavailableError:
        raise HTTPException(409, "The requested time slot is no longer available")
    except BookingError as e:
        logger.error(f"Booking error: {str(e)}")
        raise HTTPException(400, str(e))
    except Exception as e:
        logger.exception(f"Unexpected error during booking creation: {str(e)}")
        raise HTTPException(500, "An unexpected error occurred")

@tenacity.retry(**retry_config)
async def create_booking_with_transaction(db, payload: BookingCreate) -> BookingOut:
    """
    Execute the booking creation process within a transaction.
    
    Retries on transient Firestore errors using exponential backoff.
    """
    # Get service to calculate end time
    service_ref = db.collection("services").document(payload.service_id)
    service_doc = service_ref.get()
    if not service_doc.exists:
        raise ServiceNotFoundError(f"Service {payload.service_id} not found")
    
    service_data = service_doc.to_dict()
    service_duration = service_data.get("minutes", 30)
    
    # Calculate end time
    slot_end = payload.slot_start + timedelta(minutes=service_duration)
    
    # Create booking with additional fields
    booking_data = payload.model_dump()
    booking_data["slot_end"] = slot_end
    booking_data["status"] = BookingStatus.CONFIRMED.value
    booking_data["created_at"] = firestore.SERVER_TIMESTAMP
    booking_data["updated_at"] = firestore.SERVER_TIMESTAMP
    
    # Store service details for historical record
    booking_data["service_name"] = service_data.get("name", "")
    booking_data["service_price"] = service_data.get("price", 0)
    
    booking_ref = db.collection("bookings").document()
    slot_doc = db.collection("availability").document(payload.slot_start.date().isoformat())

    # The transaction function that will be executed atomically
    @firestore.transactional
    def txn(transaction: firestore.Transaction):
        # Read the availability document
        slot_snapshot = slot_doc.get(transaction=transaction)
        if not slot_snapshot.exists:
            raise DayNotPublishedError("Availability not published for the requested day")

        # Get the slots map from the availability document
        availability_data = slot_snapshot.to_dict()
        slots = availability_data.get("slots", {})
        time_key = payload.slot_start.strftime("%H:%M")
        
        # Check if the slot is free
        if slots.get(time_key) != SlotStatus.FREE.value:
            raise SlotUnavailableError(f"Time slot {time_key} is not available")

        # Mark slot as booked
        slots[time_key] = SlotStatus.BOOKED.value
        transaction.update(slot_doc, {
            "slots": slots,
            "updated_at": firestore.SERVER_TIMESTAMP
        })

        # Write booking record
        transaction.set(booking_ref, booking_data)
        
        # Return success indicator
        return True

    # Execute the transaction
    transaction_success = txn(db.transaction())
    
    if not transaction_success:
        raise BookingError("Transaction failed")
    
    # Return the fully-populated booking
    booking_id = booking_ref.id
    
    # Create a response object without the SERVER_TIMESTAMP values
    response_data = booking_data.copy()
    # Replace sentinel values with actual datetime values for the response
    current_time = datetime.now()
    response_data["created_at"] = current_time
    response_data["updated_at"] = current_time
    
    return BookingOut(id=booking_id, **response_data)

@router.get("", response_model=List[BookingOut])
async def get_bookings(
    current_user = Depends(get_current_user),
    from_date: Optional[datetime] = Query(None, description="Filter bookings from this date"),
    to_date: Optional[datetime] = Query(None, description="Filter bookings until this date"),
    status: Optional[str] = Query(None, description="Filter by booking status")
):
    db = get_client()
    if not db:
        raise HTTPException(500, "DB unavailable")
    
    # Start with base query
    query = db.collection("bookings")
    
    # Add filters
    if current_user.role != UserRole.ADMIN.value:
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
    if current_user.role != UserRole.ADMIN.value and booking_data.get("customer_email") != current_user.email:
        raise HTTPException(403, "Not authorized to view this booking")
    
    return BookingOut(id=booking_id, **booking_data)

@router.patch("/{booking_id}/status", response_model=BookingOut)
async def update_booking_status(
    booking_id: str, 
    status: str,
    current_user = Depends(get_current_user)
):
    if current_user.role != UserRole.ADMIN.value:
        raise HTTPException(403, "Only admins can update booking status")
    
    db = get_client()
    if not db:
        raise HTTPException(500, "DB unavailable")
    
    booking_ref = db.collection("bookings").document(booking_id)
    booking_doc = booking_ref.get()
    
    if not booking_doc.exists:
        raise HTTPException(404, "Booking not found")
    
    # Update the status using a transaction to ensure consistency
    @firestore.transactional
    def update_status_txn(transaction: firestore.Transaction):
        # Read the booking document to verify it still exists
        doc = booking_ref.get(transaction=transaction)
        if not doc.exists:
            return None
            
        # Update the status
        transaction.update(booking_ref, {
            "status": status,
            "updated_at": firestore.SERVER_TIMESTAMP
        })
        
        # Return success
        return True
    
    # Execute the transaction
    success = update_status_txn(db.transaction())
    
    if not success:
        raise HTTPException(404, "Booking not found")
    
    # Fetch and return the updated booking
    updated_booking = booking_ref.get().to_dict()
    return BookingOut(id=booking_id, **updated_booking)
