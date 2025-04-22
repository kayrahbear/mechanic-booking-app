from fastapi import FastAPI, Request, Response, HTTPException
import logging
import json
import os
from pydantic import BaseModel
from typing import Dict, Any, Optional
import uvicorn

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
    2. Logs the notification details (stub implementation for Task 10)
    3. Will be expanded in Task 14 to actually send emails/SMS
    
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
        logger.info(f"Notification data: {notification.data}")
        
        # Extract email and SMS details
        email_data = notification.data.get("email")
        sms_data = notification.data.get("sms")
        
        if email_data:
            logger.info(f"Would send email to: {email_data.get('to_email')}")
            logger.info(f"Email subject: {email_data.get('subject')}")
        
        if sms_data:
            logger.info(f"Would send SMS to: {sms_data.get('to_phone')}")
            logger.info(f"SMS message: {sms_data.get('message')}")
        
        # For Task 10, we just log the notification (actual sending in Task 14)
        return {"status": "success", "message": "Notification processed"}
        
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