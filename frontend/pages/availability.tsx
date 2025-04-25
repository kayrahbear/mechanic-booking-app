import { GetServerSideProps } from 'next';
import { useState } from 'react';
import Link from 'next/link';
import { fetchAvailableSlots, fetchServices } from '../lib/api';

interface Service {
    id: string;
    name: string;
    minutes: number;
}

interface AvailabilityData {
    date: string;
    slots: Record<string, string>; // time -> status
}

interface AvailabilityPageProps {
    services: Service[];
    initialDate?: string;
    initialServiceId?: string;
    availabilityData?: AvailabilityData | null;
}

export const getServerSideProps: GetServerSideProps<AvailabilityPageProps> = async (context) => {
    try {
        const { date, service_id } = context.query;
        const services = await fetchServices();

        let availabilityData = null;

        // If both date and service_id are provided, fetch availability
        if (date && service_id) {
            try {
                availabilityData = await fetchAvailableSlots(date as string, service_id as string);
            } catch (error) {
                console.error('Error fetching availability:', error);
            }
        }

        return {
            props: {
                services,
                initialDate: (date as string) || new Date().toISOString().split('T')[0],
                initialServiceId: (service_id as string) || '',
                availabilityData
            },
        };
    } catch (error) {
        console.error('Error in getServerSideProps:', error);
        return {
            props: {
                services: [],
                initialDate: new Date().toISOString().split('T')[0],
                initialServiceId: '',
                availabilityData: null
            },
        };
    }
};

const AvailabilityPage = ({
    services,
    initialDate,
    initialServiceId,
    availabilityData
}: AvailabilityPageProps) => {
    const [selectedDate, setSelectedDate] = useState(initialDate);
    const [selectedService, setSelectedService] = useState(initialServiceId);

    const handleSearch = () => {
        if (selectedDate && selectedService) {
            window.location.href = `/availability?date=${selectedDate}&service_id=${selectedService}`;
        }
    };

    // Group time slots into morning, afternoon, evening
    const groupedSlots: {
        morning: { time: string; status: string }[];
        afternoon: { time: string; status: string }[];
        evening: { time: string; status: string }[];
    } = {
        morning: [],
        afternoon: [],
        evening: []
    };

    if (availabilityData?.slots) {
        Object.entries(availabilityData.slots).forEach(([time, status]) => {
            const hour = parseInt(time.split(':')[0]);

            if (hour < 12) {
                groupedSlots.morning.push({ time, status });
            } else if (hour < 17) {
                groupedSlots.afternoon.push({ time, status });
            } else {
                groupedSlots.evening.push({ time, status });
            }
        });
    }

    const selectedServiceName = services.find(s => s.id === selectedService)?.name || '';

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6 text-neutral-900 dark:text-white">Check Availability</h1>

            <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-card border border-neutral-100 dark:border-neutral-700 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-200 mb-1">
                            Service
                        </label>
                        <select
                            value={selectedService}
                            onChange={(e) => setSelectedService(e.target.value)}
                            className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md text-neutral-900 dark:text-neutral-200 bg-white dark:bg-neutral-700 focus:ring-primary focus:border-primary dark:focus:border-accent"
                        >
                            <option value="">Select a service</option>
                            {services.map((service) => (
                                <option key={service.id} value={service.id}>
                                    {service.name} ({service.minutes} min)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-200 mb-1">
                            Date
                        </label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md text-neutral-900 dark:text-neutral-200 bg-white dark:bg-neutral-700 focus:ring-primary focus:border-primary dark:focus:border-accent"
                        />
                    </div>

                    <div className="flex items-end">
                        <button
                            onClick={handleSearch}
                            className="inline-flex items-center justify-center px-5 py-2 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary-dark dark:bg-accent dark:hover:bg-accent-dark"
                            disabled={!selectedDate || !selectedService}
                        >
                            Check Availability
                        </button>
                    </div>
                </div>
            </div>

            {availabilityData && (
                <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-card border border-neutral-100 dark:border-neutral-700">
                    <h2 className="text-2xl font-bold mb-4 text-neutral-900 dark:text-white">
                        Available Slots for {selectedServiceName} on {selectedDate}
                    </h2>

                    {Object.entries(groupedSlots).map(([period, slots]) => slots.length > 0 && (
                        <div key={period} className="mb-6">
                            <h3 className="text-lg font-medium mb-3 capitalize text-neutral-900 dark:text-white">{period}</h3>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                {slots.map((slot: { time: string; status: string }, index) => (
                                    <div key={index} className="text-center">
                                        {slot.status === 'free' ? (
                                            <Link
                                                href={`/book?service_id=${selectedService}&date=${selectedDate}&time=${slot.time}`}
                                                className="block w-full py-2 px-3 bg-green-100 border border-green-300 text-green-800 rounded-md hover:bg-green-200"
                                            >
                                                {slot.time}
                                            </Link>
                                        ) : (
                                            <div className="py-2 px-3 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 rounded-md">
                                                {slot.time}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {Object.values(groupedSlots).every(slots => slots.length === 0) && (
                        <div className="text-center py-8 text-neutral-700 dark:text-neutral-300">
                            No available slots for this date and service.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AvailabilityPage;
