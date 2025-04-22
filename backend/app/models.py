from pydantic import BaseModel, Field, EmailStr
from datetime import date, datetime
from typing import Optional, Literal, Dict, List, Union

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

class SlotStatus(str, Literal["free", "booked", "blocked"]):
    pass

class Slot(BaseModel):
    start: datetime
    end: datetime
    is_free: bool = True
    mechanic_id: Optional[str] = None

class AvailabilityDay(BaseModel):
    day: str
    slots: Dict[str, SlotStatus]  # time string -> status
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

class BookingStatus(str, Literal["confirmed", "completed", "cancelled", "no-show"]):
    pass

class BookingOut(BookingCreate):
    id: str = Field(..., description="Firestore document ID")
    slot_end: datetime
    status: BookingStatus = "confirmed"
    service_name: str = ""  # Added for denormalization
    service_price: float = 0.0  # Added for denormalization
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
class UserRole(str, Literal["customer", "mechanic", "admin"]):
    pass

class User(BaseModel):
    id: str
    email: EmailStr
    name: str
    phone: Optional[str] = None
    role: UserRole = "customer"
    mechanic_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
