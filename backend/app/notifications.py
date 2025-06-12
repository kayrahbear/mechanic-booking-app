import logging
from typing import Dict, Any, Literal, Optional
from .tasks import enqueue_notification_task
from .models import BookingOut, BookingStatus

logger = logging.getLogger(__name__)

NotificationType = Literal["confirmation", "approval", "denial", "reminder"]

def prepare_email_notification_payload(
    booking: BookingOut, 
    notification_type: NotificationType = "confirmation",
    mechanic_phone: Optional[str] = None
) -> Dict[str, Any]:
    """
    Prepare an email notification payload for a booking.
    
    Args:
        booking: The booking details
        notification_type: Type of notification to send
        mechanic_phone: Mechanic's phone number (for approval emails)
        
    Returns:
        Dictionary with email notification data
    """
    template_id = "booking_confirmation"
    subject = f"Booking Confirmation: {booking.service_name}"
    
    if notification_type == "approval":
        template_id = "booking_approved"
        subject = f"Booking Approved: {booking.service_name}"
    elif notification_type == "denial":
        template_id = "booking_denied"
        subject = f"Booking Update: {booking.service_name}"
    elif notification_type == "reminder":
        template_id = "booking_reminder"
        subject = f"Appointment Reminder: {booking.service_name}"
    
    # Base template data
    template_data = {
        "customer_name": booking.customer_name,
        "customer_email": booking.customer_email,
        "service_name": booking.service_name,
        "appointment_date": booking.slot_start.strftime("%Y-%m-%d"),
        "appointment_time": booking.slot_start.strftime("%H:%M"),
        "customer_address": booking.customer_address,
        "customer_city": booking.customer_city,
        "customer_state": booking.customer_state,
        "customer_zip": booking.customer_zip,
        "booking_id": booking.id,
        "booking_status": booking.status,
        "notes": getattr(booking, "approval_notes", "") or booking.notes or ""
    }
    
    # Add mechanic phone for approval emails
    if notification_type == "approval" and mechanic_phone:
        template_data["mechanic_phone"] = mechanic_phone
    
    return {
        "to_email": booking.customer_email,
        "subject": subject,
        "template_id": template_id,
        "template_data": template_data
    }

def prepare_sms_notification_payload(
    booking: BookingOut,
    notification_type: NotificationType = "confirmation"
) -> Dict[str, Any]:
    """
    Prepare an SMS notification payload for a booking.
    
    Args:
        booking: The booking details
        notification_type: Type of notification to send
        
    Returns:
        Dictionary with SMS notification data
    """
    appointment_time = booking.slot_start.strftime("%Y-%m-%d %H:%M")
    message = f"Your appointment for {booking.service_name} is confirmed for {appointment_time}. Booking ID: {booking.id}"
    
    if notification_type == "approval":
        message = f"Your appointment for {booking.service_name} on {appointment_time} has been approved. Booking ID: {booking.id}"
    elif notification_type == "denial":
        message = f"Your appointment request for {booking.service_name} on {appointment_time} could not be accommodated. Please book another time. Booking ID: {booking.id}"
    elif notification_type == "reminder":
        message = f"Reminder: Your appointment for {booking.service_name} is tomorrow at {booking.slot_start.strftime('%H:%M')}. Booking ID: {booking.id}"
    
    return {
        "to_phone": booking.customer_phone,
        "message": message
    }

async def send_booking_notification(
    booking: BookingOut,
    notification_type: NotificationType = "confirmation"
) -> None:
    """
    Send booking notifications by enqueuing tasks.
    
    Args:
        booking: The booking that was created or updated
        notification_type: Type of notification to send
    """
    if not booking or not booking.id:
        logger.error("Invalid booking provided to send_booking_notification")
        return
    
    # Prepare the notification payload
    payload = {
        "booking_id": booking.id,
        "notification_type": notification_type,
        "email": prepare_email_notification_payload(booking, notification_type),
        "sms": prepare_sms_notification_payload(booking, notification_type) if booking.customer_phone else None
    }
    
    # Enqueue the task
    task_name = enqueue_notification_task(
        booking_id=booking.id,
        payload=payload
    )
    
    if task_name:
        logger.info(f"{notification_type.capitalize()} notification task enqueued for booking {booking.id}: {task_name}")
    else:
        logger.error(f"Failed to enqueue {notification_type} notification for booking {booking.id}")
