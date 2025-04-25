from fastapi import APIRouter, HTTPException
from ..models import Service
from ..firestore import get_client
import logging # Import logging

router = APIRouter(prefix="/services", tags=["services"])
logger = logging.getLogger(__name__) # Setup logger

@router.get("", response_model=list[Service])
async def list_services():
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
