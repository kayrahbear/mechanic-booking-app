import httpClient from './httpClient';
import { Booking, MechanicSchedule } from './types';

// Define interfaces for API responses
export interface Service {
    id: string;
    name: string;
    minutes: number;
    description: string;
    price: number;
    active?: boolean;
}

export interface AvailabilityResponse {
    date: string;
    slots: Record<string, string>;
}

export interface BackendSlot {
    start: string;
    end: string;
    is_free: boolean;
    mechanic_id?: string;
}

export interface UserProfile {
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
}

// Auth utilities
export const setAuthToken = (token: string | null) => {
    httpClient.setAuthToken(token);
};

// Basic API endpoints
export const getServices = async (): Promise<Service[]> => {
    // Use the API proxy endpoint when in the browser
    const endpoint = typeof window !== 'undefined' ? '/api/services' : `${process.env.NEXT_PUBLIC_API_BASE}/services`;
    return httpClient.get<Service[]>(endpoint);
};

// Get all services including inactive ones (for mechanics/admins)
export const getAllServices = async (token: string): Promise<Service[]> => {
    setAuthToken(token);
    return httpClient.get<Service[]>('/api/services?all=true');
};

// Create a new service
export const createService = async (token: string, serviceData: Omit<Service, 'id'>): Promise<Service> => {
    setAuthToken(token);
    return httpClient.post<Service>('/api/services', serviceData);
};

// Update an existing service
export const updateService = async (token: string, serviceId: string, serviceData: Omit<Service, 'id'>): Promise<Service> => {
    setAuthToken(token);
    return httpClient.put<Service>(`/api/services?id=${serviceId}`, serviceData);
};

// Delete a service (soft delete)
export const deleteService = async (token: string, serviceId: string): Promise<{ message: string }> => {
    setAuthToken(token);
    return httpClient.delete<{ message: string }>(`/api/services?id=${serviceId}`);
};

// Legacy function for backward compatibility
export const fetchServices = async (): Promise<Service[]> => {
    return getServices();
};

export const getAvailability = async (date: string): Promise<AvailabilityResponse> => {
    // Use the API proxy endpoint
    return httpClient.get<AvailabilityResponse>(`/api/availability`, { params: { date } });
};

// Legacy function for backward compatibility
export const fetchAvailableSlots = async (date: string): Promise<AvailabilityResponse> => {
    // Build query parameters - no longer passing service_id as there's only one mechanic who can perform all services
    const params: Record<string, string> = { date };
    // Removed service_id parameter as it's no longer needed for filtering

    // Determine environment (browser vs. Node / SSR)
    const isBrowser = typeof window !== 'undefined';

    let data;

    if (isBrowser) {
        // In the browser we can rely on the Next.js API route proxy
        data = await httpClient.get<BackendSlot[] | AvailabilityResponse>(`/api/availability`, { params });
    } else {
        // On the server (getServerSideProps / API routes) we call the backend directly
        const backendBase = process.env.NEXT_PUBLIC_API_BASE;
        if (!backendBase) {
            throw new Error('Missing NEXT_PUBLIC_API_BASE environment variable for server-side availability fetch');
        }
        // Backend expects the query parameter to be named "day" not "date"
        const backendParams: Record<string, string> = { day: date };
        // Removed service_id parameter as it's no longer needed for filtering
        data = await httpClient.get<BackendSlot[] | AvailabilityResponse>(`${backendBase}/availability`, { params: backendParams });
    }

    console.log("fetchAvailableSlots received data:", typeof data, Array.isArray(data) ? "array" : "object");

// If backend returned the raw slot list, convert it to the shape expected by the UI
if (Array.isArray(data)) {
    console.log("Converting array data to slots object. Sample item:", data.length > 0 ? JSON.stringify(data[0]) : "No items");
    console.log("Total items in array:", data.length);
    
    const slots: Record<string, string> = {};
    data.forEach((slot: BackendSlot) => {
        // Extract the HH:MM part of the timestamp **without** converting to UTC. This prevents
        // accidental timezone shifts that would mis-align the slot time between frontend and
        // backend (e.g. 08:00 → 13:00).
        if (typeof slot.start === 'string' && slot.start.includes('T')) {
            const timeKey = slot.start.split('T')[1].substring(0, 5); // "HH:MM"
            slots[timeKey] = slot.is_free ? 'free' : 'booked';
            console.log(`Added slot: ${timeKey} = ${slot.is_free ? 'free' : 'booked'}`);
        } else {
            console.log("Invalid slot format:", slot);
        }
    });
    
    console.log("Converted slots object:", Object.keys(slots).length, "slots");
    const result = { date, slots };
    console.log("Final result:", result);
    return result;
}

    // Otherwise assume the data is already in the desired shape
    return data as AvailabilityResponse;
};

export const createBooking = async (bookingData: Omit<Booking, 'id' | 'status'>): Promise<Booking> => {
    return httpClient.post<Booking>('/api/bookings', bookingData);
};

export const getBookings = async (token: string): Promise<Booking[]> => {
    setAuthToken(token);
    return httpClient.get<Booking[]>('/api/bookings');
};

// Mechanic-specific endpoints
export const getPendingBookings = async (token: string): Promise<Booking[]> => {
    setAuthToken(token);
    return httpClient.get<Booking[]>('/api/bookings/mechanic/pending');
};

export const getUpcomingBookings = async (token: string): Promise<Booking[]> => {
    setAuthToken(token);
    return httpClient.get<Booking[]>('/api/bookings/mechanic/upcoming');
};

export const approveBooking = async (token: string, bookingId: string, notes?: string): Promise<Booking> => {
    setAuthToken(token);
    return httpClient.post<Booking>(`/api/bookings/${bookingId}/approval`, {
        approved: true,
        notes
    });
};

export const denyBooking = async (token: string, bookingId: string, notes?: string): Promise<Booking> => {
    setAuthToken(token);
    return httpClient.post<Booking>(`/api/bookings/${bookingId}/approval`, {
        approved: false,
        notes
    });
};

export const updateMechanicAvailability = async (token: string, schedule: MechanicSchedule): Promise<MechanicSchedule> => {
    setAuthToken(token);
    return httpClient.post<MechanicSchedule>('/api/mechanic/availability', { schedule });
};

// User profile-related functions
export const getUserProfile = async (token: string): Promise<UserProfile> => {
    setAuthToken(token);
    return httpClient.get<UserProfile>('/api/user');
};

export const updateUserProfile = async (token: string, data: { name: string; phone?: string }): Promise<UserProfile> => {
    setAuthToken(token);
    return httpClient.put<UserProfile>('/api/user', data);
};

export const seedAvailability = async (token: string): Promise<{ created: number; updated: number; skipped: number; }> => {
    setAuthToken(token);
    return httpClient.post<{ created: number; updated: number; skipped: number; }>('/api/availability/seed', {});
};

export default httpClient;
