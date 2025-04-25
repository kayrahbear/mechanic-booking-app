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
                <h1 className="text-3xl font-bold mb-6 text-gray-900">Your Bookings</h1>

                {showSuccess && (
                    <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-md border border-green-200">
                        <p className="font-medium">Booking created successfully!</p>
                        <p>You&apos;ll receive a confirmation email shortly.</p>
                    </div>
                )}

                {bookings.length === 0 ? (
                    <div className="bg-gray-50 p-6 rounded-lg text-center">
                        <p className="text-gray-800">You don&apos;t have any bookings yet.</p>
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
                                <div key={booking.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-lg text-gray-900">{booking.service_name}</h3>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                            booking.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                                booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                    'bg-gray-100 text-gray-800'
                                            }`}>
                                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                        </span>
                                    </div>

                                    <p className="text-gray-800 mb-4">
                                        {formattedDate} • {startTime} - {endTime}
                                    </p>

                                    {booking.notes && (
                                        <div className="mb-4">
                                            <p className="text-sm text-gray-700">Notes:</p>
                                            <p className="text-gray-800">{booking.notes}</p>
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
