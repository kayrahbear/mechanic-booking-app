import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import ProtectedRoute from '../lib/protected-route';
import Link from 'next/link';

interface Booking {
    id: string;
    service_name: string;
    slot_start: string;
    slot_end: string;
    status: string;
    customer_name: string;
    customer_email: string;
    notes?: string;
    calendar_event_id?: string;
}

export const getServerSideProps: GetServerSideProps<{ bookings: Booking[] }> = async () => {
    try {
        // Replace with actual API call
        const bookings = await fetch('https://api.example.com/bookings')
            .then(res => res.json())
            .catch(() => []);

        return {
            props: {
                bookings,
            },
        };
    } catch (error) {
        console.error('Error fetching bookings:', error);
        return {
            props: {
                bookings: [],
            },
        };
    }
};

const BookingsPage = ({ bookings }: { bookings: Booking[] }) => {
    const router = useRouter();
    const { success } = router.query;
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        if (success === 'true') {
            setShowSuccess(true);
            // Clear the success parameter from URL after showing message
            const timeout = setTimeout(() => {
                router.replace('/bookings', undefined, { shallow: true });
            }, 5000);

            return () => clearTimeout(timeout);
        }
    }, [success, router]);

    return (
        <ProtectedRoute>
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-6 text-neutral-900 dark:text-white">Your Bookings</h1>

                {showSuccess && (
                    <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-md border border-green-200">
                        <p className="font-medium">Booking created successfully!</p>
                        <p>You&apos;ll receive a confirmation email shortly.</p>
                    </div>
                )}

                {bookings.length === 0 ? (
                    <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-card border border-neutral-100 dark:border-neutral-700 text-center">
                        <p className="text-neutral-800 dark:text-neutral-200">You don&apos;t have any bookings yet.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {bookings.map((booking) => {
                            // Format dates for display
                            const startDate = new Date(booking.slot_start);
                            const endDate = new Date(booking.slot_end);

                            const formattedDate = startDate.toLocaleDateString();
                            const startTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            const endTime = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                            return (
                                <div key={booking.id} className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-card border border-neutral-100 dark:border-neutral-700 mb-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-lg text-neutral-900 dark:text-white">{booking.service_name}</h3>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${booking.status === 'confirmed' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                                            booking.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                                                booking.status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                                                    'bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-300'
                                            }`}>
                                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                        </span>
                                    </div>

                                    <p className="text-neutral-800 dark:text-neutral-200 mb-4">
                                        {formattedDate} • {startTime} - {endTime}
                                    </p>

                                    {booking.notes && (
                                        <div className="mb-4">
                                            <p className="text-sm text-neutral-700 dark:text-neutral-400">Notes:</p>
                                            <p className="text-neutral-800 dark:text-neutral-200">{booking.notes}</p>
                                        </div>
                                    )}

                                    {booking.calendar_event_id && (
                                        <div className="text-sm">
                                            <span className="text-blue-700">✓</span> Added to calendar
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="mt-8 text-center">
                    <Link
                        href="/book"
                        className="inline-block bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-md"
                    >
                        Book New Appointment
                    </Link>
                </div>
            </div>
        </ProtectedRoute>
    );
};

export default BookingsPage;
