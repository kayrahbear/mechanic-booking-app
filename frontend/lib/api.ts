import apiClient from './apiClient';
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

// Service endpoints
export const getServices = async (): Promise<Service[]> => {
    return apiClient.get<Service[]>('/services');
};

export const getAllServices = async (): Promise<Service[]> => {
    return apiClient.get<Service[]>('/services', { params: { all: 'true' } });
};

export const createService = async (serviceData: Omit<Service, 'id'>): Promise<Service> => {
    return apiClient.post<Service>('/services', serviceData);
};

export const updateService = async (serviceId: string, serviceData: Omit<Service, 'id'>): Promise<Service> => {
    return apiClient.put<Service>(`/services?id=${serviceId}`, serviceData);
};

export const deleteService = async (serviceId: string): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`/services?id=${serviceId}`);
};

// Legacy function for backward compatibility
export const fetchServices = async (): Promise<Service[]> => {
    return getServices();
};

// Availability endpoints
export const getAvailability = async (date: string): Promise<AvailabilityResponse> => {
    return apiClient.get<AvailabilityResponse>('/availability', { params: { date } });
};

export const fetchAvailableSlots = async (date: string): Promise<AvailabilityResponse> => {
    const data = await apiClient.get<BackendSlot[] | AvailabilityResponse>('/availability', { 
        params: { date } 
    });

    // If backend returned the raw slot list, convert it to the shape expected by the UI
    if (Array.isArray(data)) {
        const slots: Record<string, string> = {};
        data.forEach((slot: BackendSlot) => {
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

// Booking endpoints
export const createBooking = async (bookingData: Omit<Booking, 'id' | 'status'>): Promise<Booking> => {
    return apiClient.post<Booking>('/bookings', bookingData);
};

export const getBookings = async (): Promise<Booking[]> => {
    return apiClient.get<Booking[]>('/bookings');
};

// Mechanic-specific endpoints
export const getPendingBookings = async (): Promise<Booking[]> => {
    return apiClient.get<Booking[]>('/bookings/mechanic/pending');
};

export const getUpcomingBookings = async (): Promise<Booking[]> => {
    return apiClient.get<Booking[]>('/bookings/mechanic/upcoming');
};

export const approveBooking = async (bookingId: string, notes?: string): Promise<Booking> => {
    return apiClient.post<Booking>(`/bookings/${bookingId}/approval`, {
        approved: true,
        notes
    });
};

export const denyBooking = async (bookingId: string, notes?: string): Promise<Booking> => {
    return apiClient.post<Booking>(`/bookings/${bookingId}/approval`, {
        approved: false,
        notes
    });
};

export const updateMechanicAvailability = async (schedule: MechanicSchedule): Promise<MechanicSchedule> => {
    return apiClient.post<MechanicSchedule>('/mechanic/availability', { schedule });
};

// User profile endpoints
export const getUserProfile = async (): Promise<UserProfile> => {
    return apiClient.get<UserProfile>('/user');
};

export const updateUserProfile = async (data: { name: string; phone?: string }): Promise<UserProfile> => {
    return apiClient.put<UserProfile>('/user', data);
};

// Admin endpoints
export const seedAvailability = async (): Promise<{ created: number; updated: number; skipped: number; }> => {
    return apiClient.post<{ created: number; updated: number; skipped: number; }>('/availability/seed', {});
};

export default apiClient;