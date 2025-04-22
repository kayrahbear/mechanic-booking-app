#!/bin/bash
# Script to run tests with Firebase emulators

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "Firebase CLI not found. Please install it with:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Ensure we have a firebase.json file
if [ ! -f firebase.json ]; then
    echo "Creating firebase.json for testing..."
    cat > firebase.json << EOF
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "emulators": {
    "firestore": {
      "port": 8080
    },
    "auth": {
      "port": 9099
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
EOF
fi

# Function to kill running emulator processes when the script exits
cleanup() {
    echo "Cleaning up emulator processes..."
    kill $(lsof -t -i:8080) &>/dev/null || true
    kill $(lsof -t -i:9099) &>/dev/null || true
    kill $(lsof -t -i:4000) &>/dev/null || true
    exit
}

# Set up cleanup on script exit
trap cleanup EXIT

# Start Firebase emulators in the background
echo "Starting Firebase emulators..."
firebase emulators:start --only firestore,auth --project test-project &

# Wait for emulators to start
echo "Waiting for emulators to start..."
sleep 5

# Run the tests
echo "Running tests..."

# Check if we're already in the backend directory
if [[ $(basename $(pwd)) != "backend" ]]; then
    cd backend
fi

# Set environment variables for emulators
export FIRESTORE_EMULATOR_HOST="localhost:8080"
export FIREBASE_AUTH_EMULATOR_HOST="localhost:9099"

# Add the parent directory to the Python path
export PYTHONPATH=$PYTHONPATH:$(dirname $(pwd))

python3 -m pytest tests/test_booking_transaction.py -v

# Keep emulators running if requested
if [ "$1" == "--keep" ]; then
    echo "Emulators will continue running. Press Ctrl+C to stop."
    wait
fi 