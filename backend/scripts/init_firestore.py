#!/usr/bin/env python
"""
Initialize Firestore with sample data for the mechanic scheduling app.
This script creates collections and sample documents for:
- services
- mechanics
- availability
- users
"""

import os
import sys
from datetime import datetime, timedelta
from google.cloud import firestore
import firebase_admin
from firebase_admin import credentials, auth

# Add the app directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.config import settings

# Initialize Firebase Admin SDK (for user creation)
try:
    firebase_admin.initialize_app()
except ValueError:
    # Already initialized
    pass

# Initialize Firestore client
db = firestore.Client(project=settings.project_id)
print(f"Connected to Firestore project: {settings.project_id}")

# Helper to get a timestamp with specified minutes
def minutes_from_now(minutes):
    return datetime.now() + timedelta(minutes=minutes)

# Batch operations for better performance
batch = db.batch()

# 1. Create Services
service_data = [
    {
        "name": "Oil Change",
        "minutes": 30,
        "description": "Standard oil change with synthetic oil",
        "price": 59.99,
        "active": True,
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP
    },
    {
        "name": "Tire Rotation",
        "minutes": 45,
        "description": "Rotate and balance all 4 tires",
        "price": 39.99,
        "active": True,
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP
    },
    {
        "name": "Brake Inspection",
        "minutes": 60,
        "description": "Comprehensive brake system inspection",
        "price": 49.99,
        "active": True,
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP
    },
    {
        "name": "Full Service",
        "minutes": 120,
        "description": "Complete vehicle inspection and maintenance",
        "price": 149.99,
        "active": True,
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP
    }
]

print("Creating services collection...")
for service in service_data:
    service_ref = db.collection("services").document()
    batch.set(service_ref, service)
    print(f"Added service: {service['name']} (ID: {service_ref.id})")

# 2. Create Mechanic (single mechanic for the business)
mechanic_data = [
    {
        "name": "John Smith",
        "email": "john.smith@example.com",
        # Removed specialties field as there's only one mechanic who can perform all services
        "schedule": {
            "monday": {"start": "08:00", "end": "17:00"},
            "tuesday": {"start": "08:00", "end": "17:00"},
            "wednesday": {"start": "08:00", "end": "17:00"},
            "thursday": {"start": "08:00", "end": "17:00"},
            "friday": {"start": "08:00", "end": "17:00"},
            "saturday": None,
            "sunday": None
        },
        "active": True,
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP
    }
]

print("\nCreating mechanics collection...")
for mechanic in mechanic_data:
    mechanic_ref = db.collection("mechanics").document()
    batch.set(mechanic_ref, mechanic)
    print(f"Added mechanic: {mechanic['name']} (ID: {mechanic_ref.id})")

# 3. Create Availability for the next 7 days
today = datetime.now().date()
print("\nCreating availability for the next 7 days...")

for day_offset in range(7):
    day = today + timedelta(days=day_offset)
    day_iso = day.isoformat()
    
    # Create slots from 8:00 to 17:00 (30 min intervals)
    slots = {}
    for hour in range(8, 17):
        for minute in [0, 30]:
            time_slot = f"{hour:02d}:{minute:02d}"
            slots[time_slot] = "free"
    
    availability_data = {
        "day": day_iso,
        "slots": slots,
        "mechanics": {}, # Will be filled with mechanic IDs
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP
    }
    
    availability_ref = db.collection("availability").document(day_iso)
    batch.set(availability_ref, availability_data)
    print(f"Added availability for: {day_iso} with {len(slots)} slots")

# 4. Create sample users
user_data = [
    {
        "email": "admin@auto-mech-booking.com",
        "name": "Admin User",
        "phone": "555-123-4567",
        "role": "admin",
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP
    },
    {
        "email": "customer@example.com",
        "name": "Test Customer",
        "phone": "555-987-6543",
        "role": "customer",
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP
    }
]

print("\nCreating users collection...")
for user in user_data:
    user_email = user["email"]
    
    # Check if user exists in Firebase Auth
    try:
        firebase_user = auth.get_user_by_email(user_email)
        user_id = firebase_user.uid
        print(f"User already exists: {user_email} (ID: {user_id})")
    except:
        # Create user in Firebase Auth
        try:
            firebase_user = auth.create_user(
                email=user_email,
                password="password123",  # Temporary password
                display_name=user["name"]
            )
            user_id = firebase_user.uid
            print(f"Created user in Firebase Auth: {user_email} (ID: {user_id})")
            
            # Set custom claims for roles
            if user["role"] == "admin":
                auth.set_custom_user_claims(user_id, {"admin": True})
        except Exception as e:
            print(f"Error creating Firebase user: {e}")
            user_id = f"mock-{user_email}"  # Fallback for testing
    
    # Create user document in Firestore
    user_ref = db.collection("users").document(user_id)
    batch.set(user_ref, user)
    print(f"Added user to Firestore: {user['name']} ({user['role']})")

# Commit all changes
print("\nCommitting all changes to Firestore...")
batch.commit()
print("Sample data initialization complete!")
