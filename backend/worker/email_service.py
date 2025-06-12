"""
Email service using SMTP2GO for sending booking notifications.
"""
import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from jinja2 import Environment, FileSystemLoader
from urllib.parse import urlencode
from datetime import datetime
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# SMTP2GO Configuration
SMTP_SERVER = "mail.smtp2go.com"
SMTP_PORT = 587
SMTP_USERNAME = os.environ.get("SMTP2GO_USERNAME")
SMTP_PASSWORD = os.environ.get("SMTP2GO_PASSWORD")
FROM_EMAIL = os.environ.get("FROM_EMAIL", "noreply@yourmechanicservice.com")
BOOKING_URL = os.environ.get("BOOKING_URL", "https://yourdomain.com/book")

# Initialize Jinja2 environment
template_env = Environment(loader=FileSystemLoader('templates'))

class EmailServiceError(Exception):
    """Raised when email sending fails."""
    pass

def generate_calendar_link(booking_data: Dict[str, Any], mechanic_phone: str) -> str:
    """
    Generate a Google Calendar link for the appointment.
    
    Args:
        booking_data: Booking information
        mechanic_phone: Mechanic's phone number
        
    Returns:
        Google Calendar URL
    """
    try:
        # Parse appointment datetime
        appointment_datetime = datetime.fromisoformat(booking_data['appointment_date'] + 'T' + booking_data['appointment_time'])
        
        # Calculate end time (assume 1 hour if no duration specified)
        # In a real implementation, you'd get this from the service duration
        end_datetime = appointment_datetime.replace(hour=appointment_datetime.hour + 1)
        
        # Format for Google Calendar (YYYYMMDDTHHMMSSZ)
        start_time = appointment_datetime.strftime("%Y%m%dT%H%M%S")
        end_time = end_datetime.strftime("%Y%m%dT%H%M%S")
        
        # Build location string
        location = f"{booking_data['customer_address']}, {booking_data['customer_city']}, {booking_data['customer_state']} {booking_data['customer_zip']}"
        
        # Build event details
        details = f"Mobile Mechanic Service\\n\\nService: {booking_data['service_name']}\\nMechanic Phone: {mechanic_phone}\\nBooking ID: {booking_data['booking_id']}\\n\\nLocation: {location}"
        
        # Build calendar parameters
        params = {
            "action": "TEMPLATE",
            "text": f"Mobile Mechanic - {booking_data['service_name']}",
            "dates": f"{start_time}/{end_time}",
            "details": details,
            "location": location
        }
        
        base_url = "https://calendar.google.com/calendar/render"
        return f"{base_url}?{urlencode(params)}"
        
    except Exception as e:
        logger.error(f"Error generating calendar link: {str(e)}")
        return ""

def send_email(to_email: str, subject: str, html_content: str, text_content: Optional[str] = None) -> bool:
    """
    Send an email using SMTP2GO.
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        html_content: HTML email content
        text_content: Plain text email content (optional)
        
    Returns:
        True if email was sent successfully, False otherwise
        
    Raises:
        EmailServiceError: If email sending fails
    """
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        raise EmailServiceError("SMTP2GO credentials not configured")
    
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = FROM_EMAIL
        msg['To'] = to_email
        
        # Add text part if provided
        if text_content:
            text_part = MIMEText(text_content, 'plain')
            msg.attach(text_part)
        
        # Add HTML part
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        # Send email via SMTP2GO
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
        
        logger.info(f"Email sent successfully to {to_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        raise EmailServiceError(f"Email sending failed: {str(e)}")

def render_email_template(template_name: str, template_data: Dict[str, Any]) -> str:
    """
    Render an email template with the provided data.
    
    Args:
        template_name: Name of the template file (e.g., 'confirmation.html')
        template_data: Data to pass to the template
        
    Returns:
        Rendered HTML content
    """
    try:
        template = template_env.get_template(template_name)
        return template.render(**template_data)
    except Exception as e:
        logger.error(f"Failed to render template {template_name}: {str(e)}")
        raise EmailServiceError(f"Template rendering failed: {str(e)}")

def send_confirmation_email(booking_data: Dict[str, Any]) -> bool:
    """
    Send a booking confirmation email.
    
    Args:
        booking_data: Booking information
        
    Returns:
        True if email was sent successfully
    """
    try:
        subject = f"Booking Confirmation - {booking_data['service_name']}"
        html_content = render_email_template('confirmation.html', booking_data)
        
        return send_email(
            to_email=booking_data['customer_email'],
            subject=subject,
            html_content=html_content
        )
    except Exception as e:
        logger.error(f"Failed to send confirmation email: {str(e)}")
        return False

def send_approval_email(booking_data: Dict[str, Any], mechanic_phone: str) -> bool:
    """
    Send a booking approval email with calendar link.
    
    Args:
        booking_data: Booking information
        mechanic_phone: Mechanic's phone number
        
    Returns:
        True if email was sent successfully
    """
    try:
        # Add calendar link to template data
        template_data = booking_data.copy()
        template_data['mechanic_phone'] = mechanic_phone
        template_data['calendar_link'] = generate_calendar_link(booking_data, mechanic_phone)
        
        subject = f"Appointment Confirmed - {booking_data['service_name']} on {booking_data['appointment_date']}"
        html_content = render_email_template('approval.html', template_data)
        
        return send_email(
            to_email=booking_data['customer_email'],
            subject=subject,
            html_content=html_content
        )
    except Exception as e:
        logger.error(f"Failed to send approval email: {str(e)}")
        return False

def send_denial_email(booking_data: Dict[str, Any]) -> bool:
    """
    Send a booking denial email.
    
    Args:
        booking_data: Booking information
        
    Returns:
        True if email was sent successfully
    """
    try:
        # Add booking URL to template data
        template_data = booking_data.copy()
        template_data['booking_url'] = BOOKING_URL
        
        subject = f"Booking Update - {booking_data['service_name']}"
        html_content = render_email_template('denial.html', template_data)
        
        return send_email(
            to_email=booking_data['customer_email'],
            subject=subject,
            html_content=html_content
        )
    except Exception as e:
        logger.error(f"Failed to send denial email: {str(e)}")
        return False
