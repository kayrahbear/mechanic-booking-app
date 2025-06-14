from fastapi import APIRouter, HTTPException, Depends
from google.cloud import firestore
from typing import List, Dict
import logging
from uuid import uuid4

from ..models import Vehicle, VehicleCreate, VehicleUpdate
from ..firestore import get_client
from ..auth import get_current_user
from ..services.nhtsa_service import nhtsa_service

router = APIRouter(prefix="/vehicles", tags=["vehicles"])

# Setup logging
logger = logging.getLogger(__name__)

@router.get("/makes", response_model=List[Dict[str, str]])
async def get_vehicle_makes():
    """
    Get all vehicle makes from NHTSA API
    """
    try:
        makes = await nhtsa_service.get_all_makes()
        return makes
    except Exception as e:
        logger.error(f"Error fetching vehicle makes: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch vehicle makes")

@router.get("/models/{make}", response_model=List[Dict[str, str]])
async def get_vehicle_models(make: str):
    """
    Get all models for a specific vehicle make from NHTSA API
    """
    try:
        models = await nhtsa_service.get_models_for_make(make)
        return models
    except Exception as e:
        logger.error(f"Error fetching vehicle models for make '{make}': {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch models for make '{make}'")

@router.post("/users/me/vehicles", response_model=Vehicle)
async def create_user_vehicle(
    vehicle_data: VehicleCreate,
    current_user = Depends(get_current_user)
):
    """
    Add a vehicle to the current user's profile
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    db = get_client()
    if not db:
        raise HTTPException(500, "DB unavailable")
    
    try:
        # Generate a unique ID for the vehicle
        vehicle_id = str(uuid4())
        
        # Check if this should be the primary vehicle (if user has no vehicles yet)
        user_vehicles_ref = db.collection("users").document(current_user.uid).collection("vehicles")
        existing_vehicles = user_vehicles_ref.get()
        is_primary = len(existing_vehicles) == 0
        
        # Create vehicle document
        vehicle_doc_data = {
            "make": vehicle_data.make,
            "model": vehicle_data.model,
            "year": vehicle_data.year,
            "vin": vehicle_data.vin,
            "user_id": current_user.uid,
            "is_primary": is_primary,
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP
        }
        
        # Use a transaction to ensure consistency
        @firestore.transactional
        def create_vehicle_txn(transaction):
            # If this is being set as primary, unset other primary vehicles
            if is_primary:
                existing_vehicles = user_vehicles_ref.get(transaction=transaction)
                for vehicle_doc in existing_vehicles:
                    if vehicle_doc.to_dict().get("is_primary", False):
                        transaction.update(vehicle_doc.reference, {"is_primary": False})
            
            # Create the new vehicle
            vehicle_ref = user_vehicles_ref.document(vehicle_id)
            transaction.set(vehicle_ref, vehicle_doc_data)
            
            return vehicle_id
        
        # Execute the transaction
        created_vehicle_id = create_vehicle_txn(db.transaction())
        
        # Return the created vehicle
        vehicle_ref = user_vehicles_ref.document(created_vehicle_id)
        vehicle_doc = vehicle_ref.get()
        vehicle_data_dict = vehicle_doc.to_dict()
        vehicle_data_dict["id"] = created_vehicle_id
        
        return Vehicle(**vehicle_data_dict)
        
    except Exception as e:
        logger.error(f"Error creating vehicle for user {current_user.uid}: {e}")
        raise HTTPException(500, f"Failed to create vehicle: {str(e)}")

@router.get("/users/me/vehicles", response_model=List[Vehicle])
async def get_user_vehicles(current_user = Depends(get_current_user)):
    """
    Get all vehicles for the current user
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    db = get_client()
    if not db:
        raise HTTPException(500, "DB unavailable")
    
    try:
        user_vehicles_ref = db.collection("users").document(current_user.uid).collection("vehicles")
        vehicles_docs = user_vehicles_ref.order_by("created_at").get()
        
        vehicles = []
        for vehicle_doc in vehicles_docs:
            vehicle_data = vehicle_doc.to_dict()
            vehicle_data["id"] = vehicle_doc.id
            vehicles.append(Vehicle(**vehicle_data))
        
        return vehicles
        
    except Exception as e:
        logger.error(f"Error fetching vehicles for user {current_user.uid}: {e}")
        raise HTTPException(500, f"Failed to fetch vehicles: {str(e)}")

