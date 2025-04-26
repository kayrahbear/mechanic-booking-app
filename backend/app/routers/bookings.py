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
from pydantic import BaseModel

from ..models import BookingCreate, BookingOut, BookingStatus, SlotStatus, UserRole
from ..firestore import get_client
from ..auth import get_current_user, get_admin_user, get_mechanic_user
from ..notifications import send_booking_notification
from ..google_calendar import create_event, delete_event
from google.api_core.exceptions import GoogleAPIError

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

class BookingApproval(BaseModel):
    """Model for booking approval requests"""
    approved: bool
    notes: Optional[str] = None

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
    
    # Get the single mechanic from the mechanics collection
    mechanics_query = db.collection("mechanics").limit(1).stream()
    mechanic_ids = [doc.id for doc in mechanics_query]
    if not mechanic_ids:
        logger.warning("No mechanics found in the database")
    else:
        # Assign the first mechanic (should be the only one as per requirements)
        payload.mechanic_id = mechanic_ids[0]
        logger.info(f"Automatically assigned mechanic ID: {payload.mechanic_id}")
    
    # Calculate end time
    slot_end = payload.slot_start + timedelta(minutes=service_duration)
    
    # Create booking with additional fields
    booking_data = payload.model_dump()
    booking_data["slot_end"] = slot_end
    booking_data["status"] = BookingStatus.PENDING.value
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

    # Fetch the booking data
    booking_doc = db.collection("bookings").document(booking_id).get()
    if not booking_doc.exists:
        raise BookingError("Booking not found")
    
    booking_data = booking_doc.to_dict()
    
    # Create a response object without the SERVER_TIMESTAMP values
    response_data = booking_data.copy()
    # Replace sentinel values with actual datetime values for the response
    current_time = datetime.now()
    response_data["created_at"] = current_time
    response_data["updated_at"] = current_time
    
    # Construct the BookingOut model instance we will return
    booking_out = BookingOut(id=booking_id, **response_data)

    # Attempt to create a Google Calendar event for the booking
    try:
        calendar_event_id = create_event(booking_out)  # returns id string
        # Persist the event ID in Firestore (best-effort)
        db.collection("bookings").document(booking_id).update({
            "calendar_event_id": calendar_event_id
        })
        # Include it in the API response as well
        booking_out.calendar_event_id = calendar_event_id
    except GoogleAPIError as e:
        logger.error("Calendar sync failed for booking %s: %s", booking_id, e.message)

    return booking_out

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

@router.post("/{booking_id}/approval", response_model=BookingOut)
async def approve_or_deny_booking(
    booking_id: str,
    approval: BookingApproval,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_mechanic_user)
):
    """
    Approve or deny a booking. Only mechanics and admins can perform this action.
    If denied, the appointment will be removed from Google Calendar.
    """
    db = get_client()
    if not db:
        raise HTTPException(500, "DB unavailable")
    
    booking_ref = db.collection("bookings").document(booking_id)
    
    # Update the status using a transaction to ensure consistency
    @firestore.transactional
    def update_approval_txn(transaction: firestore.Transaction):
        # Read the booking document to verify it still exists
        doc = booking_ref.get(transaction=transaction)
        if not doc.exists:
            return None
        
        booking_data = doc.to_dict()
        
        # Set the new status based on approval decision
        new_status = BookingStatus.CONFIRMED.value if approval.approved else BookingStatus.DENIED.value
        
        # Update fields
        update_data = {
            "status": new_status,
            "approved_by": current_user.uid,
            "approval_timestamp": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP
        }
        
        # Add notes if provided
        if approval.notes:
            update_data["approval_notes"] = approval.notes
        
        transaction.update(booking_ref, update_data)
        
        # If we're denying the booking, we need to mark the slot as free again
        if not approval.approved:
            # Get the slot from availability
            slot_date = booking_data["slot_start"].date().isoformat()
            slot_time = booking_data["slot_start"].strftime("%H:%M")
            
            # Read the availability document
            avail_ref = db.collection("availability").document(slot_date)
            avail_doc = avail_ref.get(transaction=transaction)
            
            if avail_doc.exists:
                avail_data = avail_doc.to_dict()
                slots = avail_data.get("slots", {})
                
                # Only update if the slot is currently booked
                if slots.get(slot_time) == SlotStatus.BOOKED.value:
                    slots[slot_time] = SlotStatus.FREE.value
                    transaction.update(avail_ref, {
                        "slots": slots,
                        "updated_at": firestore.SERVER_TIMESTAMP
                    })
        
        # Return the booking data and approval status
        return {"booking_data": booking_data, "approved": approval.approved}
    
    # Execute the transaction
    result = update_approval_txn(db.transaction())
    
    if not result:
        raise HTTPException(404, "Booking not found")
    
    # Get the updated booking
    updated_booking = booking_ref.get().to_dict()
    booking_out = BookingOut(id=booking_id, **updated_booking)
    
    # If the booking was denied and has a calendar event, remove it
    if not result["approved"] and updated_booking.get("calendar_event_id"):
        try:
            # Delete the calendar event in the background
            background_tasks.add_task(
                delete_event, 
                updated_booking["calendar_event_id"]
            )
        except Exception as e:
            logger.error(f"Failed to delete calendar event: {str(e)}")
    
    # Send notification about approval/denial in the background
    background_tasks.add_task(
        send_booking_notification, 
        booking_out, 
        "approval" if result["approved"] else "denial"
    )
    
    return booking_out

@router.get("/mechanic/pending", response_model=List[BookingOut])
async def get_pending_bookings(
    current_user = Depends(get_mechanic_user)
):
    """Get all pending bookings that need mechanic approval"""
    db = get_client()
    if not db:
        raise HTTPException(500, "DB unavailable")
    
    # Get all pending bookings
    query = db.collection("bookings").where("status", "==", BookingStatus.PENDING.value)
    
    # If the user is a mechanic (not admin), might filter by assigned mechanic in the future
    
    # Order by date (most recent first)
    query = query.order_by("slot_start")
    
    # Execute query and format results
    bookings = []
    for doc in query.stream():
        booking_data = doc.to_dict()
        booking_data["id"] = doc.id
        bookings.append(BookingOut(**booking_data))
    
    return bookings
