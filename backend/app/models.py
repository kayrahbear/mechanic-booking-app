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
    created_by_mechanic: bool = False  # Flag to indicate if customer was created by mechanic
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

# Customer management models
class CustomerCreateRequest(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    # Vehicle information (optional)
    vehicle_make: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_year: Optional[int] = Field(None, ge=1980, le=2030)
    vehicle_vin: Optional[str] = Field(None, min_length=17, max_length=17)
    send_invitation: bool = False  # Whether to send account invitation

class CustomerUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None

class CustomerInvitationStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"

class CustomerInvitation(BaseModel):
    id: str
    customer_id: str
    customer_email: EmailStr
    temporary_password: str
    status: str = CustomerInvitationStatus.PENDING.value
    expires_at: datetime
    sent_at: datetime = Field(default_factory=datetime.now)
    accepted_at: Optional[datetime] = None
    created_by: str  # Mechanic user ID who created the invitation

class CustomerResponse(BaseModel):
    id: str
    email: EmailStr
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    role: str = UserRole.CUSTOMER.value
    created_by_mechanic: bool = False
    vehicles: List[Vehicle] = []
    invitation_status: Optional[str] = None  # If customer was invited
    created_at: datetime
    updated_at: datetime

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

# Work Order models
class WorkOrderStatus(str, Enum):
    DRAFT = "draft"
    IN_PROGRESS = "in_progress"
    WAITING_FOR_PARTS = "waiting_for_parts"
    WORK_COMPLETED = "work_completed"

class PartStatus(str, Enum):
    NEEDED = "needed"
    IN_STOCK = "in_stock"
    ORDERED = "ordered"
    RECEIVED = "received"
    USED = "used"

class WorkOrderPart(BaseModel):
    id: str
    work_order_id: str
    part_number: Optional[str] = None
    part_name: str
    description: Optional[str] = None
    quantity_needed: int = Field(ge=1)
    quantity_used: int = Field(ge=0, default=0)
    unit_cost: float = Field(ge=0)
    total_cost: float = Field(ge=0)
    in_stock_quantity: Optional[int] = None
    supplier: Optional[str] = None
    status: str = PartStatus.NEEDED.value
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class WorkOrderLabor(BaseModel):
    id: str
    work_order_id: str
    description: str
    hours: float = Field(ge=0)  # In 0.5 hour increments
    hourly_rate: float = Field(ge=0)
    total_cost: float = Field(ge=0)
    mechanic_id: str
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class WorkOrder(BaseModel):
    id: str
    work_order_number: str
    customer_id: str
    vehicle_id: str
    booking_id: Optional[str] = None
    mechanic_id: str
    mileage: int = Field(ge=0)
    title: str
    description: str
    status: str = WorkOrderStatus.DRAFT.value
    service_type: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    parts: List[WorkOrderPart] = []
    labor_entries: List[WorkOrderLabor] = []
    parts_total: float = Field(ge=0, default=0)
    labor_total: float = Field(ge=0, default=0)
    total_cost: float = Field(ge=0, default=0)
    mechanic_notes: str = ""
    internal_notes: Optional[str] = None
    photos: List[str] = []  # Photo URLs
    is_editable: bool = True
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

# Work Order creation/update request models
class WorkOrderPartCreate(BaseModel):
    part_number: Optional[str] = None
    part_name: str
    description: Optional[str] = None
    quantity_needed: int = Field(ge=1)
    quantity_used: int = Field(ge=0, default=0)
    unit_cost: float = Field(ge=0)
    supplier: Optional[str] = None
    status: str = PartStatus.NEEDED.value
    notes: Optional[str] = None

class WorkOrderLaborCreate(BaseModel):
    description: str
    hours: float = Field(ge=0)  # In 0.5 hour increments
    hourly_rate: float = Field(ge=0)
    mechanic_id: str
    notes: Optional[str] = None

class WorkOrderCreate(BaseModel):
    customer_id: str
    vehicle_id: str
    booking_id: Optional[str] = None
    mileage: int = Field(ge=0)
    title: str
    description: str
    service_type: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    parts: List[WorkOrderPartCreate] = []
    labor_entries: List[WorkOrderLaborCreate] = []
    mechanic_notes: str = ""
    internal_notes: Optional[str] = None

class WorkOrderUpdate(BaseModel):
    mileage: Optional[int] = Field(None, ge=0)
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    service_type: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    parts: Optional[List[WorkOrderPartCreate]] = None
    labor_entries: Optional[List[WorkOrderLaborCreate]] = None
    mechanic_notes: Optional[str] = None
    internal_notes: Optional[str] = None
    photos: Optional[List[str]] = None

# Parts Inventory models
class PartInventory(BaseModel):
    id: str
    part_number: str
    part_name: str
    description: Optional[str] = None
    category: Optional[str] = None
    quantity_on_hand: int = Field(ge=0)
    minimum_stock_level: Optional[int] = Field(None, ge=0)
    reorder_quantity: Optional[int] = Field(None, ge=1)
    unit_cost: float = Field(ge=0)
    supplier: Optional[str] = None
    supplier_part_number: Optional[str] = None
    last_ordered: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class PartInventoryCreate(BaseModel):
    part_number: str
    part_name: str
    description: Optional[str] = None
    category: Optional[str] = None
    quantity_on_hand: int = Field(ge=0)
    minimum_stock_level: Optional[int] = Field(None, ge=0)
    reorder_quantity: Optional[int] = Field(None, ge=1)
    unit_cost: float = Field(ge=0)
    supplier: Optional[str] = None
    supplier_part_number: Optional[str] = None

class PartInventoryUpdate(BaseModel):
    part_name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    quantity_on_hand: Optional[int] = Field(None, ge=0)
    minimum_stock_level: Optional[int] = Field(None, ge=0)
    reorder_quantity: Optional[int] = Field(None, ge=1)
    unit_cost: Optional[float] = Field(None, ge=0)
    supplier: Optional[str] = None
    supplier_part_number: Optional[str] = None
    last_ordered: Optional[datetime] = None
