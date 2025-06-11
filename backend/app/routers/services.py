from fastapi import APIRouter, HTTPException, Depends
from ..models import Service
from ..firestore import get_client
from ..auth import get_mechanic_user, get_current_user, User
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import logging # Import logging

router = APIRouter(prefix="/services", tags=["services"])
logger = logging.getLogger(__name__) # Setup logger

class ServiceCreate(BaseModel):
    name: str
    minutes: int
    description: str
    price: float

class ServiceUpdate(BaseModel):
    name: str
    minutes: int
    description: str
    price: float
    active: bool = True

@router.get("", response_model=list[Service])
async def list_services(current_user: Optional[User] = Depends(get_current_user)):
    logger.info("[/services] Endpoint called") # Log entry
    db = get_client()
    if not db:
        logger.error("[/services] Firestore client unavailable")
        raise HTTPException(500, "DB unavailable")

    try:
        docs = db.collection("services").where("active", "==", True).stream()
        services_list = [Service(id=d.id, **d.to_dict()) for d in docs]
        logger.info(f"[/services] Found {len(services_list)} active services in Firestore")
        return services_list
    except Exception as e:
        logger.exception(f"[/services] Error querying Firestore for services: {e}")
        raise HTTPException(status_code=500, detail="Failed to query services from database")

@router.get("/all", response_model=list[Service])
async def list_all_services(current_user: User = Depends(get_mechanic_user)):
    """Get all services including inactive ones (mechanic/admin only)"""
    logger.info("[/services/all] Endpoint called") # Log entry
    db = get_client()
    if not db:
        logger.error("[/services/all] Firestore client unavailable")
        raise HTTPException(500, "DB unavailable")

    try:
        docs = db.collection("services").stream()
        services_list = [Service(id=d.id, **d.to_dict()) for d in docs]
        logger.info(f"[/services/all] Found {len(services_list)} total services in Firestore")
        return services_list
    except Exception as e:
        logger.exception(f"[/services/all] Error querying Firestore for services: {e}")
        raise HTTPException(status_code=500, detail="Failed to query services from database")

@router.post("", response_model=Service)
async def create_service(service_data: ServiceCreate, current_user: User = Depends(get_mechanic_user)):
    """Create a new service (mechanic/admin only)"""
    logger.info(f"[/services POST] Creating service: {service_data.name}")
    db = get_client()
    if not db:
        logger.error("[/services POST] Firestore client unavailable")
        raise HTTPException(500, "DB unavailable")

    try:
        # Create service document
        service_ref = db.collection("services").document()
        service_dict = {
            **service_data.dict(),
            "active": True,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        
        service_ref.set(service_dict)
        
        # Return the created service
        created_service = Service(id=service_ref.id, **service_dict)
        logger.info(f"[/services POST] Successfully created service with ID: {service_ref.id}")
        return created_service
        
    except Exception as e:
        logger.exception(f"[/services POST] Error creating service: {e}")
        raise HTTPException(status_code=500, detail="Failed to create service")

@router.put("/{service_id}", response_model=Service)
async def update_service(service_id: str, service_data: ServiceUpdate, current_user: User = Depends(get_mechanic_user)):
    """Update an existing service (mechanic/admin only)"""
    logger.info(f"[/services PUT] Updating service: {service_id}")
    db = get_client()
    if not db:
        logger.error("[/services PUT] Firestore client unavailable")
        raise HTTPException(500, "DB unavailable")

    try:
        service_ref = db.collection("services").document(service_id)
        service_doc = service_ref.get()
        
        if not service_doc.exists:
            logger.warning(f"[/services PUT] Service not found: {service_id}")
            raise HTTPException(status_code=404, detail="Service not found")
        
        # Update service document
        update_dict = {
            **service_data.dict(),
            "updated_at": datetime.now()
        }
        
        service_ref.update(update_dict)
        
        # Return the updated service
        updated_service = Service(id=service_id, **{**service_doc.to_dict(), **update_dict})
        logger.info(f"[/services PUT] Successfully updated service: {service_id}")
        return updated_service
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[/services PUT] Error updating service: {e}")
        raise HTTPException(status_code=500, detail="Failed to update service")

@router.delete("/{service_id}")
async def delete_service(service_id: str, current_user: User = Depends(get_mechanic_user)):
    """Soft delete a service by setting active=False (mechanic/admin only)"""
    logger.info(f"[/services DELETE] Deleting service: {service_id}")
    db = get_client()
    if not db:
        logger.error("[/services DELETE] Firestore client unavailable")
        raise HTTPException(500, "DB unavailable")

    try:
        service_ref = db.collection("services").document(service_id)
        service_doc = service_ref.get()
        
        if not service_doc.exists:
            logger.warning(f"[/services DELETE] Service not found: {service_id}")
            raise HTTPException(status_code=404, detail="Service not found")
        
        # Soft delete by setting active=False
        service_ref.update({
            "active": False,
            "updated_at": datetime.now()
        })
        
        logger.info(f"[/services DELETE] Successfully deleted service: {service_id}")
        return {"message": "Service deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[/services DELETE] Error deleting service: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete service")
