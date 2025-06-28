from fastapi import APIRouter, HTTPException, Depends, status
from firebase_admin import auth
from google.cloud import firestore
from typing import List, Dict, Optional
import logging
import secrets
import string
from datetime import datetime, timedelta
from pydantic import BaseModel

from ..models import (
    CustomerCreateRequest, 
    CustomerUpdateRequest, 
    CustomerResponse, 
    CustomerInvitation,
    CustomerInvitationStatus,
    User,
    UserRole,
    Vehicle,
    VehicleCreate
)
from ..firestore import get_client
from ..auth import get_current_user
from ..tasks import send_customer_invitation_email

router = APIRouter(prefix="/customers", tags=["customers"])
logger = logging.getLogger(__name__)

def generate_temporary_password(length: int = 12) -> str:
    """Generate a secure temporary password."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    password = ''.join(secrets.choice(alphabet) for _ in range(length))
    return password

def require_mechanic_role(current_user = Depends(get_current_user)):
    """Dependency to ensure user has mechanic role."""
    logger.info(f"Customer endpoint access attempt - User: {current_user.email if current_user else 'None'}, Role: {current_user.role if current_user else 'None'}, is_mechanic: {current_user.is_mechanic if current_user else 'None'}, is_admin: {current_user.is_admin if current_user else 'None'}")
    
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    # Check if user has mechanic role (from custom claims) or admin role
    if not (current_user.is_mechanic or current_user.is_admin or current_user.role in ["mechanic", "admin"]):
        logger.warning(f"Access denied for user {current_user.email} - insufficient permissions")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. User role: {current_user.role}, is_mechanic: {current_user.is_mechanic}, is_admin: {current_user.is_admin}"
        )
    return current_user

@router.post("/", response_model=CustomerResponse)
async def create_customer(
    customer_data: CustomerCreateRequest,
    current_user = Depends(require_mechanic_role)
):
    """Create a new customer profile with optional vehicle information."""
    db = get_client()
    if not db:
        raise HTTPException(500, "Database unavailable")

    try:
        # Check if user with this email already exists
        existing_users = db.collection("users").where("email", "==", customer_data.email).limit(1).get()
        if existing_users:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email already exists"
            )

        # Generate temporary password if invitation will be sent
        temporary_password = None
        if customer_data.send_invitation:
            temporary_password = generate_temporary_password()

        # Create Firebase Auth user if invitation is being sent
        firebase_user = None
        if customer_data.send_invitation:
            try:
                firebase_user = auth.create_user(
                    email=customer_data.email,
                    password=temporary_password,
                    display_name=customer_data.name
                )
            except Exception as e:
                logger.error(f"Failed to create Firebase user: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create user account"
                )

        # Use transaction to ensure data consistency
        @firestore.transactional
        def create_customer_txn(transaction):
            # Create user document
            user_ref = db.collection("users").document(firebase_user.uid if firebase_user else None)
            if not firebase_user:
                user_ref = db.collection("users").document()
                
            user_data = {
                "email": customer_data.email,
                "name": customer_data.name,
                "phone": customer_data.phone or "",
                "role": UserRole.CUSTOMER.value,
                "created_by_mechanic": True,
                "created_at": firestore.SERVER_TIMESTAMP,
                "updated_at": firestore.SERVER_TIMESTAMP
            }
            
            # Add address fields if provided
            if customer_data.address:
                user_data["address"] = customer_data.address
            if customer_data.city:
                user_data["city"] = customer_data.city
            if customer_data.state:
                user_data["state"] = customer_data.state
            if customer_data.zip_code:
                user_data["zip_code"] = customer_data.zip_code

            transaction.set(user_ref, user_data)
            
            # Create vehicle if provided
            vehicle_ref = None
            if customer_data.vehicle_make and customer_data.vehicle_model and customer_data.vehicle_year:
                vehicle_ref = db.collection("vehicles").document()
                vehicle_data = {
                    "make": customer_data.vehicle_make,
                    "model": customer_data.vehicle_model,
                    "year": customer_data.vehicle_year,
                    "vin": customer_data.vehicle_vin or "",
                    "user_id": user_ref.id,
                    "is_primary": True,  # First vehicle is primary
                    "created_at": firestore.SERVER_TIMESTAMP,
                    "updated_at": firestore.SERVER_TIMESTAMP
                }
                transaction.set(vehicle_ref, vehicle_data)
            
            # Create invitation if requested
            invitation_ref = None
            if customer_data.send_invitation and temporary_password:
                invitation_ref = db.collection("customer_invitations").document()
                invitation_data = {
                    "customer_id": user_ref.id,
                    "customer_email": customer_data.email,
                    "temporary_password": temporary_password,
                    "status": CustomerInvitationStatus.PENDING.value,
                    "expires_at": datetime.now() + timedelta(days=7),  # 7 days to accept
                    "sent_at": firestore.SERVER_TIMESTAMP,
                    "created_by": current_user.uid
                }
                transaction.set(invitation_ref, invitation_data)
            
            return user_ref.id, vehicle_ref.id if vehicle_ref else None, invitation_ref.id if invitation_ref else None

        # Execute transaction
        user_id, vehicle_id, invitation_id = create_customer_txn(db.transaction())

        # Send invitation email if requested
        if customer_data.send_invitation and temporary_password:
            try:
                # Send email via task queue
                await send_customer_invitation_email(
                    customer_data.email,
                    customer_data.name,
                    temporary_password
                )
            except Exception as e:
                logger.error(f"Failed to send invitation email: {e}")
                # Don't fail the request if email fails

        # Fetch and return the created customer
        return await get_customer_by_id(user_id, current_user)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating customer: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create customer"
        )

@router.get("/", response_model=List[CustomerResponse])
async def list_customers(
    current_user = Depends(require_mechanic_role)
):
    """List all customers created by mechanics."""
    db = get_client()
    if not db:
        raise HTTPException(500, "Database unavailable")

    try:
        # Get all users with customer role and created_by_mechanic flag
        customers_query = db.collection("users").where("role", "==", UserRole.CUSTOMER.value)
        customers_docs = customers_query.get()

        customers = []
        for doc in customers_docs:
            customer_data = doc.to_dict()
            customer_data["id"] = doc.id
            
            # Get vehicles for this customer
            vehicles_query = db.collection("vehicles").where("user_id", "==", doc.id)
            vehicles_docs = vehicles_query.get()
            vehicles = []
            for vehicle_doc in vehicles_docs:
                vehicle_data = vehicle_doc.to_dict()
                vehicle_data["id"] = vehicle_doc.id
                vehicles.append(Vehicle(**vehicle_data))
            
            # Get invitation status if applicable
            invitation_status = None
            if customer_data.get("created_by_mechanic", False):
                invitation_query = db.collection("customer_invitations").where("customer_id", "==", doc.id).limit(1)
                invitation_docs = invitation_query.get()
                if invitation_docs:
                    invitation_status = invitation_docs[0].to_dict().get("status")
            
            customer_response = CustomerResponse(
                **customer_data,
                vehicles=vehicles,
                invitation_status=invitation_status
            )
            customers.append(customer_response)

        return customers

    except Exception as e:
        logger.error(f"Error listing customers: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve customers"
        )

@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer_by_id(
    customer_id: str,
    current_user = Depends(require_mechanic_role)
):
    """Get a specific customer by ID."""
    db = get_client()
    if not db:
        raise HTTPException(500, "Database unavailable")

    try:
        # Get customer document
        customer_doc = db.collection("users").document(customer_id).get()
        if not customer_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )

        customer_data = customer_doc.to_dict()
        customer_data["id"] = customer_doc.id

        # Get vehicles for this customer
        vehicles_query = db.collection("vehicles").where("user_id", "==", customer_id)
        vehicles_docs = vehicles_query.get()
        vehicles = []
        for vehicle_doc in vehicles_docs:
            vehicle_data = vehicle_doc.to_dict()
            vehicle_data["id"] = vehicle_doc.id
            vehicles.append(Vehicle(**vehicle_data))

        # Get invitation status if applicable
        invitation_status = None
        if customer_data.get("created_by_mechanic", False):
            invitation_query = db.collection("customer_invitations").where("customer_id", "==", customer_id).limit(1)
            invitation_docs = invitation_query.get()
            if invitation_docs:
                invitation_status = invitation_docs[0].to_dict().get("status")

        return CustomerResponse(
            **customer_data,
            vehicles=vehicles,
            invitation_status=invitation_status
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting customer {customer_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve customer"
        )

@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: str,
    customer_data: CustomerUpdateRequest,
    current_user = Depends(require_mechanic_role)
):
    """Update a customer's information."""
    db = get_client()
    if not db:
        raise HTTPException(500, "Database unavailable")

    try:
        # Check if customer exists
        customer_ref = db.collection("users").document(customer_id)
        customer_doc = customer_ref.get()
        if not customer_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )

        # Update customer data
        update_data = {
            "updated_at": firestore.SERVER_TIMESTAMP
        }
        
        if customer_data.name is not None:
            update_data["name"] = customer_data.name
        if customer_data.phone is not None:
            update_data["phone"] = customer_data.phone
        if customer_data.address is not None:
            update_data["address"] = customer_data.address
        if customer_data.city is not None:
            update_data["city"] = customer_data.city
        if customer_data.state is not None:
            update_data["state"] = customer_data.state
        if customer_data.zip_code is not None:
            update_data["zip_code"] = customer_data.zip_code

        customer_ref.update(update_data)

        # Return updated customer
        return await get_customer_by_id(customer_id, current_user)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating customer {customer_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update customer"
        )

