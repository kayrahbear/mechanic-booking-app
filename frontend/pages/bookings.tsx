import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import ProtectedRoute from '../lib/protected-route';
import Link from 'next/link';
import apiClient from '../lib/apiClient';
import { useAuth } from '../lib/auth-context';

interface RescheduleSlot {
    start: string;
    end: string;
    priority: number;
}

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
    cancellation_reason?: string;
    cancelled_at?: string;
    reschedule_reason?: string;
    reschedule_requested_slots?: RescheduleSlot[];
    reschedule_requested_at?: string;
    reschedule_response_notes?: string;
}

const BookingsPage = () => {
    const { user } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const { success } = router.query;
    const [showSuccess, setShowSuccess] = useState(false);
    
    // Modal states
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    
    // Form states
    const [cancellationReason, setCancellationReason] = useState('');
    const [rescheduleReason, setRescheduleReason] = useState('');
    const [selectedSlots, setSelectedSlots] = useState<RescheduleSlot[]>([]);

    // Fetch bookings when user is authenticated
    useEffect(() => {
        const fetchBookings = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                const fetchedBookings = await apiClient.get<Booking[]>('/bookings');
                setBookings(fetchedBookings);
            } catch (err) {
                console.error('Error fetching bookings:', err);
                setError('Failed to load bookings. Please try again.');
                setBookings([]);
            } finally {
                setLoading(false);
            }
        };

        fetchBookings();
    }, [user]);

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

    const canCancelOrReschedule = (booking: Booking) => {
        return booking.status === 'pending' || booking.status === 'confirmed';
    };

    const handleCancelBooking = async () => {
        if (!selectedBooking) return;
        
        setActionLoading(true);
        try {
            await apiClient.post(`/bookings/${selectedBooking.id}/cancel`, {
                reason: cancellationReason || undefined
            });
            
            // Refresh bookings
            const fetchedBookings = await apiClient.get<Booking[]>('/bookings');
            setBookings(fetchedBookings);
            
            setShowCancelModal(false);
            setCancellationReason('');
            setSelectedBooking(null);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 5000);
        } catch (err) {
            console.error('Error cancelling booking:', err);
            setError('Failed to cancel booking. Please try again.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRescheduleRequest = async () => {
        if (!selectedBooking || !rescheduleReason.trim()) return;
        
        setActionLoading(true);
        try {
            // For now, we'll submit with a placeholder slot - the admin will contact them
            const currentDate = new Date(selectedBooking.slot_start);
            const placeholderSlot = {
                start: currentDate.toISOString(),
                end: new Date(currentDate.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour later
                priority: 1
            };
            
            await apiClient.post(`/bookings/${selectedBooking.id}/reschedule`, {
                reason: rescheduleReason,
                preferred_slots: [placeholderSlot]
            });
            
            // Refresh bookings
            const fetchedBookings = await apiClient.get<Booking[]>('/bookings');
            setBookings(fetchedBookings);
            
            setShowRescheduleModal(false);
            setRescheduleReason('');
            setSelectedSlots([]);
            setSelectedBooking(null);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 5000);
        } catch (err) {
            console.error('Error requesting reschedule:', err);
            setError('Failed to request reschedule. Please try again.');
        } finally {
            setActionLoading(false);
        }
    };

    const openCancelModal = (booking: Booking) => {
        setSelectedBooking(booking);
        setShowCancelModal(true);
    };

    const openRescheduleModal = (booking: Booking) => {
        setSelectedBooking(booking);
        setShowRescheduleModal(true);
    };

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

                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md border border-red-200">
                        <p className="font-medium">Error loading bookings</p>
                        <p>{error}</p>
                    </div>
                )}

                {loading ? (
                    <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-card border border-neutral-100 dark:border-neutral-700 text-center">
                        <p className="text-neutral-800 dark:text-neutral-200">Loading your bookings...</p>
                    </div>
                ) : bookings.length === 0 ? (
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
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            booking.status === 'confirmed' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                                            booking.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                                            booking.status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                                            booking.status === 'reschedule-requested' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                                            'bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-300'
                                        }`}>
                                            {booking.status === 'reschedule-requested' ? 'Reschedule Requested' : 
                                             booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
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
                                        <div className="text-sm mb-4">
                                            <span className="text-blue-700">✓</span> Added to calendar
                                        </div>
                                    )}

                                    {booking.cancellation_reason && (
                                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                                            <p className="text-sm font-medium text-red-800 dark:text-red-300">Cancellation Reason:</p>
                                            <p className="text-sm text-red-700 dark:text-red-400">{booking.cancellation_reason}</p>
                                        </div>
                                    )}

                                    {booking.reschedule_reason && (
                                        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                                            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Reschedule Request:</p>
                                            <p className="text-sm text-yellow-700 dark:text-yellow-400">{booking.reschedule_reason}</p>
                                            {booking.reschedule_response_notes && (
                                                <div className="mt-2">
                                                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Response:</p>
                                                    <p className="text-sm text-yellow-700 dark:text-yellow-400">{booking.reschedule_response_notes}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {canCancelOrReschedule(booking) && (
                                        <div className="flex gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-600">
                                            <button
                                                onClick={() => openCancelModal(booking)}
                                                className="px-3 py-1 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border border-red-300 hover:border-red-400 rounded-md transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => openRescheduleModal(booking)}
                                                className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 border border-blue-300 hover:border-blue-400 rounded-md transition-colors"
                                            >
                                                Request Reschedule
                                            </button>
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

            {/* Cancellation Modal */}
            {showCancelModal && selectedBooking && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold mb-4 text-neutral-900 dark:text-white">
                            Cancel Appointment
                        </h3>
                        <p className="text-neutral-700 dark:text-neutral-300 mb-4">
                            Are you sure you want to cancel your appointment for <strong>{selectedBooking.service_name}</strong> on {new Date(selectedBooking.slot_start).toLocaleDateString()}?
                        </p>
                        
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                Reason for cancellation (optional)
                            </label>
                            <textarea
                                value={cancellationReason}
                                onChange={(e) => setCancellationReason(e.target.value)}
                                className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                                rows={3}
                                placeholder="Let us know why you're cancelling..."
                            />
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setShowCancelModal(false);
                                    setCancellationReason('');
                                    setSelectedBooking(null);
                                }}
                                className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 border border-neutral-300 dark:border-neutral-600 rounded-md"
                                disabled={actionLoading}
                            >
                                Keep Appointment
                            </button>
                            <button
                                onClick={handleCancelBooking}
                                disabled={actionLoading}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50"
                            >
                                {actionLoading ? 'Cancelling...' : 'Cancel Appointment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reschedule Modal */}
            {showRescheduleModal && selectedBooking && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-bold mb-4 text-neutral-900 dark:text-white">
                            Request Reschedule
                        </h3>
                        <p className="text-neutral-700 dark:text-neutral-300 mb-4">
                            Request to reschedule your appointment for <strong>{selectedBooking.service_name}</strong> currently scheduled for {new Date(selectedBooking.slot_start).toLocaleDateString()}.
                        </p>
                        
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                Reason for reschedule <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={rescheduleReason}
                                onChange={(e) => setRescheduleReason(e.target.value)}
                                className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                                rows={3}
                                placeholder="Please explain why you need to reschedule..."
                                required
                            />
                        </div>

                        <div className="mb-4">
                            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                                Our team will contact you to find a suitable new time. This is just a request and your current appointment remains until we confirm a new time.
                            </p>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setShowRescheduleModal(false);
                                    setRescheduleReason('');
                                    setSelectedSlots([]);
                                    setSelectedBooking(null);
                                }}
                                className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 border border-neutral-300 dark:border-neutral-600 rounded-md"
                                disabled={actionLoading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRescheduleRequest}
                                disabled={actionLoading || !rescheduleReason.trim()}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
                            >
                                {actionLoading ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ProtectedRoute>
    );
};

export default BookingsPage;
