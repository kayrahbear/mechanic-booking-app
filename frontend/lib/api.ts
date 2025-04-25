import axios from 'axios';
import { Booking, MechanicSchedule } from './types';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || '/api'
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
    const response = await api.get('/services');
    return response.data;
};

export const getAvailability = async (date: string) => {
    const response = await api.get(`/availability?date=${date}`);
    return response.data;
};

export const createBooking = async (bookingData: Omit<Booking, 'id' | 'status'>) => {
    const response = await api.post('/bookings', bookingData);
    return response.data;
};

export const getBookings = async (token: string) => {
    setAuthToken(token);
    const response = await api.get('/bookings');
    return response.data;
};

// Mechanic-specific endpoints
export const getPendingBookings = async (token: string): Promise<Booking[]> => {
    setAuthToken(token);
    const response = await api.get('/bookings/mechanic/pending');
    return response.data;
};

export const approveBooking = async (token: string, bookingId: string, notes?: string): Promise<Booking> => {
    setAuthToken(token);
    const response = await api.post(`/bookings/${bookingId}/approval`, {
        approved: true,
        notes
    });
    return response.data;
};

export const denyBooking = async (token: string, bookingId: string, notes?: string): Promise<Booking> => {
    setAuthToken(token);
    const response = await api.post(`/bookings/${bookingId}/approval`, {
        approved: false,
        notes
    });
    return response.data;
};

export const updateMechanicAvailability = async (token: string, schedule: MechanicSchedule): Promise<MechanicSchedule> => {
    setAuthToken(token);
    const response = await api.post('/mechanic/availability', { schedule });
    return response.data;
};

export default api;
