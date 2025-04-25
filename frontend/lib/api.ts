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

// Legacy function for backward compatibility
export const fetchAvailableSlots = async (date: string, service_id?: string) => {
    const url = service_id
        ? `/api/availability?date=${date}&service_id=${service_id}`
        : `/api/availability?date=${date}`;
    const response = await axios.get(url);
    return response.data;
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
