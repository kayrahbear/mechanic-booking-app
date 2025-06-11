#!/usr/bin/env python
"""
Update mechanic specialties in Firestore.
This script assigns service IDs to mechanics' specialties arrays.
"""

import os
import sys
import random
from google.cloud import firestore

# Add the app directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.config import settings

# Initialize Firestore client
db = firestore.Client(project=settings.project_id)
print(f"Connected to Firestore project: {settings.project_id}")

def update_mechanic_specialties():
    # Get all services
    services = list(db.collection("services").stream())
    service_ids = [service.id for service in services]
    
    if not service_ids:
        print("No services found in Firestore.")
        return
    
    print(f"Found {len(service_ids)} services:")
    for service in services:
        print(f"- {service.id}: {service.to_dict().get('name')}")
    
    # Get all mechanics
    mechanics = list(db.collection("mechanics").stream())
    
    if not mechanics:
        print("No mechanics found in Firestore.")
        return
    
    print(f"\nFound {len(mechanics)} mechanics:")
    for mechanic in mechanics:
        print(f"- {mechanic.id}: {mechanic.to_dict().get('name')}")
    
    # Update each mechanic with random specialties
    batch = db.batch()
    updated_count = 0
    
    for mechanic in mechanics:
        # Assign 2-4 random specialties to each mechanic
        num_specialties = random.randint(2, min(4, len(service_ids)))
        specialties = random.sample(service_ids, num_specialties)
        
        mechanic_ref = db.collection("mechanics").document(mechanic.id)
        batch.update(mechanic_ref, {"specialties": specialties})
        
        mechanic_name = mechanic.to_dict().get("name")
        print(f"\nUpdating {mechanic_name} with specialties:")
        for service_id in specialties:
            service_name = next((s.to_dict().get("name") for s in services if s.id == service_id), "Unknown")
            print(f"- {service_id}: {service_name}")
        
        updated_count += 1
    
    # Commit the batch
    batch.commit()
    print(f"\nSuccessfully updated {updated_count} mechanics with specialties.")

if __name__ == "__main__":
    update_mechanic_specialties()
