from fastapi import FastAPI, Request, Response, HTTPException
import logging
import json
import os
from pydantic import BaseModel
from typing import Dict, Any, Optional
import uvicorn
from email_service import (
    send_confirmation_email, 
    send_approval_email, 
    send_denial_email,
    send_cancellation_email,
    send_reschedule_request_email,
    EmailServiceError
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(title="Notification Worker")

class NotificationRequest(BaseModel):
    booking_id: str
    notification_type: str
    data: Dict[str, Any]

@app.get("/healthz")
async def health_check():
    """Health check endpoint for the worker service."""
    return {"status": "ok"}

@app.get("/version")
async def version():
    """Version endpoint for the worker service."""
    return {"version": os.environ.get("VERSION", "dev")}

@app.post("/process-notification")
async def process_notification(request: Request):
    """
    Process notification tasks from Cloud Tasks.
    
    This endpoint:
    1. Parses the notification task payload
    2. Sends actual emails using SMTP2GO
    3. Returns HTTP 200 to acknowledge the task
    
    Returns HTTP 200 to acknowledge the task.
    """
    try:
        # Parse the request body
        body = await request.body()
        payload = json.loads(body)
        
        notification = NotificationRequest(**payload)
        
        # Log the notification details
        logger.info(f"Processing notification for booking {notification.booking_id}")
        logger.info(f"Notification type: {notification.notification_type}")
        
        # Extract email data
        email_data = notification.data.get("email")
        if not email_data:
            logger.warning(f"No email data found for booking {notification.booking_id}")
            return {"status": "success", "message": "No email to send"}
        
        # Get template data from email payload
        template_data = email_data.get("template_data", {})
        
        # Send email based on notification type
        email_sent = False
        notification_type = notification.data.get("notification_type", "confirmation")
        
        try:
            if notification_type == "confirmation":
                email_sent = send_confirmation_email(template_data)
            elif notification_type == "approval":
                # For approval emails, we need the mechanic phone number
                # This should be included in the template_data by the backend
                mechanic_phone = template_data.get("mechanic_phone", "Contact main office")
                email_sent = send_approval_email(template_data, mechanic_phone)
            elif notification_type == "denial":
                email_sent = send_denial_email(template_data)
            elif notification_type == "cancellation":
                email_sent = send_cancellation_email(template_data)
            elif notification_type == "reschedule_request":
                email_sent = send_reschedule_request_email(template_data)
            elif notification_type == "customer_invitation":
                # Handle customer invitation emails
                email_sent = send_customer_invitation_email(notification.data)
            else:
                logger.warning(f"Unknown notification type: {notification_type}")
                return {"status": "error", "message": f"Unknown notification type: {notification_type}"}
            
            if email_sent:
                logger.info(f"Email sent successfully for booking {notification.booking_id}")
                return {"status": "success", "message": "Email sent successfully"}
            else:
                logger.error(f"Failed to send email for booking {notification.booking_id}")
                raise HTTPException(status_code=500, detail="Email sending failed")
                
        except EmailServiceError as e:
            logger.error(f"Email service error for booking {notification.booking_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Email service error: {str(e)}")
        
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in request body: {str(e)}")
        raise HTTPException(status_code=400, detail="Invalid JSON in request body")
    except Exception as e:
        logger.error(f"Error processing notification: {str(e)}")
        # Return 500 to trigger a retry
        raise HTTPException(status_code=500, detail=f"Error processing notification: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8080)),
        reload=os.environ.get("ENV", "production") != "production",
    )
