from pydantic import BaseModel, Field, EmailStr
from datetime import date, datetime
from typing import Optional, Literal, Dict, List, Union
from enum import Enum

# Service models
class Service(BaseModel):
    id: str
    name: str
    minutes: int
    description: str
    price: float
    active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

# Availability models
class AvailabilityQuery(BaseModel):
    date: date

class SlotStatus(str, Enum):
    FREE = "free"
    BOOKED = "booked"
    BLOCKED = "blocked"

class Slot(BaseModel):
    start: datetime
    end: datetime
    is_free: bool = True
    mechanic_id: Optional[str] = None

class AvailabilityDay(BaseModel):
    day: str
    slots: Dict[str, str]  # time string -> status string (using values from SlotStatus)
    mechanics: Dict[str, bool] = {}
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

# Booking models
class BookingCreate(BaseModel):
    service_id: str
    slot_start: datetime
    mechanic_id: Optional[str] = None
    customer_name: str
    customer_email: EmailStr
    customer_phone: Optional[str] = None
    notes: Optional[str] = None

class BookingStatus(str, Enum):
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no-show"

class BookingOut(BookingCreate):
    id: str = Field(..., description="Firestore document ID")
    slot_end: datetime
    status: str = BookingStatus.CONFIRMED.value  # Using the string value
    service_name: str = ""  # Added for denormalization
    service_price: float = 0.0  # Added for denormalization
    calendar_event_id: Optional[str] = None  # Google Calendar event ID
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

# Mechanic models
class DaySchedule(BaseModel):
    start: Optional[str] = None
    end: Optional[str] = None

class MechanicSchedule(BaseModel):
    monday: Optional[DaySchedule] = None
    tuesday: Optional[DaySchedule] = None
    wednesday: Optional[DaySchedule] = None
    thursday: Optional[DaySchedule] = None
    friday: Optional[DaySchedule] = None
    saturday: Optional[DaySchedule] = None
    sunday: Optional[DaySchedule] = None

class Mechanic(BaseModel):
    id: str
    name: str
    email: EmailStr
    specialties: List[str] = []
    schedule: MechanicSchedule
    active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

# User models
class UserRole(str, Enum):
    CUSTOMER = "customer"
    MECHANIC = "mechanic"
    ADMIN = "admin"

class User(BaseModel):
    id: str
    email: EmailStr
    name: str
    phone: Optional[str] = None
    role: str = UserRole.CUSTOMER.value
    mechanic_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
