// frontend/components/BookingForm.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { fetchAvailableSlots, createBooking } from '../lib/api';

interface Service {
    id: string;
    name: string;
    minutes: number;
    description: string;
    price: number;
}

interface AvailabilitySlot {
    time: string;
    status: 'free' | 'booked' | 'blocked';
}

interface BookingFormProps {
    services: Service[];
    initialServiceId?: string;
    initialDate?: string;
}

export default function BookingForm({
    services,
    initialServiceId,
    initialDate
}: BookingFormProps) {
    const router = useRouter();
    const [selectedService, setSelectedService] = useState(initialServiceId || '');
    const [selectedDate, setSelectedDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
    const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
    const [selectedTime, setSelectedTime] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Fetch available slots when date or service changes
    useEffect(() => {
        if (selectedDate && selectedService) {
            loadAvailableSlots();
        }
    }, [selectedDate, selectedService]);

    async function loadAvailableSlots() {
        try {
            setIsLoading(true);
            setError('');
            const data = await fetchAvailableSlots(selectedDate, selectedService);

            // Transform the slots object to an array
            const slotsArray = Object.entries(data.slots || {}).map(([time, status]) => ({
                time,
                status: status as 'free' | 'booked' | 'blocked'
            }));

            setAvailableSlots(slotsArray);
            setSelectedTime(''); // Reset selected time when slots change
        } catch (err) {
            console.error('Error loading available slots:', err);
            setError('Failed to load available time slots');
            setAvailableSlots([]);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!selectedService || !selectedDate || !selectedTime) {
            setError('Please select a service, date, and time');
            return;
        }

        if (!customerName || !customerEmail) {
            setError('Please provide your name and email');
            return;
        }

        try {
            setIsSubmitting(true);
            setError('');

            // Build a Date object for calculations, but we will send **local naive** ISO strings
            // (without the trailing "Z") to avoid unintentional UTC conversion that breaks
            // the backend's HH:MM key matching.
            const startDate = new Date(`${selectedDate}T${selectedTime}:00`);

            // Find selected service details
            const service = services.find(s => s.id === selectedService);
            if (!service) {
                throw new Error('Selected service not found');
            }

            // Calculate end time based on service duration
            const endDate = new Date(startDate.getTime() + service.minutes * 60000);

            // Helper to format a Date as YYYY-MM-DDTHH:MM:SS (no timezone info)
            const toLocalIso = (d: Date) => {
                const pad = (n: number) => n.toString().padStart(2, '0');
                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
                    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
            };

            const slot_start = toLocalIso(startDate);
            const slot_end = toLocalIso(endDate);

            await createBooking({
                service_id: selectedService,
                service_name: service.name,
                service_price: service.price,
                slot_start,
                slot_end,
                customer_name: customerName,
                customer_email: customerEmail,
                customer_phone: customerPhone || undefined,
                notes: notes || undefined,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

            // Redirect to bookings page on success
            router.push('/bookings?success=true');
        } catch (err: unknown) {
            console.error('Error creating booking:', err);
            setError(err instanceof Error ? err.message : 'Failed to create booking');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="max-w-2xl mx-auto bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-card">
            <h2 className="text-2xl font-bold mb-6 text-neutral-900 dark:text-white">Book an Appointment</h2>

            {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-error dark:text-red-300 rounded-md">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                    {/* Service Selection */}
                    <div>
                        <label htmlFor="service" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                            Service*
                        </label>
                        <select
                            id="service"
                            value={selectedService}
                            onChange={(e) => setSelectedService(e.target.value)}
                            className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white focus:ring-primary focus:border-primary dark:focus:border-accent"
                            required
                        >
                            <option value="">Select a service</option>
                            {services.map((service) => (
                                <option key={service.id} value={service.id}>
                                    {service.name} - ${service.price} ({service.minutes} min)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date Selection */}
                    <div>
                        <label htmlFor="date" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                            Date*
                        </label>
                        <input
                            id="date"
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white focus:ring-primary focus:border-primary dark:focus:border-accent"
                            required
                        />
                    </div>

                    {/* Time Selection */}
                    <div>
                        <label htmlFor="time" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                            Time*
                        </label>
                        {isLoading ? (
                            <div className="text-sm text-neutral-500 dark:text-neutral-400">Loading available slots...</div>
                        ) : availableSlots.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2">
                                {availableSlots
                                    .filter(slot => slot.status === 'free')
                                    .map((slot, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => setSelectedTime(slot.time)}
                                            className={`py-2 px-4 border rounded-md text-center ${selectedTime === slot.time
                                                ? 'bg-primary/10 dark:bg-primary/20 border-primary text-primary dark:text-primary-50'
                                                : 'bg-white dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200'
                                                }`}
                                        >
                                            {slot.time}
                                        </button>
                                    ))}
                            </div>
                        ) : (
                            <div className="text-sm text-neutral-500 dark:text-neutral-400">
                                No available slots for this date and service
                            </div>
                        )}
                    </div>

                    {/* Customer Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                Your Name*
                            </label>
                            <input
                                id="name"
                                type="text"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white focus:ring-primary focus:border-primary dark:focus:border-accent"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                Email*
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={customerEmail}
                                onChange={(e) => setCustomerEmail(e.target.value)}
                                className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white focus:ring-primary focus:border-primary dark:focus:border-accent"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                Phone Number (optional)
                            </label>
                            <input
                                id="phone"
                                type="tel"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white focus:ring-primary focus:border-primary dark:focus:border-accent"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                            Notes (optional)
                        </label>
                        <textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white focus:ring-primary focus:border-primary dark:focus:border-accent"
                        ></textarea>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-primary hover:bg-primary-dark dark:bg-accent dark:hover:bg-accent-dark text-white py-2 px-4 rounded-md disabled:opacity-70 transition-colors"
                    >
                        {isSubmitting ? 'Submitting...' : 'Book Appointment'}
                    </button>
                </div>
            </form>
        </div>
    );
}