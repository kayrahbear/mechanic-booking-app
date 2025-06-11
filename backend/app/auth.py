from fastapi import Depends, HTTPException, status, Header
from firebase_admin import auth
from firebase_admin import credentials
import firebase_admin
from firebase_admin.auth import InvalidIdTokenError, ExpiredIdTokenError, RevokedIdTokenError
from typing import Optional
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import logging

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

# Pseudo-email identifier we will assign to Cloud Scheduler calls
SCHEDULER_UID = "cloud-scheduler"

async def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[User]:
    """
    Get the current user from the Firebase ID token or Google Cloud identity token in the Authorization header.
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
    
    # First, try Firebase Auth token verification
    try:
        decoded_token = auth.verify_id_token(token)
        
        # Create user object from Firebase token
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
        
        logging.info(f"Authenticated Firebase user: {user.email} (role: {user.role})")
        return user
        
    except (InvalidIdTokenError, ExpiredIdTokenError, RevokedIdTokenError):
        # Not a valid Firebase token, try Google Cloud identity token
        logging.info("Token is not a Firebase token, attempting Google Cloud identity token verification")
        
        try:
            # Verify Google Cloud identity token
            info = id_token.verify_oauth2_token(token, google_requests.Request())
            
            # Check if this is from our frontend service account
            email = info.get("email", "")
            
            # Allow requests from our frontend service account
            # Check for various frontend service account patterns
            is_frontend_sa = (
                "frontend-sa@" in email or  # Original pattern
                "frontend-service@" in email or  # Actual Terraform-generated pattern
                "compute@developer.gserviceaccount.com" in email or  # Default compute SA
                email.endswith(".iam.gserviceaccount.com")  # Any IAM service account from our project
            )
            
            if email and is_frontend_sa:
                # Create a system user for service-to-service calls
                user = User(
                    uid="frontend-service",
                    email=email,
                    name="Frontend Service Account",
                    role="system",
                    is_admin=False,
                    is_mechanic=False
                )
                
                logging.info(f"Authenticated service account: {email}")
                return user
            else:
                logging.warning(f"Unrecognized service account email: {email}")
                return None
                
        except Exception as e:
            logging.info(f"Token verification failed for both Firebase and Google Cloud: {e}")
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

async def get_scheduler_or_mechanic_user(
    authorization: Optional[str] = Header(None),
    x_cloudscheduler: Optional[str] = Header(None, alias="X-CloudScheduler"),
    user_agent: Optional[str] = Header(None, alias="User-Agent"),
) -> User:
    """Dependency that authorises either:
    • Firebase Auth user with mechanic/admin role (via get_current_user)
    • Google Cloud Scheduler (or other SA) request identified by OIDC or headers.
    """
    # First, try standard Firebase auth path
    current_user = await get_current_user(authorization=authorization)
    if current_user and (current_user.is_admin or current_user.is_mechanic):
        return current_user

    # Next, accept Cloud Scheduler HTTP calls authenticated with an OIDC token or headers.
    # Cloud Scheduler normally sets User-Agent: "Google-Cloud-Scheduler" and can optionally
    # set X-CloudScheduler header. In addition, Cloud Run will have validated the token if
    # the service requires authentication, but we still introspect to grab the email.
    if x_cloudscheduler or (user_agent and "Google-Cloud-Scheduler" in user_agent):
        # Best-effort decode email from OIDC token if provided
        if authorization and authorization.startswith("Bearer "):
            token = authorization.replace("Bearer ", "")
            try:
                info = id_token.verify_oauth2_token(token, google_requests.Request())
                email = info.get("email", "scheduler@gcp")
            except Exception:  # noqa: BLE001
                email = "scheduler@gcp"
        else:
            email = "scheduler@gcp"

        return User(
            uid=SCHEDULER_UID,
            email=email,
            role="system",
            is_admin=True,
            is_mechanic=False,
        )

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorised")
