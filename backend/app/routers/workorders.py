from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File
from firebase_admin import auth
from google.cloud import firestore, storage
from typing import List, Dict, Optional
import logging
from datetime import datetime, timedelta
from uuid import uuid4
import os
from pathlib import Path

from ..models import (
    WorkOrder,
    WorkOrderCreate,
    WorkOrderUpdate,
    WorkOrderStatus,
    WorkOrderPart,
    WorkOrderLabor,
    WorkOrderPartCreate,
    WorkOrderLaborCreate,
    PartInventory,
    PartInventoryCreate,
    PartInventoryUpdate
)
from ..firestore import get_client
from ..auth import get_current_user, get_mechanic_user

router = APIRouter(prefix="/workorders", tags=["workorders"], dependencies=[Depends(get_mechanic_user)])
logger = logging.getLogger(__name__)

def generate_work_order_number() -> str:
    """Generate a unique work order number in format WO-YYYY-NNNN"""
    current_year = datetime.now().year
    # In production, you'd query the database to get the next sequential number
    # For now, we'll use timestamp-based generation
    timestamp = datetime.now().strftime("%m%d%H%M")
    return f"WO-{current_year}-{timestamp}"

def calculate_work_order_totals(work_order_data: dict) -> dict:
    """Calculate parts_total, labor_total, and total_cost for a work order"""
    parts_total = sum(part.get('total_cost', 0) for part in work_order_data.get('parts', []))
    labor_total = sum(labor.get('total_cost', 0) for labor in work_order_data.get('labor_entries', []))
    
    work_order_data['parts_total'] = parts_total
    work_order_data['labor_total'] = labor_total
    work_order_data['total_cost'] = parts_total + labor_total
    
    return work_order_data

def check_edit_window(completed_at: Optional[datetime]) -> bool:
    """Check if work order is still within 7-day edit window"""
    if not completed_at:
        return True  # Not completed, always editable
    
    seven_days_ago = datetime.now() - timedelta(days=7)
    return completed_at > seven_days_ago

@router.post("/", response_model=WorkOrder)
@router.post("", response_model=WorkOrder)
async def create_work_order(
    work_order_data: WorkOrderCreate,
    current_user = Depends(get_current_user)
):
    """Create a new work order."""
    db = get_client()
    if not db:
        raise HTTPException(500, "Database unavailable")

    try:
        # Generate work order number
        work_order_number = generate_work_order_number()
        
        # Use transaction to ensure data consistency
        @firestore.transactional
        def create_work_order_txn(transaction):
            # Create work order document
            work_order_ref = db.collection("work_orders").document()
            work_order_id = work_order_ref.id
            
            # Prepare work order data
            work_order_dict = {
                "id": work_order_id,
                "work_order_number": work_order_number,
                "customer_id": work_order_data.customer_id,
                "vehicle_id": work_order_data.vehicle_id,
                "booking_id": work_order_data.booking_id,
                "mechanic_id": current_user.uid,
                "mileage": work_order_data.mileage,
                "title": work_order_data.title,
                "description": work_order_data.description,
                "status": WorkOrderStatus.DRAFT.value,
                "service_type": work_order_data.service_type,
                "scheduled_date": work_order_data.scheduled_date,
                "parts": [],
                "labor_entries": [],
                "mechanic_notes": work_order_data.mechanic_notes,
                "internal_notes": work_order_data.internal_notes,
                "photos": [],
                "is_editable": True,
                "created_at": firestore.SERVER_TIMESTAMP,
                "updated_at": firestore.SERVER_TIMESTAMP
            }
            
            # Add parts if provided
            for part_data in work_order_data.parts:
                part_id = str(uuid4())
                part_dict = {
                    "id": part_id,
                    "work_order_id": work_order_id,
                    **part_data.dict(exclude={'total_cost'}),
                    "total_cost": part_data.quantity_needed * part_data.unit_cost,
                    "created_at": firestore.SERVER_TIMESTAMP,
                    "updated_at": firestore.SERVER_TIMESTAMP
                }
                work_order_dict["parts"].append(part_dict)
            
            # Add labor entries if provided
            for labor_data in work_order_data.labor_entries:
                labor_id = str(uuid4())
                labor_dict = {
                    "id": labor_id,
                    "work_order_id": work_order_id,
                    **labor_data.dict(exclude={'total_cost'}),
                    "total_cost": labor_data.hours * labor_data.hourly_rate,
                    "created_at": firestore.SERVER_TIMESTAMP,
                    "updated_at": firestore.SERVER_TIMESTAMP
                }
                work_order_dict["labor_entries"].append(labor_dict)
            
            # Calculate totals
            work_order_dict = calculate_work_order_totals(work_order_dict)
            
            # Create the work order
            transaction.set(work_order_ref, work_order_dict)
            
            return work_order_id

        # Execute transaction
        work_order_id = create_work_order_txn(db.transaction())
        
        # Fetch and return the created work order
        return await get_work_order_by_id(work_order_id, current_user)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating work order: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create work order"
        )

