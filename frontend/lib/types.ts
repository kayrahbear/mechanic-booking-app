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
