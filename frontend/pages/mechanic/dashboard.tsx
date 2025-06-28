import { useEffect, useState } from 'react';
import Head from 'next/head';
import ProtectedRoute from '../../lib/protected-route';
import { useAuth } from '../../lib/auth-context';
import { Booking, MechanicSchedule } from '../../lib/types';
import MechanicAvailabilityManager from '../../components/MechanicAvailabilityManager';
import PendingAppointmentsList from '../../components/PendingAppointmentsList';
import UpcomingAppointmentsList from '../../components/UpcomingAppointmentsList';
import ServiceManager from '../../components/ServiceManager';
import CustomerManager from '../../components/CustomerManager';
import { getPendingBookings, getUpcomingBookings, approveBooking, denyBooking, updateMechanicAvailability } from '../../lib/api';
import { User } from 'firebase/auth';

// Wrapper component to handle async token for ServiceManager
function ServiceManagerWrapper({ user }: { user: User }) {
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const getToken = async () => {
            try {
                const idToken = await user.getIdToken();
                setToken(idToken);
            } catch (error) {
                console.error('Error getting token:', error);
            }
        };
        getToken();
    }, [user]);

    if (!token) {
        return (
            <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return <ServiceManager />;
}

export default function MechanicDashboard() {
    const { user, userRole } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
    const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
    const [isUpdatingAvailability, setIsUpdatingAvailability] = useState(false);
    const [isProcessingBooking, setIsProcessingBooking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'pending' | 'upcoming' | 'availability' | 'services' | 'customers'>('pending');
    const [mechanicSchedule, setMechanicSchedule] = useState<MechanicSchedule | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                if (user) {
                    // Fetch pending bookings
                    const pendingBookingsData = await getPendingBookings();
                    setPendingBookings(pendingBookingsData);

                    // Fetch upcoming bookings
                    const upcomingBookingsData = await getUpcomingBookings();
                    setUpcomingBookings(upcomingBookingsData);

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
                // Use the actual API endpoint now
                await updateMechanicAvailability(schedule);

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
                const updatedBooking = await approveBooking(bookingId, notes);

                // Update the local state to remove the processed booking from pending
                setPendingBookings(pendingBookings.filter(booking => booking.id !== bookingId));

                // Add the approved booking to upcoming bookings
                setUpcomingBookings([...upcomingBookings, updatedBooking]);
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
                await denyBooking(bookingId, notes);

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
                        <div className="bg-white shadow rounded-lg p-6 mb-6 dark:bg-neutral-800">
                            <h2 className="text-xl font-semibold mb-4">Welcome, {user?.displayName || user?.email}</h2>
                            <p className="text-gray-600">Role: {userRole}</p>
                            {error && <p className="text-red-600 mt-2">{error}</p>}
                        </div>

                        <div className="flex border-b mb-6">
                            <button
                                className={`py-2 px-4 font-medium ${activeTab === 'pending' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                onClick={() => setActiveTab('pending')}
                            >
                                Pending Appointments {pendingBookings.length > 0 && `(${pendingBookings.length})`}
                            </button>
                            <button
                                className={`py-2 px-4 font-medium ${activeTab === 'upcoming' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                onClick={() => setActiveTab('upcoming')}
                            >
                                Upcoming Appointments {upcomingBookings.length > 0 && `(${upcomingBookings.length})`}
                            </button>
                            <button
                                className={`py-2 px-4 font-medium ${activeTab === 'availability' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                onClick={() => setActiveTab('availability')}
                            >
                                Manage Availability
                            </button>
                            <button
                                className={`py-2 px-4 font-medium ${activeTab === 'services' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                onClick={() => setActiveTab('services')}
                            >
                                Manage Services
                            </button>
                            <button
                                className={`py-2 px-4 font-medium ${activeTab === 'customers' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                onClick={() => setActiveTab('customers')}
                            >
                                Customer Management
                            </button>
                        </div>

                        {activeTab === 'pending' && (
                            <PendingAppointmentsList
                                bookings={pendingBookings}
                                onApprove={handleApproveBooking}
                                onDeny={handleDenyBooking}
                                isLoading={isProcessingBooking}
                            />
                        )}

                        {activeTab === 'upcoming' && (
                            <UpcomingAppointmentsList
                                bookings={upcomingBookings}
                            />
                        )}

                        {activeTab === 'availability' && (
                            <MechanicAvailabilityManager
                                initialSchedule={mechanicSchedule || undefined}
                                onSave={handleSaveAvailability}
                                isLoading={isUpdatingAvailability}
                            />
                        )}

                        {activeTab === 'services' && user && (
                            <ServiceManagerWrapper user={user} />
                        )}

                        {activeTab === 'customers' && (
                            <CustomerManager />
                        )}
                    </>
                )}
            </div>
        </ProtectedRoute>
    );
}
