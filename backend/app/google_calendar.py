import os, logging
from google.oauth2 import service_account
from googleapiclient.discovery import build
from datetime import datetime

SCOPES = ["https://www.googleapis.com/auth/calendar"]

def _get_creds():
    key_path = os.environ["GOOGLE_APPLICATION_CREDENTIALS"]
    return service_account.Credentials.from_service_account_file(
        key_path, scopes=SCOPES
    )

def get_calendar_service():
    return build("calendar", "v3", credentials=_get_creds(), cache_discovery=False)

def create_event(booking) -> str:   # booking is BookingOut
    service = get_calendar_service()
    calendar_id = os.getenv("CALENDAR_ID", "primary")

    body = {
        "summary": f"{booking.customer_name} – {booking.service_name}",
        "description": booking.notes or "",
        "start": {"dateTime": booking.slot_start.isoformat()},
        "end":   {"dateTime": booking.slot_end.isoformat()},
    }

    event = service.events().insert(calendarId=calendar_id, body=body).execute()
    logging.info("Created calendar event %s for booking %s", event["id"], booking.id)
    return event["id"]
