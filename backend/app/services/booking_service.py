"""
Simplified booking service with cleaner separation of concerns
"""
from datetime import datetime, timedelta
from typing import Optional
from google.cloud import firestore
from google.api_core import exceptions as google_exceptions
import logging
import tenacity
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from ..models import BookingCreate, BookingOut, BookingStatus, SlotStatus
from ..firestore import get_client
from ..notifications import send_booking_notification
from ..google_calendar import create_event
from google.api_core.exceptions import GoogleAPIError

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

class BookingService:
    """Simplified booking service with clean methods"""
    
    def __init__(self):
        self.db = get_client()
        if not self.db:
            raise RuntimeError("Database client unavailable")
    
    def get_service(self, service_id: str) -> dict:
        """Get service details by ID"""
        service_ref = self.db.collection("services").document(service_id)
        service_doc = service_ref.get()
        if not service_doc.exists:
            raise ServiceNotFoundError(f"Service {service_id} not found")
        return service_doc.to_dict()
    
    async def validate_availability(self, payload: BookingCreate, service_duration: int) -> Optional[str]:
        """Validate slot availability and return mechanic_id if available"""
        booking_date = payload.slot_start.date()
        booking_time = payload.slot_start.strftime("%H:%M")
        
        # Import availability function
        from ..routers.availability import _generate_availability_for_day
        
        # Check if slot is available
        available_slots = await _generate_availability_for_day(self.db, booking_date, payload.service_id)
        
        for slot in available_slots:
            slot_time = datetime.fromisoformat(slot.start.replace('Z', '')).strftime("%H:%M")
            if slot_time == booking_time and slot.is_free:
                return slot.mechanic_id
        
        raise SlotUnavailableError(f"Time slot {booking_time} is not available")
    
    def check_conflicts(self, payload: BookingCreate, mechanic_id: str):
        """Check for booking conflicts at the same time"""
        existing_bookings = self.db.collection("bookings").where(
            "slot_start", "==", payload.slot_start
        ).where(
            "status", "in", ["pending", "confirmed"]
        ).stream()
        
        for existing_booking in existing_bookings:
            existing_data = existing_booking.to_dict()
            if existing_data.get("mechanic_id") == mechanic_id:
                raise SlotUnavailableError("Time slot is already booked")
    
    def create_booking_data(self, payload: BookingCreate, service: dict) -> dict:
        """Create the booking data dictionary"""
        service_duration = service.get("minutes", 30)
        slot_end = payload.slot_start + timedelta(minutes=service_duration)
        
        booking_data = payload.model_dump()
        booking_data.update({
            "slot_end": slot_end,
            "status": BookingStatus.PENDING.value,
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP,
            "service_name": service.get("name", ""),
            "service_price": service.get("price", 0),
        })
        
        return booking_data
    
    def update_availability_cache(self, transaction: firestore.Transaction, booking_data: dict):
        """Update the availability cache document"""
        booking_date = booking_data["slot_start"].date().isoformat()
        booking_time = booking_data["slot_start"].strftime("%H:%M")
        
        slot_doc = self.db.collection("availability").document(booking_date)
        slot_snapshot = slot_doc.get(transaction=transaction)
        
        if slot_snapshot.exists:
            # Update existing availability cache
            availability_data = slot_snapshot.to_dict()
            slots = availability_data.get("slots", {})
            slots[booking_time] = SlotStatus.BOOKED.value
            transaction.update(slot_doc, {
                "slots": slots,
                "updated_at": firestore.SERVER_TIMESTAMP
            })
        else:
            # Create minimal availability document
            transaction.set(slot_doc, {
                "day": booking_date,
                "slots": {booking_time: SlotStatus.BOOKED.value},
                "mechanics": {booking_data["mechanic_id"]: True} if booking_data.get("mechanic_id") else {},
                "generated_dynamically": True,
                "created_at": firestore.SERVER_TIMESTAMP,
                "updated_at": firestore.SERVER_TIMESTAMP,
            })
    
    @tenacity.retry(**retry_config)
    async def create_booking(self, payload: BookingCreate) -> BookingOut:
        """Create a new booking with transactional integrity"""
        # 1. Get service details
        service = self.get_service(payload.service_id)
        
        # 2. Validate availability and get mechanic
        mechanic_id = await self.validate_availability(payload, service.get("minutes", 30))
        if mechanic_id:
            payload.mechanic_id = mechanic_id
        
        # 3. Create booking data
        booking_data = self.create_booking_data(payload, service)
        booking_ref = self.db.collection("bookings").document()
        
        # 4. Execute transaction
        @firestore.transactional
        def txn(transaction: firestore.Transaction):
            # Check for conflicts within transaction
            self.check_conflicts(payload, mechanic_id)
            
            # Create booking
            transaction.set(booking_ref, booking_data)
            
            # Update availability cache
            self.update_availability_cache(transaction, booking_data)
            
            return True
        
        # Execute transaction
        txn(self.db.transaction())
        
        # 5. Create response object
        booking_id = booking_ref.id
        booking_doc = self.db.collection("bookings").document(booking_id).get()
        
        if not booking_doc.exists:
            raise BookingError("Booking creation failed")
        
        response_data = booking_doc.to_dict()
        current_time = datetime.now()
        response_data["created_at"] = current_time
        response_data["updated_at"] = current_time
        
        booking_out = BookingOut(id=booking_id, **response_data)
        
        # 6. Add calendar event (best effort)
        try:
            calendar_event_id = create_event(booking_out)
            self.db.collection("bookings").document(booking_id).update({
                "calendar_event_id": calendar_event_id
            })
            booking_out.calendar_event_id = calendar_event_id
        except GoogleAPIError as e:
            logger.error("Calendar sync failed for booking %s: %s", booking_id, e.message)
        
        return booking_out