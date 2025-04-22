import os
import pytest
import firebase_admin
from firebase_admin import credentials, auth
from google.cloud import firestore
from datetime import datetime, timedelta
import uuid

# Set environment variables for Firestore emulator
os.environ["FIRESTORE_EMULATOR_HOST"] = "localhost:8080"
os.environ["FIREBASE_AUTH_EMULATOR_HOST"] = "localhost:9099"

@pytest.fixture(scope="session")
def firebase_app():
    """Initialize Firebase app for testing."""
    try:
        # Try to initialize, if it fails it may already be initialized
        app = firebase_admin.initialize_app(name="test")
        return app
    except ValueError:
        # Return the default app if already initialized
        return firebase_admin.get_app(name="test")

@pytest.fixture(scope="session")
def firestore_client():
    """Get a Firestore client connected to the emulator."""
    client = firestore.Client(project="test-project")
    return client

@pytest.fixture(scope="function")
def clean_firestore(firestore_client):
    """Clean up Firestore before and after each test."""
    # Delete all collections before the test
    cleanup_firestore(firestore_client)
    
    yield firestore_client
    
    # Delete all collections after the test
    cleanup_firestore(firestore_client)

def cleanup_firestore(client):
    """Helper function to delete all collections."""
    collections = client.collections()
    for collection in collections:
        delete_collection(client, collection.id)

def delete_collection(client, collection_id, batch_size=100):
    """Delete a collection using batches."""
    collection_ref = client.collection(collection_id)
    docs = collection_ref.limit(batch_size).stream()
    deleted = 0

    for doc in docs:
        doc.reference.delete()
        deleted += 1

    if deleted >= batch_size:
        # If we've reached the batch size, there might be more documents
        return delete_collection(client, collection_id, batch_size)

@pytest.fixture(scope="function")
def sample_data(clean_firestore):
    """Populate Firestore with sample data for testing."""
    db = clean_firestore
    
    # Create a service
    service_ref = db.collection("services").document("test-service")
    service_ref.set({
        "name": "Test Service",
        "minutes": 30,
        "description": "Service for testing",
        "price": 50.0,
        "active": True,
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP
    })
    
    # Create availability for today
    today = datetime.now().date().isoformat()
    slots = {}
    for hour in range(8, 17):
        for minute in [0, 30]:
            time_slot = f"{hour:02d}:{minute:02d}"
            slots[time_slot] = "free"
    
    availability_ref = db.collection("availability").document(today)
    availability_ref.set({
        "day": today,
        "slots": slots,
        "mechanics": {},
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP
    })
    
    # Mark one slot as already booked
    booked_slot = "13:00"
    availability_ref.update({
        f"slots.{booked_slot}": "booked"
    })
    
    # Create a test user in Firestore
    user_id = f"test-user-{uuid.uuid4()}"
    user_ref = db.collection("users").document(user_id)
    user_ref.set({
        "email": "test@example.com",
        "name": "Test User",
        "role": "customer",
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP
    })
    
    # Return data for tests to use
    return {
        "service_id": service_ref.id,
        "today": today,
        "available_slot": "09:00",
        "booked_slot": booked_slot,
        "user_id": user_id,
        "user_email": "test@example.com"
    }

@pytest.fixture
def mock_auth_user():
    """Mock the get_current_user dependency."""
    from backend.app.auth import User
    
    return User(
        uid="test-user-id",
        email="test@example.com",
        name="Test User",
        role="customer",
        is_admin=False
    )

@pytest.fixture
def mock_admin_user():
    """Mock an admin user."""
    from backend.app.auth import User
    
    return User(
        uid="admin-user-id",
        email="admin@example.com",
        name="Admin User",
        role="admin",
        is_admin=True
    ) 