from functools import lru_cache
from google.cloud import firestore
from google.auth.exceptions import DefaultCredentialsError
from .config import settings

@lru_cache
def get_client() -> firestore.Client:
    try:
        return firestore.Client(project=settings.project_id or None)
    except DefaultCredentialsError as err:
        # In local dev without creds, let callers handle None
        print("Firestore client init failed:", err)
        return None