@router.delete("/{customer_id}")
async def delete_customer(
    customer_id: str,
    current_user = Depends(require_mechanic_role)
):
    """Delete a customer and their related data."""
    db = get_client()
    if not db:
        raise HTTPException(500, "Database unavailable")

    try:
        # Check if customer exists
        customer_doc = db.collection("users").document(customer_id).get()
        if not customer_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )

        customer_data = customer_doc.to_dict()

        # Use transaction to delete customer and related data
        @firestore.transactional
        def delete_customer_txn(transaction):
            # Delete customer document
            transaction.delete(db.collection("users").document(customer_id))
            
            # Delete customer's vehicles
            vehicles_query = db.collection("vehicles").where("user_id", "==", customer_id)
            vehicles_docs = vehicles_query.get()
            for vehicle_doc in vehicles_docs:
                transaction.delete(vehicle_doc.reference)
            
            # Delete customer invitations
            invitations_query = db.collection("customer_invitations").where("customer_id", "==", customer_id)
            invitations_docs = invitations_query.get()
            for invitation_doc in invitations_docs:
                transaction.delete(invitation_doc.reference)

        delete_customer_txn(db.transaction())

        # Delete from Firebase Auth if they have an account
        try:
            auth.delete_user(customer_id)
        except Exception as e:
            logger.warning(f"Could not delete Firebase Auth user {customer_id}: {e}")
            # Don't fail the request if auth deletion fails

        return {"message": "Customer deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting customer {customer_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete customer"
        )

