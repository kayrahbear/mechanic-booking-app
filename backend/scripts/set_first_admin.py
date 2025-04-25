import sys
import os
import argparse
from google.cloud import firestore # Although not used directly, ensures SDK is available
import firebase_admin
from firebase_admin import credentials, auth

# --- Configuration ---
# Path to service account key (used only if GOOGLE_APPLICATION_CREDENTIALS env var is set
# and points to a valid file, or if ADC fails).
SERVICE_ACCOUNT_KEY_ENV_VAR = "GOOGLE_APPLICATION_CREDENTIALS"
# --- End Configuration ---

def initialize_firebase_admin():
    """Initializes the Firebase Admin SDK, prioritizing ADC."""
    cred = None
    try:
        # 1. Try Application Default Credentials first
        cred = credentials.ApplicationDefault()
        print("Attempting to initialize Firebase Admin with Application Default Credentials.")
        firebase_admin.initialize_app(cred)
        print("Firebase Admin SDK initialized successfully using ADC.")
        return # Success
    except Exception as e_adc:
        print(f"ADC Initialization failed: {e_adc}")
        # ADC failed, try explicit service account key from env var

    # 2. Try explicit service account key from environment variable
    key_path = os.environ.get(SERVICE_ACCOUNT_KEY_ENV_VAR)
    if key_path and os.path.exists(key_path):
        try:
            cred = credentials.Certificate(key_path)
            print(f"Initializing Firebase Admin with key from env var: {key_path}")
            firebase_admin.initialize_app(cred)
            print("Firebase Admin SDK initialized successfully using Service Account Key.")
            return # Success
        except Exception as e_key:
            print(f"Service Account Key Initialization failed: {e_key}")
    elif key_path:
        print(f"Environment variable {SERVICE_ACCOUNT_KEY_ENV_VAR} points to non-existent file: {key_path}")
    else:
        print(f"Environment variable {SERVICE_ACCOUNT_KEY_ENV_VAR} not set.")

    # 3. If both methods failed
    print("\nError: Could not initialize Firebase Admin SDK.")
    print("Please ensure credentials are configured correctly:")
    print("- Run `gcloud auth application-default login` for ADC, OR")
    print(f"- Set the {SERVICE_ACCOUNT_KEY_ENV_VAR} environment variable to a valid service account key file path.")
    sys.exit(1)

def set_admin_claims(user_uid: str):
    """Sets admin and mechanic custom claims for the given user UID."""
    # Ensure SDK is initialized before proceeding
    if not firebase_admin._apps:
       initialize_firebase_admin() 
       
    try:
        # Set admin claim (implicitly includes mechanic claim as well)
        claims_to_set = {
            'admin': True,
            'mechanic': True # Admins are also mechanics in our current logic
        }
        auth.set_custom_user_claims(user_uid, claims_to_set)
        print(f"\nSuccessfully set admin claims for user: {user_uid}")
        print("Claims set: ", claims_to_set)
        print("\nIMPORTANT: The user must sign out and sign back in (or refresh their ID token) \n           for the new claims to take effect in their ID token.")
    except auth.UserNotFoundError:
        print(f"Error: User with UID '{user_uid}' not found in Firebase Authentication.")
    except Exception as e:
        print(f"An error occurred while setting custom claims: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Set admin custom claims for a Firebase user.")
    parser.add_argument("user_uid", help="The UID of the user to grant admin privileges.")
    
    args = parser.parse_args()
    
    target_uid = args.user_uid
    
    if not target_uid:
        print("Error: User UID must be provided.")
        parser.print_help()
        sys.exit(1)
        
    # Initialize SDK first (moved call here)
    initialize_firebase_admin()
    # Now set claims
    set_admin_claims(target_uid) 