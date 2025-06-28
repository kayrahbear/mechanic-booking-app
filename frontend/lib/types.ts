// Day schedule type
export interface DaySchedule {
    start: string | null;
    end: string | null;
}

// Mechanic schedule type
export interface MechanicSchedule {
    monday: DaySchedule;
    tuesday: DaySchedule;
    wednesday: DaySchedule;
    thursday: DaySchedule;
    friday: DaySchedule;
    saturday: DaySchedule;
    sunday: DaySchedule;
}

// Booking status enum
export enum BookingStatus {
    PENDING = "pending",
    CONFIRMED = "confirmed",
    COMPLETED = "completed",
    CANCELLED = "cancelled",
    DENIED = "denied",
    NO_SHOW = "no-show"
}

// Booking type
export interface Booking {
    id: string;
    service_id: string;
    service_name: string;
    service_price: number;
    slot_start: string;
    slot_end: string;
    mechanic_id?: string;
    customer_name: string;
    customer_email: string;
    customer_phone?: string;
    customer_address: string;
    customer_city: string;
    customer_state: string;
    customer_zip: string;
    // Vehicle information
    vehicle_make?: string;
    vehicle_model?: string;
    vehicle_year?: number;
    vehicle_vin?: string;
    notes?: string;
    status: BookingStatus;
    calendar_event_id?: string;
    approved_by?: string;
    approval_timestamp?: string;
    created_at: string;
    updated_at: string;
}

// Service type
export interface Service {
    id: string;
    name: string;
    minutes: number;
    description: string;
    price: number;
    active: boolean;
}

// Slot status enum
export enum SlotStatus {
    FREE = "free",
    BOOKED = "booked",
    BLOCKED = "blocked"
}

// Availability day type
export interface AvailabilityDay {
    day: string;
    slots: Record<string, SlotStatus>;
    mechanics: Record<string, boolean>;
}

// Vehicle types
export interface Vehicle {
    id: string;
    make: string;
    model: string;
    year: number;
    vin?: string;
    user_id: string;
    is_primary: boolean;
    created_at: string;
    updated_at: string;
}

export interface VehicleCreate {
    make: string;
    model: string;
    year: number;
    vin?: string;
}

export interface VehicleUpdate {
    make?: string;
    model?: string;
    year?: number;
    vin?: string;
}

// NHTSA API types
export interface NHTSAMake {
    Make_ID: number | string;
    Make_Name: string;
}

export interface NHTSAModel {
    Model_ID: number | string;
    Model_Name: string;
    Make_ID: number | string;
    Make_Name: string;
}

// Firestore User type
export interface FirestoreUser {
    uid: string;
    email: string;
    name: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    role: 'admin' | 'mechanic' | 'customer';
    created_by_mechanic?: boolean;
    created_at: string;
    updated_at: string;
}

// Work Order types
export enum WorkOrderStatus {
    DRAFT = 'draft',
    IN_PROGRESS = 'in_progress',
    WAITING_FOR_PARTS = 'waiting_for_parts',
    WORK_COMPLETED = 'work_completed'
}

export enum PartStatus {
    NEEDED = 'needed',
    IN_STOCK = 'in_stock',
    ORDERED = 'ordered',
    RECEIVED = 'received',
    USED = 'used'
}

export interface WorkOrderPart {
    id: string;
    work_order_id: string;
    part_number?: string;
    part_name: string;
    description?: string;
    quantity_needed: number;
    quantity_used: number;
    unit_cost: number;
    total_cost: number;
    in_stock_quantity?: number;
    supplier?: string;
    status: PartStatus;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface WorkOrderLabor {
    id: string;
    work_order_id: string;
    description: string;
    hours: number; // In 0.5 hour increments
    hourly_rate: number;
    total_cost: number;
    mechanic_id: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface WorkOrder {
    id: string;
    work_order_number: string;
    customer_id: string;
    vehicle_id: string;
    booking_id?: string;
    mechanic_id: string;
    mileage: number;
    title: string;
    description: string;
    status: WorkOrderStatus;
    service_type?: string;
    scheduled_date?: string;
    started_at?: string;
    completed_at?: string;
    parts: WorkOrderPart[];
    labor_entries: WorkOrderLabor[];
    parts_total: number;
    labor_total: number;
    total_cost: number;
    mechanic_notes: string;
    internal_notes?: string;
    photos: string[];
    is_editable: boolean;
    created_at: string;
    updated_at: string;
}

export interface WorkOrderCreate {
    customer_id: string;
    vehicle_id: string;
    booking_id?: string;
    mileage: number;
    title: string;
    description: string;
    service_type?: string;
    scheduled_date?: string;
    parts: WorkOrderPartCreate[];
    labor_entries: WorkOrderLaborCreate[];
    mechanic_notes: string;
    internal_notes?: string;
}

export interface WorkOrderPartCreate {
    part_number?: string;
    part_name: string;
    description?: string;
    quantity_needed: number;
    quantity_used?: number;
    unit_cost: number;
    supplier?: string;
    status?: PartStatus;
    notes?: string;
}

export interface WorkOrderLaborCreate {
    description: string;
    hours: number;
    hourly_rate: number;
    mechanic_id: string;
    notes?: string;
}

// Parts Inventory types
export interface PartInventory {
    id: string;
    part_number: string;
    part_name: string;
    description?: string;
    category?: string;
    quantity_on_hand: number;
    minimum_stock_level?: number;
    reorder_quantity?: number;
    unit_cost: number;
    supplier?: string;
    supplier_part_number?: string;
    last_ordered?: string;
    created_at: string;
    updated_at: string;
}

export interface PartInventoryCreate {
    part_number: string;
    part_name: string;
    description?: string;
    category?: string;
    quantity_on_hand: number;
    minimum_stock_level?: number;
    reorder_quantity?: number;
    unit_cost: number;
    supplier?: string;
    supplier_part_number?: string;
}
