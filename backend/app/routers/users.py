from fastapi import APIRouter, HTTPException, Depends, Body
from firebase_admin import auth
from google.cloud import firestore
from typing import Dict, Optional
import logging
from pydantic import BaseModel, EmailStr

from ..models import User
from ..firestore import get_client
from ..auth import get_current_user

router = APIRouter(prefix="/users", tags=["users"])

# Setup logging
logger = logging.getLogger(__name__)

class UserProfileUpdate(BaseModel):
    name: str
    phone: Optional[str] = None

@router.get("/me", response_model=User)
async def get_current_user_profile(current_user = Depends(get_current_user)):
    """
    Get the current authenticated user's profile information.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    db = get_client()
    if not db:
        raise HTTPException(500, "DB unavailable")
    
    # Get the user document from Firestore
    user_ref = db.collection("users").document(current_user.uid)
    user_doc = user_ref.get()
    
    if not user_doc.exists:
        logger.warning(f"User document not found for authenticated user: {current_user.uid}")
        # Return the basic user info we have from the token
        return User(
            id=current_user.uid, 
            email=current_user.email,
            name=current_user.name or "",
            role=current_user.role
        )
    
    user_data = user_doc.to_dict()
    # Add the id to the data
    user_data["id"] = current_user.uid
    
    return User(**user_data)

@router.put("/me", response_model=User)
async def update_user_profile(
    profile_data: UserProfileUpdate,
    current_user = Depends(get_current_user)
):
    """
    Update the current authenticated user's profile information.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    db = get_client()
    if not db:
        raise HTTPException(500, "DB unavailable")
    
    # Update user document in Firestore
    user_ref = db.collection("users").document(current_user.uid)
    
    # Use a transaction to ensure consistency
    @firestore.transactional
    def update_profile_txn(transaction):
        # Check if the user document exists
        user_doc = user_ref.get(transaction=transaction)
        
        update_data = {
            "name": profile_data.name,
            "phone": profile_data.phone or "",
            "updated_at": firestore.SERVER_TIMESTAMP
        }
        
        if not user_doc.exists:
            # Create a new user document with all required fields
            update_data["email"] = current_user.email
            update_data["role"] = current_user.role
            update_data["created_at"] = firestore.SERVER_TIMESTAMP
            transaction.set(user_ref, update_data)
        else:
            # Update the existing document
            transaction.update(user_ref, update_data)
        
        # Return success
        return True
    
    try:
        # Execute the transaction
        success = update_profile_txn(db.transaction())
        
        if not success:
            raise HTTPException(500, "Failed to update profile")
        
        # Try to update the display name in Firebase Auth as well
        try:
            auth.update_user(
                current_user.uid,
                display_name=profile_data.name
            )
        except Exception as e:
            logger.error(f"Error updating Firebase Auth display name: {e}")
            # Don't fail the request if this happens, it's not critical
        
        # Get and return the updated user data
        updated_user_doc = user_ref.get()
        updated_user_data = updated_user_doc.to_dict()
        updated_user_data["id"] = current_user.uid
        
        return User(**updated_user_data)
        
    except Exception as e:
        logger.error(f"Error updating user profile: {e}")
        raise HTTPException(500, f"Failed to update profile: {str(e)}") 