@router.put("/users/me/vehicles/{vehicle_id}", response_model=Vehicle)
async def update_user_vehicle(
    vehicle_id: str,
    vehicle_data: VehicleUpdate,
    current_user = Depends(get_current_user)
):
    """
    Update a vehicle for the current user
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    db = get_client()
    if not db:
        raise HTTPException(500, "DB unavailable")
    
    try:
        vehicle_ref = db.collection("users").document(current_user.uid).collection("vehicles").document(vehicle_id)
        vehicle_doc = vehicle_ref.get()
        
        if not vehicle_doc.exists:
            raise HTTPException(404, "Vehicle not found")
        
        # Build update data (only include non-None fields)
        update_data = {"updated_at": firestore.SERVER_TIMESTAMP}
        if vehicle_data.make is not None:
            update_data["make"] = vehicle_data.make
        if vehicle_data.model is not None:
            update_data["model"] = vehicle_data.model
        if vehicle_data.year is not None:
            update_data["year"] = vehicle_data.year
        if vehicle_data.vin is not None:
            update_data["vin"] = vehicle_data.vin
        
        # Update the vehicle
        vehicle_ref.update(update_data)
        
        # Return the updated vehicle
        updated_vehicle_doc = vehicle_ref.get()
        updated_vehicle_data = updated_vehicle_doc.to_dict()
        updated_vehicle_data["id"] = vehicle_id
        
        return Vehicle(**updated_vehicle_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating vehicle {vehicle_id} for user {current_user.uid}: {e}")
        raise HTTPException(500, f"Failed to update vehicle: {str(e)}")

@router.delete("/users/me/vehicles/{vehicle_id}")
async def delete_user_vehicle(
    vehicle_id: str,
    current_user = Depends(get_current_user)
):
    """
    Delete a vehicle for the current user
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    db = get_client()
    if not db:
        raise HTTPException(500, "DB unavailable")
    
    try:
        vehicle_ref = db.collection("users").document(current_user.uid).collection("vehicles").document(vehicle_id)
        vehicle_doc = vehicle_ref.get()
        
        if not vehicle_doc.exists:
            raise HTTPException(404, "Vehicle not found")
        
        # Check if this was the primary vehicle
        vehicle_data = vehicle_doc.to_dict()
        was_primary = vehicle_data.get("is_primary", False)
        
        # Use a transaction to handle primary vehicle reassignment
        @firestore.transactional
        def delete_vehicle_txn(transaction):
            # Delete the vehicle
            transaction.delete(vehicle_ref)
            
            # If this was the primary vehicle, set another vehicle as primary
            if was_primary:
                user_vehicles_ref = db.collection("users").document(current_user.uid).collection("vehicles")
                remaining_vehicles = user_vehicles_ref.get(transaction=transaction)
                
                if remaining_vehicles:
                    # Set the first remaining vehicle as primary
                    first_vehicle_ref = remaining_vehicles[0].reference
                    transaction.update(first_vehicle_ref, {"is_primary": True})
        
        # Execute the transaction
        delete_vehicle_txn(db.transaction())
        
        return {"message": "Vehicle deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting vehicle {vehicle_id} for user {current_user.uid}: {e}")
        raise HTTPException(500, f"Failed to delete vehicle: {str(e)}")

@router.put("/users/me/vehicles/{vehicle_id}/primary")
async def set_primary_vehicle(
    vehicle_id: str,
    current_user = Depends(get_current_user)
):
    """
    Set a vehicle as the primary vehicle for the current user
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    db = get_client()
    if not db:
        raise HTTPException(500, "DB unavailable")
    
    try:
        user_vehicles_ref = db.collection("users").document(current_user.uid).collection("vehicles")
        vehicle_ref = user_vehicles_ref.document(vehicle_id)
        vehicle_doc = vehicle_ref.get()
        
        if not vehicle_doc.exists:
            raise HTTPException(404, "Vehicle not found")
        
        # Use a transaction to ensure only one primary vehicle
        @firestore.transactional
        def set_primary_txn(transaction):
            # Unset all other primary vehicles
            all_vehicles = user_vehicles_ref.get(transaction=transaction)
            for v_doc in all_vehicles:
                if v_doc.id != vehicle_id and v_doc.to_dict().get("is_primary", False):
                    transaction.update(v_doc.reference, {"is_primary": False})
            
            # Set this vehicle as primary
            transaction.update(vehicle_ref, {"is_primary": True, "updated_at": firestore.SERVER_TIMESTAMP})
        
        # Execute the transaction
        set_primary_txn(db.transaction())
        
        return {"message": "Primary vehicle updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error setting primary vehicle {vehicle_id} for user {current_user.uid}: {e}")
        raise HTTPException(500, f"Failed to set primary vehicle: {str(e)}")
