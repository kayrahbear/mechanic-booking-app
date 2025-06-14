// frontend/components/BookingForm.tsx
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { fetchAvailableSlots, createBooking, getUserProfile, Service } from '../lib/api';
import { useAuth } from '../lib/auth-context';

interface AvailabilitySlot {
    time: string;
    status: 'free' | 'booked' | 'blocked';
}

interface Vehicle {
    id: string;
    make: string;
    model: string;
    year: number;
    vin?: string;
    is_primary: boolean;
}

interface BookingFormProps {
    services: Service[];
    initialServiceId?: string;
    initialDate?: string;
}

// Helper function to convert 24-hour time to 12-hour time with AM/PM
function formatTo12Hour(time24: string): string {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12; // Convert 0 to 12 for 12 AM
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export default function BookingForm({
    services,
    initialServiceId,
    initialDate
}: BookingFormProps) {
    const router = useRouter();
    const { user } = useAuth();
    const [selectedService, setSelectedService] = useState(initialServiceId || '');
    const [selectedDate, setSelectedDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
    const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
    const [selectedTime, setSelectedTime] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [customerCity, setCustomerCity] = useState('');
    const [customerState, setCustomerState] = useState('');
    const [customerZip, setCustomerZip] = useState('');
    const [notes, setNotes] = useState('');
    // Vehicle information
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [selectedVehicle, setSelectedVehicle] = useState('');
    const [vehicleMake, setVehicleMake] = useState('');
    const [vehicleModel, setVehicleModel] = useState('');
    const [vehicleYear, setVehicleYear] = useState<number>(new Date().getFullYear());
    const [vehicleVin, setVehicleVin] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);
    const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // To avoid missing dependency warning, memoise `loadAvailableSlots`.

    const loadAvailableSlots = useCallback(async () => {
        try {
            setIsLoading(true);
            setError('');
            // No longer passing selectedService as the backend doesn't use it anymore
            // (there's only one mechanic who can perform all services)
            const data = await fetchAvailableSlots(selectedDate);

            console.log("BookingForm received data:", data);

            // Transform the slots object to an array
            const slotsArray = Object.entries(data.slots || {}).map(([time, status]) => ({
                time,
                status: status as 'free' | 'booked' | 'blocked'
            }));

            // Sort the slots chronologically
            slotsArray.sort((a, b) => {
                // Compare times in HH:MM format
                return a.time.localeCompare(b.time);
            });

            console.log("BookingForm transformed slots:", slotsArray);

            setAvailableSlots(slotsArray);
            setSelectedTime(''); // Reset selected time when slots change
        } catch (err) {
            console.error('Error loading available slots:', err);
            setError('Failed to load available time slots');
            setAvailableSlots([]);
        } finally {
            setIsLoading(false);
        }
    }, [selectedDate]);

    // Fetch available slots when date or service changes
    useEffect(() => {
        if (selectedDate && selectedService) {
            loadAvailableSlots();
        }
    }, [selectedDate, selectedService, loadAvailableSlots]);

    // Load user profile data and vehicles to populate form
    useEffect(() => {
        async function loadUserProfileAndVehicles() {
            if (!user) return;

            try {
                setIsLoadingProfile(true);

                // First try to use the displayName directly from the user object
                if (user.displayName) {
                    setCustomerName(user.displayName);
                }

                if (user.email) {
                    setCustomerEmail(user.email);
                }

                // Then fetch the complete profile from the API to get the phone number
                const profile = await getUserProfile();

                // Only update if we got valid data and fields are still empty
                if (profile) {
                    // Only set the name if it's currently empty (to avoid overwriting user input)
                    if (profile.name && customerName === '') {
                        setCustomerName(profile.name);
                    }

                    if (profile.phone) {
                        setCustomerPhone(profile.phone);
                    }
                }

                // Load user's vehicles
                setIsLoadingVehicles(true);
                const token = await user.getIdToken();
                const vehiclesResponse = await fetch('/api/vehicles/users/me/vehicles', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (vehiclesResponse.ok) {
                    const vehiclesData = await vehiclesResponse.json();
                    setVehicles(vehiclesData);

                    // Auto-select primary vehicle if available
                    const primaryVehicle = vehiclesData.find((v: Vehicle) => v.is_primary);
                    if (primaryVehicle) {
                        setSelectedVehicle(primaryVehicle.id);
                        setVehicleMake(primaryVehicle.make);
                        setVehicleModel(primaryVehicle.model);
                        setVehicleYear(primaryVehicle.year);
                        setVehicleVin(primaryVehicle.vin || '');
                    }
                }
            } catch (err) {
                console.error('Error loading user profile and vehicles:', err);
                // Don't show error to user, just fall back to manual entry
            } finally {
                setIsLoadingProfile(false);
                setIsLoadingVehicles(false);
            }
        }

        loadUserProfileAndVehicles();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]); // Only depend on user, ignore customerName to avoid infinite loops

    // Handle vehicle selection
    const handleVehicleSelection = (vehicleId: string) => {
        setSelectedVehicle(vehicleId);

        if (vehicleId === 'manual') {
            // Clear vehicle fields for manual entry
            setVehicleMake('');
            setVehicleModel('');
            setVehicleYear(new Date().getFullYear());
            setVehicleVin('');
        } else if (vehicleId) {
            // Auto-populate from selected vehicle
            const vehicle = vehicles.find(v => v.id === vehicleId);
            if (vehicle) {
                setVehicleMake(vehicle.make);
                setVehicleModel(vehicle.model);
                setVehicleYear(vehicle.year);
                setVehicleVin(vehicle.vin || '');
            }
        }
    };

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

        if (!customerAddress || !customerCity || !customerState || !customerZip) {
            setError('Please provide your complete address');
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
                customer_address: customerAddress,
                customer_city: customerCity,
                customer_state: customerState,
                customer_zip: customerZip,
                // Include vehicle information
                vehicle_make: vehicleMake || undefined,
                vehicle_model: vehicleModel || undefined,
                vehicle_year: vehicleYear || undefined,
                vehicle_vin: vehicleVin || undefined,
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
                        {!selectedService && (
                            <div className="text-sm text-neutral-500 dark:text-neutral-400">
                                Please select a service first
                            </div>
                        )}
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
                                            {formatTo12Hour(slot.time)}
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
                                disabled={isLoadingProfile}
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
                                disabled={isLoadingProfile}
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
                                disabled={isLoadingProfile}
                            />
                        </div>
                    </div>

                    {/* Vehicle Information */}
                    <div>
                        <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-3">Vehicle Information</h3>
                        <div className="space-y-4">
                            {/* Vehicle Selection */}
                            {vehicles.length > 0 && (
                                <div>
                                    <label htmlFor="vehicleSelect" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                        Select Vehicle
                                    </label>
                                    <select
                                        id="vehicleSelect"
                                        value={selectedVehicle}
                                        onChange={(e) => handleVehicleSelection(e.target.value)}
                                        className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white focus:ring-primary focus:border-primary dark:focus:border-accent"
                                        disabled={isLoadingVehicles}
                                    >
                                        <option value="">Select a vehicle</option>
                                        {vehicles.map((vehicle) => (
                                            <option key={vehicle.id} value={vehicle.id}>
                                                {vehicle.year} {vehicle.make} {vehicle.model}
                                                {vehicle.is_primary && ' (Primary)'}
                                            </option>
                                        ))}
                                        <option value="manual">Enter vehicle details manually</option>
                                    </select>
                                </div>
                            )}

                            {/* Manual Vehicle Entry */}
                            {(selectedVehicle === 'manual' || vehicles.length === 0) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="vehicleMake" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                            Make
                                        </label>
                                        <input
                                            id="vehicleMake"
                                            type="text"
                                            value={vehicleMake}
                                            onChange={(e) => setVehicleMake(e.target.value)}
                                            placeholder="e.g., Honda"
                                            className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white focus:ring-primary focus:border-primary dark:focus:border-accent"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="vehicleModel" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                            Model
                                        </label>
                                        <input
                                            id="vehicleModel"
                                            type="text"
                                            value={vehicleModel}
                                            onChange={(e) => setVehicleModel(e.target.value)}
                                            placeholder="e.g., Civic"
                                            className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white focus:ring-primary focus:border-primary dark:focus:border-accent"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="vehicleYear" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                            Year
                                        </label>
                                        <select
                                            id="vehicleYear"
                                            value={vehicleYear}
                                            onChange={(e) => setVehicleYear(parseInt(e.target.value))}
                                            className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white focus:ring-primary focus:border-primary dark:focus:border-accent"
                                        >
                                            {Array.from({ length: 45 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                                <option key={year} value={year}>{year}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="vehicleVin" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                            VIN (optional)
                                        </label>
                                        <input
                                            id="vehicleVin"
                                            type="text"
                                            value={vehicleVin}
                                            onChange={(e) => setVehicleVin(e.target.value)}
                                            maxLength={17}
                                            placeholder="17-character VIN"
                                            className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white focus:ring-primary focus:border-primary dark:focus:border-accent"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Display selected vehicle info */}
                            {selectedVehicle && selectedVehicle !== 'manual' && (
                                <div className="p-3 bg-neutral-50 dark:bg-neutral-700 rounded-md">
                                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                        Selected: {vehicleYear} {vehicleMake} {vehicleModel}
                                        {vehicleVin && ` (VIN: ${vehicleVin})`}
                                    </p>
                                </div>
                            )}

                            {vehicles.length === 0 && !isLoadingVehicles && (
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md">
                                    <p className="text-sm">
                                        No saved vehicles found. You can add vehicles to your profile for faster booking in the future.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Service Address */}
                    <div>
                        <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-3">Service Location</h3>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="address" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                    Street Address*
                                </label>
                                <input
                                    id="address"
                                    type="text"
                                    value={customerAddress}
                                    onChange={(e) => setCustomerAddress(e.target.value)}
                                    placeholder="123 Main Street"
                                    className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white focus:ring-primary focus:border-primary dark:focus:border-accent"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label htmlFor="city" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                        City*
                                    </label>
                                    <input
                                        id="city"
                                        type="text"
                                        value={customerCity}
                                        onChange={(e) => setCustomerCity(e.target.value)}
                                        placeholder="City"
                                        className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white focus:ring-primary focus:border-primary dark:focus:border-accent"
                                        required
                                    />
                                </div>

                                <div>
                                    <label htmlFor="state" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                        State*
                                    </label>
                                    <input
                                        id="state"
                                        type="text"
                                        value={customerState}
                                        onChange={(e) => setCustomerState(e.target.value)}
                                        placeholder="State"
                                        className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white focus:ring-primary focus:border-primary dark:focus:border-accent"
                                        required
                                    />
                                </div>

                                <div>
                                    <label htmlFor="zip" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                        ZIP Code*
                                    </label>
                                    <input
                                        id="zip"
                                        type="text"
                                        value={customerZip}
                                        onChange={(e) => setCustomerZip(e.target.value)}
                                        placeholder="12345"
                                        className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white focus:ring-primary focus:border-primary dark:focus:border-accent"
                                        required
                                    />
                                </div>
                            </div>
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
