import axios from 'axios';
import { Booking, MechanicSchedule } from './types';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE ? '' : '/api'  // Empty base URL when using direct backend URL
});

// Auth utilities
export const setAuthToken = (token: string | null) => {
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common['Authorization'];
    }
};

// Basic API endpoints
export const getServices = async () => {
    // Use the API proxy endpoint when in the browser
    const endpoint = typeof window !== 'undefined' ? '/api/services' : `${process.env.NEXT_PUBLIC_API_BASE}/services`;
    const response = await axios.get(endpoint);
    return response.data;
};

// Legacy function for backward compatibility
export const fetchServices = async () => {
    return getServices();
};

export const getAvailability = async (date: string) => {
    // Use the API proxy endpoint
    const response = await axios.get(`/api/availability?date=${date}`);
    return response.data;
};

interface BackendSlot {
    start: string;
    is_free: boolean;
}

// Legacy function for backward compatibility
export const fetchAvailableSlots = async (date: string, service_id?: string) => {
    // Build query string
    const queryString = service_id
        ? `date=${date}&service_id=${service_id}`
        : `date=${date}`;

    // Determine environment (browser vs. Node / SSR)
    const isBrowser = typeof window !== 'undefined';

    let response;

    if (isBrowser) {
        // In the browser we can rely on the Next.js API route proxy
        response = await axios.get(`/api/availability?${queryString}`);
    } else {
        // On the server (getServerSideProps / API routes) we call the backend directly
        const backendBase = process.env.NEXT_PUBLIC_API_BASE;
        if (!backendBase) {
            throw new Error('Missing NEXT_PUBLIC_API_BASE environment variable for server-side availability fetch');
        }
        // Backend expects the query parameter to be named "day" not "date"
        const backendQuery = service_id
            ? `day=${date}&service_id=${service_id}`
            : `day=${date}`;
        response = await axios.get(`${backendBase}/availability?${backendQuery}`);
    }

    const data = response.data;

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
    return data;
};

export const createBooking = async (bookingData: Omit<Booking, 'id' | 'status'>) => {
    const response = await axios.post('/api/bookings', bookingData);
    return response.data;
};

export const getBookings = async (token: string) => {
    setAuthToken(token);
    const response = await api.get('/api/bookings');
    return response.data;
};

// Mechanic-specific endpoints
export const getPendingBookings = async (token: string): Promise<Booking[]> => {
    setAuthToken(token);
    const response = await api.get('/api/bookings/mechanic/pending');
    return response.data;
};

export const approveBooking = async (token: string, bookingId: string, notes?: string): Promise<Booking> => {
    setAuthToken(token);
    const response = await api.post(`/api/bookings/${bookingId}/approval`, {
        approved: true,
        notes
    });
    return response.data;
};

export const denyBooking = async (token: string, bookingId: string, notes?: string): Promise<Booking> => {
    setAuthToken(token);
    const response = await api.post(`/api/bookings/${bookingId}/approval`, {
        approved: false,
        notes
    });
    return response.data;
};

export const updateMechanicAvailability = async (token: string, schedule: MechanicSchedule): Promise<MechanicSchedule> => {
    setAuthToken(token);
    const response = await api.post('/api/mechanic/availability', { schedule });
    return response.data;
};

export default api;
