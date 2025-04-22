from fastapi import APIRouter, HTTPException
from ..models import Service
from ..firestore import get_client

router = APIRouter(prefix="/services", tags=["services"])

@router.get("", response_model=list[Service])
async def list_services():
    db = get_client()
    if not db:
        raise HTTPException(500, "DB unavailable")

    docs = db.collection("services").stream()
    return [Service(id=d.id, **d.to_dict()) for d in docs]
