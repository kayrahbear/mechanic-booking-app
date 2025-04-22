from pydantic import BaseModel, Field
from datetime import date, datetime

class Service(BaseModel):
    id: str
    name: str
    minutes: int

class AvailabilityQuery(BaseModel):
    date: date

class Slot(BaseModel):
    start: datetime
    end: datetime
    is_free: bool = True

class BookingCreate(BaseModel):
    service_id: str
    slot_start: datetime
    customer_name: str
    customer_email: str
    customer_phone: str | None = None

class BookingOut(BookingCreate):
    id: str = Field(..., description="Firestore document ID")
