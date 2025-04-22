#!/bin/bash
# Script to deploy Firestore security rules

# Make sure the Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "Firebase CLI not found. Please install it with:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if we have a firebase.json file, create one if not
if [ ! -f firebase.json ]; then
    echo "Creating firebase.json configuration file..."
    cat > firebase.json << EOF
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
EOF

    # Create empty indexes file if it doesn't exist
    if [ ! -f firestore.indexes.json ]; then
        cat > firestore.indexes.json << EOF
{
  "indexes": [
    {
      "collectionGroup": "bookings",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "customer_email", "order": "ASCENDING" },
        { "fieldPath": "slot_start", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "bookings",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "mechanic_id", "order": "ASCENDING" },
        { "fieldPath": "slot_start", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
EOF
    fi
fi

# Verify firestore.rules exists
if [ ! -f firestore.rules ]; then
    echo "Error: firestore.rules file not found."
    exit 1
fi

# Check if user is logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    echo "You're not logged in to Firebase. Please login first:"
    firebase login
fi

# Deploy the rules
echo "Deploying Firestore security rules..."
firebase deploy --only firestore:rules

# Deploy indexes
echo "Deploying Firestore indexes..."
firebase deploy --only firestore:indexes

echo "Deployment complete!" 