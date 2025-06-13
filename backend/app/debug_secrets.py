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
    import subprocess
    import json
    
    try:
        project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
        if not project_id:
            return {"error": "GOOGLE_CLOUD_PROJECT not set"}
        
        # Get the current service account being used
        try:
            result = subprocess.run(['gcloud', 'auth', 'list', '--format=json'], 
                                  capture_output=True, text=True, timeout=10)
            auth_info = json.loads(result.stdout) if result.stdout else []
        except Exception as auth_e:
            auth_info = f"Error getting auth info: {str(auth_e)}"
        
        # Get metadata about the service account
        try:
            result = subprocess.run(['curl', '-H', 'Metadata-Flavor: Google', 
                                   'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email'],
                                  capture_output=True, text=True, timeout=10)
            metadata_sa = result.stdout.strip() if result.stdout else "No metadata SA found"
        except Exception as meta_e:
            metadata_sa = f"Error getting metadata SA: {str(meta_e)}"
        
        # Try to access a secret
        client = secretmanager.SecretManagerServiceClient()
        secret_name = f"projects/{project_id}/secrets/GOOGLE_CLIENT_ID/versions/latest"
        
        try:
            response = client.access_secret_version(request={"name": secret_name})
            secret_value = response.payload.data.decode("UTF-8")
            secret_success = True
            secret_error = None
        except Exception as secret_e:
            secret_success = False
            secret_error = str(secret_e)
            secret_value = None
        
        return {
            "success": secret_success,
            "error": secret_error,
            "project_id": project_id,
            "auth_info": auth_info,
            "metadata_service_account": metadata_sa,
            "secret_length": len(secret_value) if secret_value else 0,
            "environment_vars": {
                "GOOGLE_APPLICATION_CREDENTIALS": os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"),
                "GOOGLE_CLOUD_PROJECT": os.environ.get("GOOGLE_CLOUD_PROJECT")
            }
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "project_id": project_id if 'project_id' in locals() else None
        }