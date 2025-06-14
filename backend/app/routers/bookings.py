from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from google.cloud import firestore
from datetime import datetime
from typing import List, Optional
import logging
from pydantic import BaseModel

from ..models import BookingCreate, BookingOut, BookingStatus, SlotStatus, UserRole, BookingCancellationRequest, BookingRescheduleRequest
from ..firestore import get_client
from ..auth import get_current_user, get_admin_user, get_mechanic_user
from ..notifications import send_booking_notification
from ..google_calendar import delete_event
from ..services.booking_service import BookingError, SlotUnavailableError, ServiceNotFoundError

router = APIRouter(prefix="/bookings", tags=["bookings"])

# Setup logging
logger = logging.getLogger(__name__)

class BookingApproval(BaseModel):
    """Model for booking approval requests"""
    approved: bool
    notes: Optional[str] = None

# Mechanic-specific endpoints - MOVED TO TOP OF FILE
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

@router.get("/mechanic/upcoming", response_model=List[BookingOut])
async def get_upcoming_bookings(
    current_user = Depends(get_mechanic_user)
):
    """Get all confirmed upcoming bookings for the mechanic"""
    db = get_client()
    if not db:
        raise HTTPException(500, "DB unavailable")
    
    # Get all confirmed bookings
    query = db.collection("bookings").where("status", "==", BookingStatus.CONFIRMED.value)
    
    # Add filter for future bookings (today and later)
    now = datetime.now()
    today_start = datetime(now.year, now.month, now.day)
    query = query.where("slot_start", ">=", today_start)
    
    # Order by date
    query = query.order_by("slot_start")
    
    # Execute query and format results
    bookings = []
    for doc in query.stream():
        booking_data = doc.to_dict()
        booking_data["id"] = doc.id
        bookings.append(BookingOut(**booking_data))
    
    return bookings

@router.get("/mechanic/reschedule-requests", response_model=List[BookingOut])
async def get_reschedule_requests(
    current_user = Depends(get_mechanic_user)
):
    """Get all bookings with reschedule requests that need admin action"""
    db = get_client()
    if not db:
        raise HTTPException(500, "DB unavailable")
    
    # Get all reschedule request bookings
    query = db.collection("bookings").where("status", "==", BookingStatus.RESCHEDULE_REQUESTED.value)
    
    # Order by reschedule request date (most recent first)
    query = query.order_by("reschedule_requested_at", direction=firestore.Query.DESCENDING)
    
    # Execute query and format results
    bookings = []
    for doc in query.stream():
        booking_data = doc.to_dict()
        booking_data["id"] = doc.id
        bookings.append(BookingOut(**booking_data))
    
    return bookings

@router.post("", response_model=BookingOut, status_code=201)
async def create_booking(
    payload: BookingCreate, 
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user)
):
    """Create a new booking with transactional integrity."""
    # Ensure the user can only book with their own email
    if current_user and current_user.email != payload.customer_email:
        raise HTTPException(403, "You can only create bookings with your own email")
    
    try:
        from ..services import BookingService
        booking_service = BookingService()
        booking = await booking_service.create_booking(payload)
        
        # Add background task for notifications
        background_tasks.add_task(send_booking_notification, booking)
        
        return booking
        
    except ServiceNotFoundError:
        raise HTTPException(404, "Service not found")
    except SlotUnavailableError:
        raise HTTPException(409, "The requested time slot is no longer available")
    except BookingError as e:
        logger.error(f"Booking error: {str(e)}")
        raise HTTPException(400, str(e))
    except Exception as e:
        logger.exception(f"Unexpected error during booking creation: {str(e)}")
        raise HTTPException(500, "An unexpected error occurred")

# Removed the old complex booking function - now using BookingService

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
    # For approval emails, we need to get the mechanic's phone number
    if result["approved"]:
        # Get mechanic phone number from the database
        try:
            # Get the mechanic assigned to this booking
            mechanic_id = updated_booking.get("mechanic_id")
            if mechanic_id:
                mechanic_ref = db.collection("mechanics").document(mechanic_id)
                mechanic_doc = mechanic_ref.get()
                if mechanic_doc.exists:
                    mechanic_data = mechanic_doc.to_dict()
                    mechanic_phone = mechanic_data.get("phone", "Contact main office")
                else:
                    mechanic_phone = "Contact main office"
            else:
                mechanic_phone = "Contact main office"
            
            # Send approval notification with mechanic phone
            from ..notifications import prepare_email_notification_payload
            
            # Create custom notification payload with mechanic phone
            email_payload = prepare_email_notification_payload(
                booking_out, 
                "approval", 
                mechanic_phone
            )
            
            # Create the full notification payload
            notification_payload = {
                "booking_id": booking_out.id,
                "notification_type": "approval",
                "email": email_payload,
                "sms": None  # SMS not implemented yet
            }
            
            # Enqueue the notification task
            from ..tasks import enqueue_notification_task
            background_tasks.add_task(
                enqueue_notification_task,
                booking_id=booking_out.id,
                payload=notification_payload
            )
            
        except Exception as e:
            logger.error(f"Failed to send approval notification: {str(e)}")
            # Fallback to regular notification without mechanic phone
            background_tasks.add_task(
                send_booking_notification, 
                booking_out, 
                "approval"
            )
    else:
        # Send denial notification
        background_tasks.add_task(
            send_booking_notification, 
            booking_out, 
            "denial"
        )
    
    return booking_out