@router.get("/", response_model=List[WorkOrder])
@router.get("", response_model=List[WorkOrder])
async def list_work_orders(
    status_filter: Optional[str] = None,
    customer_id: Optional[str] = None,
    vehicle_id: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """List all work orders with optional filtering."""
    db = get_client()
    if not db:
        raise HTTPException(500, "Database unavailable")

    try:
        # Build query
        query = db.collection("work_orders")
        
        # Apply filters
        if status_filter:
            query = query.where("status", "==", status_filter)
        if customer_id:
            query = query.where("customer_id", "==", customer_id)
        if vehicle_id:
            query = query.where("vehicle_id", "==", vehicle_id)
        
        # Order by creation date (newest first)
        work_orders_docs = query.order_by("created_at", direction=firestore.Query.DESCENDING).get()
        
        work_orders = []
        for doc in work_orders_docs:
            work_order_data = doc.to_dict()
            work_order_data["id"] = doc.id
            
            # Check edit window
            completed_at = work_order_data.get("completed_at")
            if completed_at:
                work_order_data["is_editable"] = check_edit_window(completed_at)
            
            work_orders.append(WorkOrder(**work_order_data))

        return work_orders

    except Exception as e:
        logger.error(f"Error listing work orders: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve work orders"
        )

@router.get("/{work_order_id}", response_model=WorkOrder)
async def get_work_order_by_id(
    work_order_id: str,
    current_user = Depends(get_current_user)
):
    """Get a specific work order by ID."""
    db = get_client()
    if not db:
        raise HTTPException(500, "Database unavailable")

    try:
        # Get work order document
        work_order_doc = db.collection("work_orders").document(work_order_id).get()
        if not work_order_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Work order not found"
            )

        work_order_data = work_order_doc.to_dict()
        work_order_data["id"] = work_order_doc.id
        
        # Check edit window
        completed_at = work_order_data.get("completed_at")
        if completed_at:
            work_order_data["is_editable"] = check_edit_window(completed_at)

        return WorkOrder(**work_order_data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting work order {work_order_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve work order"
        )

@router.put("/{work_order_id}", response_model=WorkOrder)
async def update_work_order(
    work_order_id: str,
    work_order_data: WorkOrderUpdate,
    current_user = Depends(get_current_user)
):
    """Update a work order."""
    db = get_client()
    if not db:
        raise HTTPException(500, "Database unavailable")

    try:
        # Check if work order exists and is editable
        work_order_ref = db.collection("work_orders").document(work_order_id)
        work_order_doc = work_order_ref.get()
        if not work_order_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Work order not found"
            )

        current_data = work_order_doc.to_dict()
        
        # Check edit window
        completed_at = current_data.get("completed_at")
        if completed_at and not check_edit_window(completed_at):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Work order can only be edited within 7 days of completion"
            )

        # Prepare update data
        update_data = {
            "updated_at": firestore.SERVER_TIMESTAMP
        }
        
        # Update fields that were provided
        for field, value in work_order_data.dict(exclude_unset=True).items():
            if field == "parts" and value is not None:
                # Rebuild parts with IDs and calculated totals
                parts_list = []
                for part_data in value:
                    part_id = str(uuid4())
                    part_dict = {
                        "id": part_id,
                        "work_order_id": work_order_id,
                        **part_data.dict(exclude={'total_cost'}),
                        "total_cost": part_data.quantity_needed * part_data.unit_cost,
                        "created_at": firestore.SERVER_TIMESTAMP,
                        "updated_at": firestore.SERVER_TIMESTAMP
                    }
                    parts_list.append(part_dict)
                update_data["parts"] = parts_list
                
            elif field == "labor_entries" and value is not None:
                # Rebuild labor entries with IDs and calculated totals
                labor_list = []
                for labor_data in value:
                    labor_id = str(uuid4())
                    labor_dict = {
                        "id": labor_id,
                        "work_order_id": work_order_id,
                        **labor_data.dict(exclude={'total_cost'}),
                        "total_cost": labor_data.hours * labor_data.hourly_rate,
                        "created_at": firestore.SERVER_TIMESTAMP,
                        "updated_at": firestore.SERVER_TIMESTAMP
                    }
                    labor_list.append(labor_dict)
                update_data["labor_entries"] = labor_list
                
            elif field == "status" and value == WorkOrderStatus.WORK_COMPLETED.value:
                update_data[field] = value
                update_data["completed_at"] = firestore.SERVER_TIMESTAMP
                
            else:
                update_data[field] = value

        # Recalculate totals if parts or labor were updated
        if "parts" in update_data or "labor_entries" in update_data:
            merged_data = {**current_data, **update_data}
            update_data = calculate_work_order_totals(merged_data)

        work_order_ref.update(update_data)

        # Return updated work order
        return await get_work_order_by_id(work_order_id, current_user)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating work order {work_order_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update work order"
        )

