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
from secret_manager import get_secret_or_env

logger = logging.getLogger(__name__)

# SMTP2GO Configuration
SMTP_SERVER = "mail.smtp2go.com"
SMTP_PORT = 2525

def get_email_config():
    """Get email configuration from Secret Manager with fallback to environment variables."""
    # Get raw values
    username = get_secret_or_env("SMTP2GO_USERNAME", "SMTP2GO_USERNAME")
    password = get_secret_or_env("SMTP2GO_PASSWORD", "SMTP2GO_PASSWORD")
    
    # Strip whitespace and handle potential encoding issues
    if username:
        username = username.strip()
    if password:
        password = password.strip()
    
    return {
        'smtp_username': username,
        'smtp_password': password,
        'from_email': get_secret_or_env("FROM_EMAIL", "FROM_EMAIL", "noreply@yourmechanicservice.com"),
        'booking_url': get_secret_or_env("BOOKING_URL", "BOOKING_URL", "https://yourdomain.com/book")
    }

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
    config = get_email_config()
    
    # Debug logging for authentication (log username but not password)
    logger.info(f"SMTP Configuration - Username: {config['smtp_username'][:5]}...{config['smtp_username'][-3:] if len(config['smtp_username']) > 8 else '[MASKED]'}")
    logger.info(f"SMTP Configuration - Username length: {len(config['smtp_username'])}")
    logger.info(f"SMTP Configuration - Username repr: {repr(config['smtp_username'][:10])}")  # Show any hidden chars
    logger.info(f"SMTP Configuration - Password length: {len(config['smtp_password']) if config['smtp_password'] else 0}")
    logger.info(f"SMTP Configuration - Password repr: {repr(config['smtp_password'][:5]) if config['smtp_password'] else 'None'}")  # Show any hidden chars
    logger.info(f"SMTP Configuration - From email: {config['from_email']}")
    
    if not config['smtp_username'] or not config['smtp_password']:
        raise EmailServiceError("SMTP2GO credentials not configured")
    
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = config['from_email']
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
            logger.info(f"Connected to SMTP server {SMTP_SERVER}:{SMTP_PORT}")
            server.starttls()
            logger.info("STARTTLS completed successfully")
            
            # Log the login attempt (but not the actual credentials)
            logger.info(f"Attempting SMTP login with username: {config['smtp_username']}")
            server.login(config['smtp_username'], config['smtp_password'])
            logger.info("SMTP login successful")
            
            server.send_message(msg)
            logger.info("Email message sent successfully")
        
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
        config = get_email_config()
        
        # Add booking URL to template data
        template_data = booking_data.copy()
        template_data['booking_url'] = config['booking_url']
        
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

def send_cancellation_email(booking_data: Dict[str, Any]) -> bool:
    """
    Send a booking cancellation confirmation email.
    
    Args:
        booking_data: Booking information
        
    Returns:
        True if email was sent successfully
    """
    try:
        config = get_email_config()
        
        # Add booking URL to template data
        template_data = booking_data.copy()
        template_data['booking_url'] = config['booking_url']
        
        subject = f"Appointment Cancelled - {booking_data['service_name']}"
        html_content = render_email_template('cancellation.html', template_data)
        
        return send_email(
            to_email=booking_data['customer_email'],
            subject=subject,
            html_content=html_content
        )
    except Exception as e:
        logger.error(f"Failed to send cancellation email: {str(e)}")
        return False

def send_reschedule_request_email(booking_data: Dict[str, Any]) -> bool:
    """
    Send a reschedule request confirmation email to customer and notification to admin.
    
    Args:
        booking_data: Booking information
        
    Returns:
        True if email was sent successfully
    """
    try:
        # Send confirmation to customer
        subject = f"Reschedule Request Received - {booking_data['service_name']}"
        html_content = render_email_template('reschedule_request.html', booking_data)
        
        customer_success = send_email(
            to_email=booking_data['customer_email'],
            subject=subject,
            html_content=html_content
        )
        
        # Also send notification to admin/mechanic
        # For now, we'll use a simple approach - in production you might want a separate admin email template
        admin_subject = f"Reschedule Request - {booking_data['customer_name']} - {booking_data['service_name']}"
        admin_html_content = render_email_template('reschedule_admin_notification.html', booking_data)
        
        # Send to a configured admin email or mechanic email
        config = get_email_config()
        admin_email = config.get('admin_email', 'admin@monkeyboigarage.com')  # You can add this to secret manager
        
        admin_success = send_email(
            to_email=admin_email,
            subject=admin_subject,
            html_content=admin_html_content
        )
        
        return customer_success and admin_success
        
    except Exception as e:
        logger.error(f"Failed to send reschedule request email: {str(e)}")
        return False

def send_customer_invitation_email(invitation_data: Dict[str, Any]) -> bool:
    """
    Send a customer invitation email with account credentials.
    
    Args:
        invitation_data: Invitation information including customer_email, customer_name, temporary_password
        
    Returns:
        True if email was sent successfully
    """
    try:
        config = get_email_config()
        
        # Prepare template data
        template_data = {
            'customer_name': invitation_data['customer_name'],
            'customer_email': invitation_data['customer_email'],
            'temporary_password': invitation_data['temporary_password'],
            'login_url': config.get('login_url', 'https://yourdomain.com/login')
        }
        
        subject = "Welcome! Your account has been created"
        html_content = render_email_template('customer_invitation.html', template_data)
        
        return send_email(
            to_email=invitation_data['customer_email'],
            subject=subject,
            html_content=html_content
        )
        
    except Exception as e:
        logger.error(f"Failed to send customer invitation email: {str(e)}")
        return False
