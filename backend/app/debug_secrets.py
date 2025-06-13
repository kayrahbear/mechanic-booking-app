"""
Debug endpoint to test secret manager access
"""
import os
import logging
from fastapi import APIRouter
from google.cloud import secretmanager

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/debug/secrets")
async def debug_secrets():
    """Debug endpoint to test secret manager access"""
    try:
        project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
        if not project_id:
            return {"error": "GOOGLE_CLOUD_PROJECT not set"}
        
        client = secretmanager.SecretManagerServiceClient()
        
        # Test accessing SERVICE_AREA_ZIPS
        secret_name = f"projects/{project_id}/secrets/SERVICE_AREA_ZIPS/versions/latest"
        
        response = client.access_secret_version(request={"name": secret_name})
        secret_value = response.payload.data.decode("UTF-8")
        
        return {
            "success": True,
            "project_id": project_id,
            "secret_length": len(secret_value),
            "secret_preview": secret_value[:50] + "..." if len(secret_value) > 50 else secret_value
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "project_id": project_id
        }