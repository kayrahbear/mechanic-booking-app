import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta, date
from unittest.mock import patch, MagicMock
import json
from google.cloud import firestore

from backend.app.main import app
from backend.app.models import MechanicSchedule, DaySchedule


client = TestClient(app)


@pytest.fixture
def mock_scheduler_auth():
    """Mock Google Cloud Scheduler authentication."""
    return {"User-Agent": "Google-Cloud-Scheduler", "X-CloudScheduler": "true"}


@pytest.fixture
def setup_mechanic_schedules(clean_firestore):
    """Set up active mechanics with different schedules."""
    db = clean_firestore
    
    # Create test mechanics
    mechanics = []
    
    # Mechanic with full schedule
    mechanic1_ref = db.collection("mechanics").document("mechanic1")
    mechanic1_ref.set({
        "name": "Full Schedule Mechanic",
        "email": "full@example.com",
        "specialties": ["oil-change", "tire-rotation"],
        "schedule": {
            "monday": {"start": "09:00", "end": "17:00"},
            "tuesday": {"start": "09:00", "end": "17:00"},
            "wednesday": {"start": "09:00", "end": "17:00"},
            "thursday": {"start": "09:00", "end": "17:00"},
            "friday": {"start": "09:00", "end": "17:00"},
            "saturday": None,
            "sunday": None
        },
        "active": True,
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP
    })
    mechanics.append(mechanic1_ref.id)
    
    # Mechanic with partial schedule (only works Tue/Thu)
    mechanic2_ref = db.collection("mechanics").document("mechanic2")
    mechanic2_ref.set({
        "name": "Part-Time Mechanic",
        "email": "part@example.com",
        "specialties": ["brake-service"],
        "schedule": {
            "monday": None,
            "tuesday": {"start": "10:00", "end": "15:00"},
            "wednesday": None,
            "thursday": {"start": "10:00", "end": "15:00"},
            "friday": None,
            "saturday": None,
            "sunday": None
        },
        "active": True,
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP
    })
    mechanics.append(mechanic2_ref.id)
    
    # Create one inactive mechanic (should be ignored)
    mechanic3_ref = db.collection("mechanics").document("mechanic3")
    mechanic3_ref.set({
        "name": "Inactive Mechanic",
        "email": "inactive@example.com",
        "specialties": ["oil-change"],
        "schedule": {
            "monday": {"start": "09:00", "end": "17:00"},
            "tuesday": {"start": "09:00", "end": "17:00"},
            "wednesday": {"start": "09:00", "end": "17:00"},
            "thursday": {"start": "09:00", "end": "17:00"},
            "friday": {"start": "09:00", "end": "17:00"},
            "saturday": None,
            "sunday": None
        },
        "active": False,
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP
    })
    
    # Return the IDs and details for assertions
    return mechanics


def get_next_monday():
    """Helper to get the next Monday's date."""
    today = datetime.utcnow().date()
    days_ahead = (7 - today.weekday()) % 7
    if days_ahead == 0:
        days_ahead = 7  # Skip current Monday and go to next one
    return today + timedelta(days=days_ahead)


def test_seed_availability_dry_run(setup_mechanic_schedules, mock_scheduler_auth, clean_firestore):
    """Test the availability seed endpoint in dry run mode."""
    next_monday = get_next_monday()
    
    # Call the endpoint with Cloud Scheduler auth headers and dry_run=true
    response = client.post(
        "/availability/seed",
        json={"week_start": next_monday.isoformat(), "dry_run": True},
        headers=mock_scheduler_auth
    )
    
    assert response.status_code == 202
    data = response.json()
    
    # Verify response format
    assert data["week_start"] == next_monday.isoformat()
    assert data["days"] == 7
    assert data["dry_run"] is True
    
    # No documents should have been created in Firestore
    db = clean_firestore
    for i in range(7):
        day = next_monday + timedelta(days=i)
        doc = db.collection("availability").document(day.isoformat()).get()
        assert not doc.exists


