import { useEffect, useState } from 'react';
import Head from 'next/head';
import ProtectedRoute from '../../lib/protected-route';
import { useAuth } from '../../lib/auth-context';
import { Booking, MechanicSchedule } from '../../lib/types';
import MechanicAvailabilityManager from '../../components/MechanicAvailabilityManager';
import PendingAppointmentsList from '../../components/PendingAppointmentsList';
import { getPendingBookings, approveBooking, denyBooking, updateMechanicAvailability } from '../../lib/api';

export default function MechanicDashboard() {
    const { user, userRole } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
    const [isUpdatingAvailability, setIsUpdatingAvailability] = useState(false);
    const [isProcessingBooking, setIsProcessingBooking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'availability' | 'appointments'>('appointments');
    const [mechanicSchedule, setMechanicSchedule] = useState<MechanicSchedule | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                if (user) {
                    // Fetch pending bookings
                    const token = await user.getIdToken();
                    const bookings = await getPendingBookings(token);
                    setPendingBookings(bookings);

                    // Fetch mechanic schedule 
                    // TODO: Replace with actual endpoint when available
                }
                setIsLoading(false);
            } catch (err) {
                console.error('Error fetching mechanic data:', err);
                setError('Failed to load data. Please try again.');
                setIsLoading(false);
            }
        };

        if (user) {
            fetchData();
        }
    }, [user]);

    const handleSaveAvailability = async (schedule: MechanicSchedule) => {
        setIsUpdatingAvailability(true);
        setError(null);
        try {
            if (user) {
                const token = await user.getIdToken();
                // Use the actual API endpoint now
                await updateMechanicAvailability(token, schedule);

                setMechanicSchedule(schedule);
                // Update success message
                alert('Schedule saved successfully!');
            }
        } catch (err) {
            console.error('Error saving availability:', err);
            setError('Failed to save availability. Please try again.');
        } finally {
            setIsUpdatingAvailability(false);
        }
    };

    const handleApproveBooking = async (bookingId: string, notes?: string) => {
        setIsProcessingBooking(true);
        setError(null);
        try {
            if (user) {
                const token = await user.getIdToken();
                await approveBooking(token, bookingId, notes);

                // Update the local state to remove the processed booking
                setPendingBookings(pendingBookings.filter(booking => booking.id !== bookingId));
            }
        } catch (err) {
            console.error('Error approving booking:', err);
            setError('Failed to approve booking. Please try again.');
        } finally {
            setIsProcessingBooking(false);
        }
    };

    const handleDenyBooking = async (bookingId: string, notes?: string) => {
        setIsProcessingBooking(true);
        setError(null);
        try {
            if (user) {
                const token = await user.getIdToken();
                await denyBooking(token, bookingId, notes);

                // Update the local state to remove the processed booking
                setPendingBookings(pendingBookings.filter(booking => booking.id !== bookingId));
            }
        } catch (err) {
            console.error('Error denying booking:', err);
            setError('Failed to deny booking. Please try again.');
        } finally {
            setIsProcessingBooking(false);
        }
    };

    return (
        <ProtectedRoute requiredRole="mechanic">
            <Head>
                <title>Mechanic Dashboard</title>
            </Head>
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-6">Mechanic Dashboard</h1>

                {isLoading ? (
                    <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : (
                    <>
                        <div className="bg-white shadow rounded-lg p-6 mb-6">
                            <h2 className="text-xl font-semibold mb-4">Welcome, {user?.displayName || user?.email}</h2>
                            <p className="text-gray-600">Role: {userRole}</p>
                            {error && <p className="text-red-600 mt-2">{error}</p>}
                        </div>

                        <div className="flex border-b mb-6">
                            <button
                                className={`py-2 px-4 font-medium ${activeTab === 'appointments' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                onClick={() => setActiveTab('appointments')}
                            >
                                Pending Appointments {pendingBookings.length > 0 && `(${pendingBookings.length})`}
                            </button>
                            <button
                                className={`py-2 px-4 font-medium ${activeTab === 'availability' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                onClick={() => setActiveTab('availability')}
                            >
                                Manage Availability
                            </button>
                        </div>

                        {activeTab === 'appointments' && (
                            <PendingAppointmentsList
                                bookings={pendingBookings}
                                onApprove={handleApproveBooking}
                                onDeny={handleDenyBooking}
                                isLoading={isProcessingBooking}
                            />
                        )}

                        {activeTab === 'availability' && (
                            <MechanicAvailabilityManager
                                initialSchedule={mechanicSchedule || undefined}
                                onSave={handleSaveAvailability}
                                isLoading={isUpdatingAvailability}
                            />
                        )}
                    </>
                )}
            </div>
        </ProtectedRoute>
    );
} 