@router.delete("/{work_order_id}")
async def delete_work_order(
    work_order_id: str,
    current_user = Depends(get_current_user)
):
    """Delete a work order."""
    db = get_client()
    if not db:
        raise HTTPException(500, "Database unavailable")

    try:
        # Check if work order exists
        work_order_doc = db.collection("work_orders").document(work_order_id).get()
        if not work_order_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Work order not found"
            )

        # Delete the work order
        db.collection("work_orders").document(work_order_id).delete()

        return {"message": "Work order deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting work order {work_order_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete work order"
        )

# Parts Inventory endpoints
@router.get("/inventory/parts", response_model=List[PartInventory])
async def list_parts_inventory(current_user = Depends(get_current_user)):
    """List all parts in inventory."""
    db = get_client()
    if not db:
        raise HTTPException(500, "Database unavailable")

    try:
        parts_docs = db.collection("parts_inventory").order_by("part_name").get()
        
        parts = []
        for doc in parts_docs:
            part_data = doc.to_dict()
            part_data["id"] = doc.id
            parts.append(PartInventory(**part_data))

        return parts

    except Exception as e:
        logger.error(f"Error listing parts inventory: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve parts inventory"
        )

@router.post("/inventory/parts", response_model=PartInventory)
async def create_part_inventory(
    part_data: PartInventoryCreate,
    current_user = Depends(get_current_user)
):
    """Add a new part to inventory."""
    db = get_client()
    if not db:
        raise HTTPException(500, "Database unavailable")

    try:
        # Check if part number already exists
        existing_parts = db.collection("parts_inventory").where("part_number", "==", part_data.part_number).limit(1).get()
        if existing_parts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A part with this part number already exists"
            )

        # Create part inventory
        part_ref = db.collection("parts_inventory").document()
        part_dict = {
            "id": part_ref.id,
            **part_data.dict(),
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP
        }
        
        part_ref.set(part_dict)
        
        # Return created part
        created_part = part_ref.get().to_dict()
        created_part["id"] = part_ref.id
        
        return PartInventory(**created_part)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating part inventory: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create part inventory"
        )

