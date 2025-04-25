from fastapi import APIRouter, HTTPException, Depends
from firebase_admin import auth
from typing import List, Dict, Any
import logging
from pydantic import BaseModel

from ..auth import get_admin_user, User

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(get_admin_user)])

# Setup logging
logger = logging.getLogger(__name__)

class UserRoleUpdate(BaseModel):
    role: str  # Should be one of 'customer', 'mechanic', 'admin'

@router.get("/users", response_model=List[Dict[str, Any]])
async def list_all_users():
    """
    List all users from Firebase Authentication. Only accessible by admins.
    Returns basic user info including UID, email, name, and custom claims (roles).
    """
    users_list = []
    try:
        # Iterate through all users. This can be memory-intensive for large user bases.
        # Consider pagination for production applications.
        for user in auth.list_users().iterate_all():
            user_data = {
                "uid": user.uid,
                "email": user.email,
                "name": user.display_name or "",
                "disabled": user.disabled,
                "created_at": user.user_metadata.creation_timestamp if user.user_metadata else None,
                "last_sign_in": user.user_metadata.last_sign_in_timestamp if user.user_metadata else None,
                "roles": {
                    "admin": user.custom_claims.get('admin', False) if user.custom_claims else False,
                    "mechanic": user.custom_claims.get('mechanic', False) if user.custom_claims else False,
                }
            }
            users_list.append(user_data)
        return users_list
    except Exception as e:
        logger.error(f"Error listing users: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to list users")

@router.post("/users/{uid}/role", status_code=204)
async def set_user_role(uid: str, payload: UserRoleUpdate):
    """
    Set the custom claims (roles) for a specific user. Only accessible by admins.
    This effectively sets the user's role in the application.
    """
    if payload.role not in ['customer', 'mechanic', 'admin']:
        raise HTTPException(status_code=400, detail="Invalid role specified. Must be one of: customer, mechanic, admin")

    try:
        # Set custom claims based on the provided role
        claims = {
            'admin': payload.role == 'admin',
            'mechanic': payload.role == 'mechanic' or payload.role == 'admin'
        }
        
        # Update the user's custom claims in Firebase Auth
        auth.set_custom_user_claims(uid, claims)
        logger.info(f"Successfully set role '{payload.role}' for user {uid}")
        return  # Return 204 No Content on success
    except auth.UserNotFoundError:
        raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        logger.error(f"Error setting custom claims for user {uid}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to set user role") 