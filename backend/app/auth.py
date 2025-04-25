from fastapi import Depends, HTTPException, status, Header
from firebase_admin import auth
from firebase_admin import credentials
import firebase_admin
from firebase_admin.auth import InvalidIdTokenError, ExpiredIdTokenError, RevokedIdTokenError
from typing import Optional
from pydantic import BaseModel

# Ensure Firebase Admin SDK is initialized exactly once.
# This is required before calling auth.verify_id_token.
# Using Application Default Credentials so Cloud Run service account works out-of-the-box.
try:
    firebase_admin.get_app()
except ValueError:
    try:
        cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred)
    except Exception as e:
        # If initialization fails, we log; downstream calls will raise clearer errors.
        import logging
        logging.error("Failed to initialize Firebase Admin SDK: %s", e)

class User(BaseModel):
    """User information from Firebase Auth token"""
    uid: str
    email: str
    name: Optional[str] = None
    role: str = "customer"
    is_admin: bool = False
    is_mechanic: bool = False

async def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[User]:
    """
    Get the current user from the Firebase ID token in the Authorization header.
    Returns None for unauthenticated requests to endpoints that allow anonymous access.
    Raises HTTPException for invalid tokens.
    """
    if not authorization:
        return None
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = authorization.replace("Bearer ", "")
    
    try:
        # Verify the ID token
        decoded_token = auth.verify_id_token(token)
        
        # Create user object
        user = User(
            uid=decoded_token["uid"],
            email=decoded_token.get("email", ""),
            name=decoded_token.get("name", ""),
            is_admin=decoded_token.get("admin", False),
            is_mechanic=decoded_token.get("mechanic", False)
        )
        
        # Set the role based on custom claims
        if user.is_admin:
            user.role = "admin"
        elif user.is_mechanic:
            user.role = "mechanic"
        
        return user
        
    except (InvalidIdTokenError, ExpiredIdTokenError, RevokedIdTokenError) as e:
        # The token is not a valid Firebase Auth token. This may happen when the
        # request comes from another Cloud Run service using an IAM identity
        # token. Treat this as an anonymous call so public endpoints can still
        # succeed, but return nothing so endpoints that *require* auth will
        # reject via get_admin_user or explicit checks.
        import logging
        logging.info("Non-Firebase identity token supplied; treating as anonymous: %s", e)
        return None
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication error: {str(e)}",
        )

async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Check if the current user is an admin, returning the user if so.
    Raises HTTPException if not authenticated or not an admin.
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized - admin role required",
        )
    
    return current_user 

async def get_mechanic_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Check if the current user is a mechanic or admin, returning the user if so.
    Raises HTTPException if not authenticated or not a mechanic/admin.
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not (current_user.is_mechanic or current_user.is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized - mechanic role required",
        )
    
    return current_user 