import logging
from typing import Dict, Any
from .tasks import enqueue_notification_task
from .models import BookingOut

logger = logging.getLogger(__name__)

def prepare_email_notification_payload(booking: BookingOut) -> Dict[str, Any]:
    """
    Prepare an email notification payload for a booking.
    
    Args:
        booking: The booking details
        
    Returns:
        Dictionary with email notification data
    """
    # This is a stub that will be expanded in task 14
    return {
        "to_email": booking.customer_email,
        "subject": f"Booking Confirmation: {booking.service_name}",
        "template_id": "booking_confirmation",
        "template_data": {
            "customer_name": booking.customer_name,
            "service_name": booking.service_name,
            "appointment_date": booking.slot_start.strftime("%Y-%m-%d"),
            "appointment_time": booking.slot_start.strftime("%H:%M"),
            "booking_id": booking.id
        }
    }

def prepare_sms_notification_payload(booking: BookingOut) -> Dict[str, Any]:
    """
    Prepare an SMS notification payload for a booking.
    
    Args:
        booking: The booking details
        
    Returns:
        Dictionary with SMS notification data
    """
    # This is a stub that will be expanded in task 14
    appointment_time = booking.slot_start.strftime("%Y-%m-%d %H:%M")
    return {
        "to_phone": booking.customer_phone,
        "message": f"Your appointment for {booking.service_name} is confirmed for {appointment_time}. Booking ID: {booking.id}"
    }

async def send_booking_notification(booking: BookingOut) -> None:
    """
    Send booking notifications by enqueuing tasks.
    
    Args:
        booking: The booking that was created
    """
    if not booking or not booking.id:
        logger.error("Invalid booking provided to send_booking_notification")
        return
    
    # Prepare the notification payload
    payload = {
        "booking_id": booking.id,
        "email": prepare_email_notification_payload(booking),
        "sms": prepare_sms_notification_payload(booking) if booking.customer_phone else None
    }
    
    # Enqueue the task
    task_name = enqueue_notification_task(
        booking_id=booking.id,
        payload=payload
    )
    
    if task_name:
        logger.info(f"Notification task enqueued for booking {booking.id}: {task_name}")
    else:
        logger.error(f"Failed to enqueue notification for booking {booking.id}") 