@router.get("/inventory/parts/{part_id}", response_model=PartInventory)
async def get_part_inventory(
    part_id: str,
    current_user = Depends(get_current_user)
):
    """Get a specific part from inventory."""
    db = get_client()
    if not db:
        raise HTTPException(500, "Database unavailable")

    try:
        part_doc = db.collection("parts_inventory").document(part_id).get()
        if not part_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Part not found"
            )

        part_data = part_doc.to_dict()
        part_data["id"] = part_doc.id
        
        return PartInventory(**part_data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting part inventory {part_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve part inventory"
        )

@router.put("/inventory/parts/{part_id}", response_model=PartInventory)
async def update_part_inventory(
    part_id: str,
    part_data: PartInventoryUpdate,
    current_user = Depends(get_current_user)
):
    """Update a part in inventory."""
    db = get_client()
    if not db:
        raise HTTPException(500, "Database unavailable")

    try:
        # Check if part exists
        part_ref = db.collection("parts_inventory").document(part_id)
        part_doc = part_ref.get()
        if not part_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Part not found"
            )

        # If updating part number, check for duplicates
        if part_data.part_number:
            existing_parts = db.collection("parts_inventory").where("part_number", "==", part_data.part_number).limit(1).get()
            if existing_parts and existing_parts[0].id != part_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A part with this part number already exists"
                )

        # Prepare update data
        update_data = {
            "updated_at": firestore.SERVER_TIMESTAMP
        }
        
        # Update only provided fields
        for field, value in part_data.dict(exclude_unset=True).items():
            update_data[field] = value

        part_ref.update(update_data)

        # Return updated part
        updated_part = part_ref.get().to_dict()
        updated_part["id"] = part_ref.id
        
        return PartInventory(**updated_part)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating part inventory {part_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update part inventory"
        )

@router.delete("/inventory/parts/{part_id}")
async def delete_part_inventory(
    part_id: str,
    current_user = Depends(get_current_user)
):
    """Delete a part from inventory."""
    db = get_client()
    if not db:
        raise HTTPException(500, "Database unavailable")

    try:
        # Check if part exists
        part_doc = db.collection("parts_inventory").document(part_id).get()
        if not part_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Part not found"
            )

        # Delete the part
        db.collection("parts_inventory").document(part_id).delete()

        return {"message": "Part deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting part inventory {part_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete part inventory"
        )

@router.post("/inventory/parts/{part_id}/adjust", response_model=PartInventory)
async def adjust_part_quantity(
    part_id: str,
    adjustment: dict,
    current_user = Depends(get_current_user)
):
    """Adjust part quantity (for receiving orders, using parts, etc.)."""
    db = get_client()
    if not db:
        raise HTTPException(500, "Database unavailable")

    try:
        quantity_change = adjustment.get("quantity_change", 0)
        reason = adjustment.get("reason", "Manual adjustment")
        
        if quantity_change == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quantity change must be non-zero"
            )

        # Use transaction to ensure consistency
        @firestore.transactional
        def adjust_quantity_txn(transaction: firestore.Transaction):
            part_ref = db.collection("parts_inventory").document(part_id)
            part_doc = part_ref.get(transaction=transaction)
            
            if not part_doc.exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Part not found"
                )

            current_data = part_doc.to_dict()
            current_quantity = current_data.get("quantity_on_hand", 0)
            new_quantity = current_quantity + quantity_change

            if new_quantity < 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot adjust quantity by {quantity_change}. Current quantity: {current_quantity}"
                )

            # Update the quantity
            update_data = {
                "quantity_on_hand": new_quantity,
                "updated_at": firestore.SERVER_TIMESTAMP
            }
            
            # Update last_ordered date if this is a positive adjustment (receiving stock)
            if quantity_change > 0:
                update_data["last_ordered"] = firestore.SERVER_TIMESTAMP

            transaction.update(part_ref, update_data)
            
            return new_quantity

        # Execute transaction
        new_quantity = adjust_quantity_txn(db.transaction())

        # Return updated part
        updated_part = db.collection("parts_inventory").document(part_id).get().to_dict()
        updated_part["id"] = part_id
        
        return PartInventory(**updated_part)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adjusting part quantity {part_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to adjust part quantity"
        )

@router.get("/inventory/parts/low-stock", response_model=List[PartInventory])
async def get_low_stock_parts(current_user = Depends(get_current_user)):
    """Get parts that are below their minimum stock level."""
    db = get_client()
    if not db:
        raise HTTPException(500, "Database unavailable")

    try:
        # Get all parts with minimum stock level defined
        parts_docs = db.collection("parts_inventory").where("minimum_stock_level", ">", 0).get()
        
        low_stock_parts = []
        for doc in parts_docs:
            part_data = doc.to_dict()
            part_data["id"] = doc.id
            
            # Check if current quantity is below minimum
            current_qty = part_data.get("quantity_on_hand", 0)
            min_qty = part_data.get("minimum_stock_level", 0)
            
            if current_qty <= min_qty:
                low_stock_parts.append(PartInventory(**part_data))

        return low_stock_parts

    except Exception as e:
        logger.error(f"Error getting low stock parts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve low stock parts"
        )

