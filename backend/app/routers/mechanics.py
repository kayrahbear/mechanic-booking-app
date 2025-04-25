from fastapi import APIRouter, HTTPException, Depends, Body
from google.cloud import firestore
from typing import Dict, Optional
import logging
from pydantic import BaseModel

from ..models import MechanicSchedule
from ..firestore import get_client
from ..auth import get_mechanic_user, User

router = APIRouter(prefix="/mechanic", tags=["mechanic"])

# Setup logging
logger = logging.getLogger(__name__)

class AvailabilityUpdate(BaseModel):
    schedule: MechanicSchedule

@router.get("/availability", response_model=MechanicSchedule)
async def get_mechanic_availability(current_user: User = Depends(get_mechanic_user)):
    """
    Get the current availability schedule for the authenticated mechanic.
    Only mechanics and admins can access this endpoint.
    """
    db = get_client()
    if not db:
        raise HTTPException(500, "DB unavailable")
    
    # Query the mechanic document from Firestore
    mechanic_ref = db.collection("mechanics").document(current_user.uid)
    mechanic_doc = mechanic_ref.get()
    
    if not mechanic_doc.exists:
        # If the mechanic document doesn't exist yet, return a default schedule
        return MechanicSchedule()
    
    mechanic_data = mechanic_doc.to_dict()
    schedule_data = mechanic_data.get("schedule", {})
    
    # Convert the Firestore data to our Pydantic model
    return MechanicSchedule(**schedule_data)

@router.post("/availability", response_model=MechanicSchedule)
async def update_mechanic_availability(
    availability: AvailabilityUpdate,
    current_user: User = Depends(get_mechanic_user)
):
    """
    Update the availability schedule for the authenticated mechanic.
    Only mechanics and admins can access this endpoint.
    """
    db = get_client()
    if not db:
        raise HTTPException(500, "DB unavailable")
    
    # Reference to the mechanic document
    mechanic_ref = db.collection("mechanics").document(current_user.uid)
    
    # Update the schedule in a transaction to ensure consistency
    @firestore.transactional
    def update_schedule_txn(transaction):
        # Read the mechanic document to see if it exists
        mechanic_doc = mechanic_ref.get(transaction=transaction)
        
        update_data = {
            "schedule": availability.schedule.model_dump(),
            "updated_at": firestore.SERVER_TIMESTAMP
        }
        
        if not mechanic_doc.exists:
            # If the mechanic doesn't exist yet, create a new document
            update_data["name"] = current_user.name or current_user.email
            update_data["email"] = current_user.email
            update_data["active"] = True
            update_data["created_at"] = firestore.SERVER_TIMESTAMP
        
        # Update or create the mechanic document
        transaction.set(mechanic_ref, update_data, merge=True)
        return True
    
    # Execute the transaction
    success = update_schedule_txn(db.transaction())
    
    if not success:
        raise HTTPException(500, "Failed to update availability")
    
    return availability.schedule 