@router.post("/{customer_id}/invite")
async def send_invitation(
    customer_id: str,
    current_user = Depends(require_mechanic_role)
):
    """Send or resend an invitation to a customer."""
    db = get_client()
    if not db:
        raise HTTPException(500, "Database unavailable")

    try:
        # Get customer
        customer_doc = db.collection("users").document(customer_id).get()
        if not customer_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )

        customer_data = customer_doc.to_dict()

        # Check if customer already has Firebase account
        try:
            auth.get_user_by_email(customer_data["email"])
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Customer already has an active account"
            )
        except auth.UserNotFoundError:
            pass  # This is what we want

        # Generate new temporary password
        temporary_password = generate_temporary_password()

        # Create Firebase Auth user
        firebase_user = auth.create_user(
            email=customer_data["email"],
            password=temporary_password,
            display_name=customer_data["name"]
        )

        # Create or update invitation
        invitation_ref = db.collection("customer_invitations").document()
        invitation_data = {
            "customer_id": customer_id,
            "customer_email": customer_data["email"],
            "temporary_password": temporary_password,
            "status": CustomerInvitationStatus.PENDING.value,
            "expires_at": datetime.now() + timedelta(days=7),
            "sent_at": firestore.SERVER_TIMESTAMP,
            "created_by": current_user.uid
        }
        invitation_ref.set(invitation_data)

        # Send invitation email
        await send_customer_invitation_email(
            customer_data["email"],
            customer_data["name"],
            temporary_password
        )

        return {"message": "Invitation sent successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending invitation to customer {customer_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send invitation"
        )

@router.post("/{customer_id}/vehicles", response_model=Vehicle)
async def add_customer_vehicle(
    customer_id: str,
    vehicle_data: VehicleCreate,
    current_user = Depends(require_mechanic_role)
):
    """Add a vehicle to a customer's profile."""
    db = get_client()
    if not db:
        raise HTTPException(500, "Database unavailable")

    try:
        # Check if customer exists
        customer_doc = db.collection("users").document(customer_id).get()
        if not customer_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )

        # Check if this is the customer's first vehicle
        existing_vehicles = db.collection("vehicles").where("user_id", "==", customer_id).get()
        is_primary = len(existing_vehicles) == 0

        # Create vehicle
        vehicle_ref = db.collection("vehicles").document()
        vehicle_doc_data = {
            "make": vehicle_data.make,
            "model": vehicle_data.model,
            "year": vehicle_data.year,
            "vin": vehicle_data.vin or "",
            "user_id": customer_id,
            "is_primary": is_primary,
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP
        }
        vehicle_ref.set(vehicle_doc_data)

        # Return created vehicle
        created_vehicle = vehicle_ref.get().to_dict()
        created_vehicle["id"] = vehicle_ref.id
        
        return Vehicle(**created_vehicle)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding vehicle to customer {customer_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add vehicle"
        )