def test_seed_availability_creates_docs(setup_mechanic_schedules, mock_scheduler_auth, clean_firestore):
    """Test the availability seed endpoint creates/updates docs."""
    active_mechanic_ids = setup_mechanic_schedules
    next_monday = get_next_monday()
    
    # Call the endpoint with Cloud Scheduler auth headers
    response = client.post(
        "/availability/seed",
        json={"week_start": next_monday.isoformat(), "dry_run": False},
        headers=mock_scheduler_auth
    )
    
    assert response.status_code == 202
    data = response.json()
    
    # Verify created and updated counts
    assert data["created"] > 0
    
    # Verify documents were created in Firestore for each weekday
    db = clean_firestore
    weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday"]
    
    # Verify Monday (both mechanics should work)
    monday_doc = db.collection("availability").document(next_monday.isoformat()).get()
    assert monday_doc.exists
    monday_data = monday_doc.to_dict()
    
    # Full-time mechanic works Monday
    assert "mechanic1" in monday_data["mechanics"]
    # Part-time mechanic doesn't work Monday
    assert "mechanic2" not in monday_data["mechanics"]
    
    # Check slots for a specific day (Tuesday - both mechanics work)
    tuesday = next_monday + timedelta(days=1)
    tuesday_doc = db.collection("availability").document(tuesday.isoformat()).get()
    assert tuesday_doc.exists
    tuesday_data = tuesday_doc.to_dict()
    
    # Both mechanics work Tuesday
    assert "mechanic1" in tuesday_data["mechanics"]
    assert "mechanic2" in tuesday_data["mechanics"]
    
    # Check slot data - mechanic1 has 9-17, mechanic2 has 10-15
    assert "09:00" in tuesday_data["slots"]
    assert tuesday_data["slots"]["09:00"] == "free"
    assert "14:30" in tuesday_data["slots"]
    assert tuesday_data["slots"]["14:30"] == "free"
    
    # Weekend days should have no mechanic availability
    sunday = next_monday + timedelta(days=6)
    sunday_doc = db.collection("availability").document(sunday.isoformat()).get()
    if sunday_doc.exists:
        sunday_data = sunday_doc.to_dict()
        assert len(sunday_data.get("slots", {})) == 0


def test_seed_availability_idempotent(setup_mechanic_schedules, mock_scheduler_auth, clean_firestore):
    """Test that seeding is idempotent (can be run multiple times safely)."""
    next_monday = get_next_monday()
    
    # Call the endpoint first time
    response1 = client.post(
        "/availability/seed",
        json={"week_start": next_monday.isoformat(), "dry_run": False},
        headers=mock_scheduler_auth
    )
    
    assert response1.status_code == 202
    data1 = response1.json()
    assert data1["created"] > 0
    
    # Call the endpoint second time with same data
    response2 = client.post(
        "/availability/seed",
        json={"week_start": next_monday.isoformat(), "dry_run": False},
        headers=mock_scheduler_auth
    )
    
    assert response2.status_code == 202
    data2 = response2.json()
    
    # No new documents should be created, just updated
    assert data2["created"] == 0
    assert data2["updated"] > 0


def test_seed_availability_respects_booked_slots(setup_mechanic_schedules, mock_scheduler_auth, clean_firestore):
    """Test that seeding doesn't overwrite booked slots."""
    db = clean_firestore
    next_monday = get_next_monday()
    
    # First create a document with a booked slot
    monday_ref = db.collection("availability").document(next_monday.isoformat())
    monday_ref.set({
        "day": next_monday.isoformat(),
        "slots": {
            "09:00": "free",
            "09:30": "booked",  # This slot is already booked
            "10:00": "free"
        },
        "mechanics": {},
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP
    })
    
    # Now seed availability
    response = client.post(
        "/availability/seed",
        json={"week_start": next_monday.isoformat(), "dry_run": False},
        headers=mock_scheduler_auth
    )
    
    assert response.status_code == 202
    
    # Verify the booked slot wasn't overwritten
    updated_doc = db.collection("availability").document(next_monday.isoformat()).get()
    updated_data = updated_doc.to_dict()
    
    assert updated_data["slots"]["09:30"] == "booked" 