@router.post("/{booking_id}/cancel", response_model=BookingOut)
async def cancel_booking(
    booking_id: str,
    cancellation: BookingCancellationRequest,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user)
):
    """Cancel a booking. Only the booking owner or admin can cancel a booking."""
    db = get_client()
    if not db:
        raise HTTPException(500, "DB unavailable")
    
    booking_ref = db.collection("bookings").document(booking_id)
    
    # Update the booking using a transaction
    @firestore.transactional
    def cancel_booking_txn(transaction: firestore.Transaction):
        # Read the booking document first
        doc = booking_ref.get(transaction=transaction)
        if not doc.exists:
            return None
        
        booking_data = doc.to_dict()
        
        # Check permissions - only booking owner or admin can cancel
        if current_user.role != UserRole.ADMIN.value and booking_data.get("customer_email") != current_user.email:
            raise HTTPException(403, "Not authorized to cancel this booking")
        
        # Check if booking can be cancelled
        current_status = booking_data.get("status")
        if current_status not in [BookingStatus.PENDING.value, BookingStatus.CONFIRMED.value]:
            raise HTTPException(400, f"Cannot cancel booking with status: {current_status}")
        
        # Read the availability document before any writes
        slot_date = booking_data["slot_start"].date().isoformat()
        slot_time = booking_data["slot_start"].strftime("%H:%M")
        
        avail_ref = db.collection("availability").document(slot_date)
        avail_doc = avail_ref.get(transaction=transaction)
        
        # Now perform all writes
        # Update the booking
        update_data = {
            "status": BookingStatus.CANCELLED.value,
            "cancellation_reason": cancellation.reason,
            "cancelled_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP
        }
        
        transaction.update(booking_ref, update_data)
        
        # Mark the slot as available again
        if avail_doc.exists:
            avail_data = avail_doc.to_dict()
            slots = avail_data.get("slots", {})
            
            # Update slot to free if it was booked
            if slots.get(slot_time) == SlotStatus.BOOKED.value:
                slots[slot_time] = SlotStatus.FREE.value
                transaction.update(avail_ref, {
                    "slots": slots,
                    "updated_at": firestore.SERVER_TIMESTAMP
                })
        
        return booking_data
    
    # Execute the transaction
    result = cancel_booking_txn(db.transaction())
    
    if not result:
        raise HTTPException(404, "Booking not found")
    
    # Get the updated booking
    updated_booking = booking_ref.get().to_dict()
    booking_out = BookingOut(id=booking_id, **updated_booking)
    
    # Delete calendar event if it exists
    if updated_booking.get("calendar_event_id"):
        try:
            background_tasks.add_task(
                delete_event, 
                updated_booking["calendar_event_id"]
            )
        except Exception as e:
            logger.error(f"Failed to delete calendar event: {str(e)}")
    
    # Send cancellation notification
    background_tasks.add_task(
        send_booking_notification, 
        booking_out, 
        "cancellation"
    )
    
    return booking_out

@router.post("/{booking_id}/reschedule", response_model=BookingOut)
async def request_reschedule(
    booking_id: str,
    reschedule_request: BookingRescheduleRequest,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user)
):
    """Request a reschedule for a booking. Only the booking owner can request a reschedule."""
    db = get_client()
    if not db:
        raise HTTPException(500, "DB unavailable")
    
    booking_ref = db.collection("bookings").document(booking_id)
    
    # Update the booking using a transaction
    @firestore.transactional
    def request_reschedule_txn(transaction: firestore.Transaction):
        # Read the booking document
        doc = booking_ref.get(transaction=transaction)
        if not doc.exists:
            return None
        
        booking_data = doc.to_dict()
        
        # Check permissions - only booking owner can request reschedule
        if booking_data.get("customer_email") != current_user.email:
            raise HTTPException(403, "Not authorized to reschedule this booking")
        
        # Check if booking can be rescheduled
        current_status = booking_data.get("status")
        if current_status not in [BookingStatus.PENDING.value, BookingStatus.CONFIRMED.value]:
            raise HTTPException(400, f"Cannot reschedule booking with status: {current_status}")
        
        # Convert preferred slots to dict format for Firestore
        preferred_slots_data = []
        for slot in reschedule_request.preferred_slots:
            preferred_slots_data.append({
                "start": slot.start,
                "end": slot.end,
                "priority": slot.priority
            })
        
        # Update the booking
        update_data = {
            "status": BookingStatus.RESCHEDULE_REQUESTED.value,
            "reschedule_reason": reschedule_request.reason,
            "reschedule_requested_slots": preferred_slots_data,
            "reschedule_requested_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP
        }
        
        transaction.update(booking_ref, update_data)
        
        return booking_data
    
    # Execute the transaction
    result = request_reschedule_txn(db.transaction())
    
    if not result:
        raise HTTPException(404, "Booking not found")
    
    # Get the updated booking
    updated_booking = booking_ref.get().to_dict()
    booking_out = BookingOut(id=booking_id, **updated_booking)
    
    # Send reschedule request notification to admin/mechanic
    background_tasks.add_task(
        send_booking_notification, 
        booking_out, 
        "reschedule_request"
    )
    
    return booking_out
