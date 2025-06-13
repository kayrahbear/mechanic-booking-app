"""
Secret Manager utility for accessing GCP secrets.
"""
import os
import logging
from typing import Optional
from google.cloud import secretmanager
from functools import lru_cache

logger = logging.getLogger(__name__)

# Initialize the Secret Manager client
@lru_cache(maxsize=1)
def get_secret_manager_client():
    """Get Secret Manager client with caching."""
    return secretmanager.SecretManagerServiceClient()

@lru_cache(maxsize=32)
def get_secret(secret_name: str, project_id: Optional[str] = None) -> str:
    """
    Retrieve a secret from Google Cloud Secret Manager.
    
    Args:
        secret_name: Name of the secret to retrieve
        project_id: GCP project ID (defaults to GOOGLE_CLOUD_PROJECT env var)
        
    Returns:
        Secret value as string
        
    Raises:
        Exception: If secret cannot be retrieved
    """
    if not project_id:
        project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
        if not project_id:
            raise ValueError("GOOGLE_CLOUD_PROJECT environment variable not set")
    
    try:
        client = get_secret_manager_client()
        name = f"projects/{project_id}/secrets/{secret_name}/versions/latest"
        
        logger.debug(f"Retrieving secret: {secret_name}")
        response = client.access_secret_version(request={"name": name})
        
        secret_value = response.payload.data.decode("UTF-8")
        logger.debug(f"Successfully retrieved secret: {secret_name}")
        
        return secret_value
        
    except Exception as e:
        logger.error(f"Failed to retrieve secret {secret_name}: {str(e)}")
        raise Exception(f"Failed to retrieve secret {secret_name}: {str(e)}")

def get_secret_or_env(secret_name: str, env_var_name: str, default: Optional[str] = None) -> Optional[str]:
    """
    Get secret from Secret Manager, fallback to environment variable, then default.
    
    This allows for graceful fallback during development or when secrets aren't set up yet.
    
    Args:
        secret_name: Name of the secret in Secret Manager
        env_var_name: Name of the environment variable to fall back to
        default: Default value if neither secret nor env var is available
        
    Returns:
        Secret value, environment variable value, or default
    """
    try:
        # Try Secret Manager first
        value = get_secret(secret_name)
        logger.info(f"Retrieved {secret_name} from Google Cloud Secret Manager")
        return value
    except Exception as e:
        logger.warning(f"Could not retrieve secret {secret_name}: {str(e)}")
        
        # Fall back to environment variable
        env_value = os.environ.get(env_var_name)
        if env_value:
            logger.info(f"Using environment variable {env_var_name} as fallback for {secret_name}")
            return env_value
        
        # Use default if provided
        if default is not None:
            logger.info(f"Using default value for {secret_name}")
            return default
        
        logger.error(f"No value found for {secret_name} in Secret Manager, environment, or default")
        return None