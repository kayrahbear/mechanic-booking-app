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
    start: str  # ISO datetime string for API compatibility
    end: str    # ISO datetime string for API compatibility
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
    customer_address: str
    customer_city: str
    customer_state: str
    customer_zip: str
    # Vehicle information
    vehicle_make: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_year: Optional[int] = Field(None, ge=1980, le=2030)
    vehicle_vin: Optional[str] = Field(None, min_length=17, max_length=17)
    notes: Optional[str] = None

class BookingStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DENIED = "denied"
    NO_SHOW = "no-show"
    RESCHEDULE_REQUESTED = "reschedule-requested"

class RescheduleSlotRequest(BaseModel):
    """Preferred new time slot for reschedule request"""
    start: datetime
    end: datetime
    priority: int = 1  # 1 = first choice, 2 = second choice, etc.

class BookingCancellationRequest(BaseModel):
    """Request to cancel a booking"""
    reason: Optional[str] = None

class BookingRescheduleRequest(BaseModel):
    """Request to reschedule a booking"""
    reason: str
    preferred_slots: List[RescheduleSlotRequest] = Field(..., min_items=1, max_items=3)

class BookingOut(BookingCreate):
    id: str = Field(..., description="Firestore document ID")
    slot_end: datetime
    status: str = BookingStatus.PENDING.value  # Change default to PENDING
    service_name: str = ""  # Added for denormalization
    service_price: float = 0.0  # Added for denormalization
    calendar_event_id: Optional[str] = None  # Google Calendar event ID
    approved_by: Optional[str] = None  # Mechanic who approved/denied the booking
    approval_timestamp: Optional[datetime] = None  # When the booking was approved/denied
    approval_notes: Optional[str] = None  # Notes from the approver
    
    # Cancellation fields
    cancellation_reason: Optional[str] = None
    cancelled_at: Optional[datetime] = None
    
    # Reschedule fields
    reschedule_reason: Optional[str] = None
    reschedule_requested_slots: Optional[List[RescheduleSlotRequest]] = None
    reschedule_requested_at: Optional[datetime] = None
    reschedule_response_notes: Optional[str] = None
    reschedule_responded_by: Optional[str] = None
    reschedule_responded_at: Optional[datetime] = None
    
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
    phone: str
    # Removed specialties field as there will only be a single mechanic who can perform all services
    schedule: MechanicSchedule
    active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

# Vehicle models
class VehicleCreate(BaseModel):
    make: str
    model: str
    year: int = Field(..., ge=1980, le=2030)
    vin: Optional[str] = Field(None, min_length=17, max_length=17)

class VehicleUpdate(BaseModel):
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = Field(None, ge=1980, le=2030)
    vin: Optional[str] = Field(None, min_length=17, max_length=17)

class Vehicle(BaseModel):
    id: str
    make: str
    model: str
    year: int
    vin: Optional[str] = None
    user_id: str
    is_primary: bool = False
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

# NHTSA API models
class NHTSAMake(BaseModel):
    Make_ID: Union[int, str]  # NHTSA returns integers, but we'll accept both
    Make_Name: str

class NHTSAModel(BaseModel):
    Model_ID: Union[int, str]  # NHTSA returns integers, but we'll accept both
    Model_Name: str
    Make_ID: Union[int, str]
    Make_Name: str

# -- Availability Seeding (weekly) --
class AvailabilitySeedRequest(BaseModel):
    """Request body for POST /availability/seed."""
    week_start: Optional[date] = Field(
        default=None,
        description="ISO date (YYYY-MM-DD) for the Monday of the week to seed. Defaults to next Monday.",
    )
    dry_run: bool = Field(False, description="If true, compute counts but do not write to Firestore.")


class AvailabilitySeedResult(BaseModel):
    """Response model returned by POST /availability/seed."""
    week_start: date
    days: int = 7  # always Monday-Sunday
    created: int
    updated: int
    skipped: int
    dry_run: bool = False
