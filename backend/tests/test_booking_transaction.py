import pytest
from fastapi import HTTPException
from datetime import datetime, timedelta
import asyncio
from google.cloud import firestore
from backend.app.models import BookingCreate, BookingOut
from backend.app.routers.bookings import create_booking_with_transaction, SlotUnavailableError, ServiceNotFoundError, DayNotPublishedError

pytestmark = pytest.mark.asyncio

async def test_successful_booking_creation(clean_firestore, sample_data):
    """Test successful booking creation transaction."""
    # Arrange
    db = clean_firestore
    today = sample_data["today"]
    service_id = sample_data["service_id"]
    available_slot = sample_data["available_slot"]
    
    # Create a datetime object for today's available slot
    today_date = datetime.fromisoformat(today)
    time_parts = available_slot.split(":")
    slot_start = datetime(
        today_date.year, today_date.month, today_date.day,
        int(time_parts[0]), int(time_parts[1])
    )
    
    # Create payload
    booking_payload = BookingCreate(
        service_id=service_id,
        slot_start=slot_start,
        customer_name="Test Customer",
        customer_email="test@example.com",
        customer_phone="555-123-4567",
        notes="Test booking"
    )
    
    # Act
    booking = await create_booking_with_transaction(db, booking_payload)
    
    # Assert
    assert booking.id is not None
    assert booking.service_id == service_id
    assert booking.slot_start == slot_start
    assert booking.status == "confirmed"
    
    # Verify slot is marked as booked
    availability_doc = db.collection("availability").document(today).get()
    slots = availability_doc.to_dict()["slots"]
    assert slots[available_slot] == "booked"
    
    # Verify booking is stored in Firestore
    booking_doc = db.collection("bookings").document(booking.id).get()
    assert booking_doc.exists
    booking_data = booking_doc.to_dict()
    assert booking_data["customer_email"] == "test@example.com"
    assert booking_data["service_name"] != "" # Should be populated

async def test_booking_unavailable_slot(clean_firestore, sample_data):
    """Test booking an already booked slot fails the transaction."""
    # Arrange
    db = clean_firestore
    today = sample_data["today"]
    service_id = sample_data["service_id"]
    booked_slot = sample_data["booked_slot"]
    
    # Create a datetime object for today's booked slot
    today_date = datetime.fromisoformat(today)
    time_parts = booked_slot.split(":")
    slot_start = datetime(
        today_date.year, today_date.month, today_date.day,
        int(time_parts[0]), int(time_parts[1])
    )
    
    # Create payload for already booked slot
    booking_payload = BookingCreate(
        service_id=service_id,
        slot_start=slot_start,
        customer_name="Test Customer",
        customer_email="test@example.com",
        customer_phone="555-123-4567"
    )
    
    # Act & Assert
    with pytest.raises(SlotUnavailableError):
        await create_booking_with_transaction(db, booking_payload)

async def test_booking_nonexistent_service(clean_firestore, sample_data):
    """Test booking with a non-existent service ID."""
    # Arrange
    db = clean_firestore
    today = sample_data["today"]
    available_slot = sample_data["available_slot"]
    
    # Create a datetime object for today's available slot
    today_date = datetime.fromisoformat(today)
    time_parts = available_slot.split(":")
    slot_start = datetime(
        today_date.year, today_date.month, today_date.day,
        int(time_parts[0]), int(time_parts[1])
    )
    
    # Create payload with non-existent service
    booking_payload = BookingCreate(
        service_id="nonexistent-service",
        slot_start=slot_start,
        customer_name="Test Customer",
        customer_email="test@example.com",
        customer_phone="555-123-4567"
    )
    
    # Act & Assert
    with pytest.raises(ServiceNotFoundError):
        await create_booking_with_transaction(db, booking_payload)

async def test_booking_nonexistent_day(clean_firestore, sample_data):
    """Test booking on a day without published availability."""
    # Arrange
    db = clean_firestore
    service_id = sample_data["service_id"]
    available_slot = sample_data["available_slot"]
    
    # Create a datetime object for tomorrow (which doesn't have availability)
    tomorrow = (datetime.now() + timedelta(days=1)).date()
    time_parts = available_slot.split(":")
    slot_start = datetime(
        tomorrow.year, tomorrow.month, tomorrow.day,
        int(time_parts[0]), int(time_parts[1])
    )
    
    # Create payload for non-existent day
    booking_payload = BookingCreate(
        service_id=service_id,
        slot_start=slot_start,
        customer_name="Test Customer",
        customer_email="test@example.com",
        customer_phone="555-123-4567"
    )
    
    # Act & Assert
    with pytest.raises(DayNotPublishedError):
        await create_booking_with_transaction(db, booking_payload)

async def test_concurrent_bookings_same_slot(clean_firestore, sample_data):
    """Test that concurrent bookings for the same slot are handled correctly."""
    # Arrange
    db = clean_firestore
    today = sample_data["today"]
    service_id = sample_data["service_id"]
    available_slot = sample_data["available_slot"]
    
    # Create a datetime object for today's available slot
    today_date = datetime.fromisoformat(today)
    time_parts = available_slot.split(":")
    slot_start = datetime(
        today_date.year, today_date.month, today_date.day,
        int(time_parts[0]), int(time_parts[1])
    )
    
    # Create identical booking payloads for two concurrent users
    booking_payload1 = BookingCreate(
        service_id=service_id,
        slot_start=slot_start,
        customer_name="Customer 1",
        customer_email="customer1@example.com",
        customer_phone="555-111-1111"
    )
    
    booking_payload2 = BookingCreate(
        service_id=service_id,
        slot_start=slot_start,
        customer_name="Customer 2",
        customer_email="customer2@example.com",
        customer_phone="555-222-2222"
    )
    
    # Act - Run both bookings concurrently
    results = {"success": 0, "failure": 0}
    
    async def try_booking(payload, delay=0):
        await asyncio.sleep(delay)  # Small delay to simulate concurrent requests
        try:
            booking = await create_booking_with_transaction(db, payload)
            results["success"] += 1
            return booking
        except SlotUnavailableError:
            results["failure"] += 1
            return None
    
    # Run the bookings concurrently
    booking_tasks = [
        try_booking(booking_payload1),
        try_booking(booking_payload2, 0.1)  # Small delay for the second booking
    ]
    
    bookings = await asyncio.gather(*booking_tasks, return_exceptions=True)
    
    # Assert - One should succeed, one should fail
    assert results["success"] == 1
    assert results["failure"] == 1
    
    # Check that the slot is now booked
    availability_doc = db.collection("availability").document(today).get()
    slots = availability_doc.to_dict()["slots"]
    assert slots[available_slot] == "booked"
    
    # Verify only one booking was created
    booking_query = db.collection("bookings").where(
        "slot_start", "==", slot_start
    ).stream()
    bookings = list(booking_query)
    assert len(bookings) == 1 