# Photo upload endpoints
def get_storage_client():
    """Get Firebase Storage client"""
    try:
        return storage.bucket()
    except Exception as e:
        logger.error(f"Error getting storage client: {e}")
        return None

@router.post("/{work_order_id}/photos", response_model=Dict[str, str])
async def upload_work_order_photo(
    work_order_id: str,
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    """Upload a photo for a work order."""
    db = get_client()
    if not db:
        raise HTTPException(500, "Database unavailable")

    # Check if work order exists
    work_order_ref = db.collection("work_orders").document(work_order_id)
    work_order_doc = work_order_ref.get()
    if not work_order_doc.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Work order not found"
        )

    work_order_data = work_order_doc.to_dict()
    
    # Check edit window
    completed_at = work_order_data.get("completed_at")
    if completed_at and not check_edit_window(completed_at):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Work order can only be edited within 7 days of completion"
        )

    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only image files (JPEG, PNG, WebP) are allowed"
        )

    # Validate file size (10MB max)
    max_size = 10 * 1024 * 1024  # 10MB
    file_content = await file.read()
    if len(file_content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size must be less than 10MB"
        )

    try:
        # Get storage bucket
        bucket = get_storage_client()
        if not bucket:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Storage service unavailable"
            )

        # Generate unique filename
        file_extension = Path(file.filename).suffix
        unique_filename = f"work_orders/{work_order_id}/photos/{uuid4()}{file_extension}"
        
        # Upload to Firebase Storage
        blob = bucket.blob(unique_filename)
        blob.upload_from_string(
            file_content,
            content_type=file.content_type
        )
        
        # Make blob publicly accessible
        blob.make_public()
        photo_url = blob.public_url

        # Add photo URL to work order
        current_photos = work_order_data.get("photos", [])
        current_photos.append(photo_url)
        
        work_order_ref.update({
            "photos": current_photos,
            "updated_at": firestore.SERVER_TIMESTAMP
        })

        logger.info(f"Photo uploaded for work order {work_order_id}: {photo_url}")
        
        return {
            "photo_url": photo_url,
            "message": "Photo uploaded successfully"
        }

    except Exception as e:
        logger.error(f"Error uploading photo for work order {work_order_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload photo"
        )

@router.delete("/{work_order_id}/photos/{photo_index}")
async def delete_work_order_photo(
    work_order_id: str,
    photo_index: int,
    current_user = Depends(get_current_user)
):
    """Delete a photo from a work order."""
    db = get_client()
    if not db:
        raise HTTPException(500, "Database unavailable")

    try:
        # Check if work order exists
        work_order_ref = db.collection("work_orders").document(work_order_id)
        work_order_doc = work_order_ref.get()
        if not work_order_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Work order not found"
            )

        work_order_data = work_order_doc.to_dict()
        
        # Check edit window
        completed_at = work_order_data.get("completed_at")
        if completed_at and not check_edit_window(completed_at):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Work order can only be edited within 7 days of completion"
            )

        current_photos = work_order_data.get("photos", [])
        
        # Validate photo index
        if photo_index < 0 or photo_index >= len(current_photos):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Photo not found"
            )

        # Get the photo URL to delete
        photo_url = current_photos[photo_index]
        
        # Remove photo from Firebase Storage
        try:
            bucket = get_storage_client()
            if bucket:
                # Extract blob path from URL
                # Assuming URL format: https://storage.googleapis.com/bucket-name/path
                url_parts = photo_url.split('/')
                if len(url_parts) >= 4:
                    blob_path = '/'.join(url_parts[4:])  # Everything after bucket name
                    blob = bucket.blob(blob_path)
                    blob.delete()
        except Exception as e:
            logger.warning(f"Failed to delete photo from storage: {e}")
            # Continue with database update even if storage deletion fails

        # Remove photo from work order
        current_photos.pop(photo_index)
        
        work_order_ref.update({
            "photos": current_photos,
            "updated_at": firestore.SERVER_TIMESTAMP
        })

        return {"message": "Photo deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting photo from work order {work_order_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete photo"
        )