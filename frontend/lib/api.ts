import httpClient from './httpClient';
import { Booking, MechanicSchedule } from './types';

// Define interfaces for API responses
export interface Service {
    id: string;
    name: string;
    minutes: number;
    description: string;
    price: number;
}

export interface AvailabilityResponse {
    date: string;
    slots: Record<string, string>;
}

export interface BackendSlot {
    start: string;
    is_free: boolean;
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

// Legacy function for backward compatibility
export const fetchServices = async (): Promise<Service[]> => {
    return getServices();
};

export const getAvailability = async (date: string): Promise<AvailabilityResponse> => {
    // Use the API proxy endpoint
    return httpClient.get<AvailabilityResponse>(`/api/availability`, { params: { date } });
};

// Legacy function for backward compatibility
export const fetchAvailableSlots = async (date: string, service_id?: string): Promise<AvailabilityResponse> => {
    // Build query parameters
    const params: Record<string, string> = { date };
    if (service_id) {
        params.service_id = service_id;
    }

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
        if (service_id) {
            backendParams.service_id = service_id;
        }
        data = await httpClient.get<BackendSlot[] | AvailabilityResponse>(`${backendBase}/availability`, { params: backendParams });
    }

    // If backend returned the raw slot list, convert it to the shape expected by the UI
    if (Array.isArray(data)) {
        const slots: Record<string, string> = {};
        data.forEach((slot: BackendSlot) => {
            // Extract the HH:MM part of the timestamp **without** converting to UTC. This prevents
            // accidental timezone shifts that would mis-align the slot time between frontend and
            // backend (e.g. 08:00 → 13:00).
            if (typeof slot.start === 'string' && slot.start.includes('T')) {
                const timeKey = slot.start.split('T')[1].substring(0, 5); // "HH:MM"
                slots[timeKey] = slot.is_free ? 'free' : 'booked';
            }
        });
        return { date, slots };
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
