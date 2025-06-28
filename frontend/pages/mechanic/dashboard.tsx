import { useEffect, useState } from 'react';
import Head from 'next/head';
import ProtectedRoute from '../../lib/protected-route';
import { useAuth } from '../../lib/auth-context';
import { NavigationProvider, useNavigation } from '../../lib/navigation-context';
import { Booking, MechanicSchedule } from '../../lib/types';
import MechanicAvailabilityManager from '../../components/MechanicAvailabilityManager';
import PendingAppointmentsList from '../../components/PendingAppointmentsList';
import UpcomingAppointmentsList from '../../components/UpcomingAppointmentsList';
import ServiceManager from '../../components/ServiceManager';
import CustomerManager from '../../components/CustomerManager';
import Sidebar from '../../components/Sidebar';
import DashboardHeader from '../../components/DashboardHeader';
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

// Main dashboard content component
function DashboardContent() {
    const { user } = useAuth();
    const { activeSection } = useNavigation();
    const [isLoading, setIsLoading] = useState(true);
    const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
    const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
    const [isUpdatingAvailability, setIsUpdatingAvailability] = useState(false);
    const [isProcessingBooking, setIsProcessingBooking] = useState(false);
    const [error, setError] = useState<string | null>(null);
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


    // Create a combined scheduling component that includes pending and upcoming
    const renderSchedulingContent = () => (
        <div className="space-y-6">
            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">
                    {error}
                </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                        Pending Appointments
                        {pendingBookings.length > 0 && (
                            <span className="ml-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-sm px-2 py-1 rounded">
                                {pendingBookings.length}
                            </span>
                        )}
                    </h3>
                    <PendingAppointmentsList
                        bookings={pendingBookings}
                        onApprove={handleApproveBooking}
                        onDeny={handleDenyBooking}
                        isLoading={isProcessingBooking}
                    />
                </div>
                
                <div>
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                        Upcoming Appointments
                        {upcomingBookings.length > 0 && (
                            <span className="ml-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-sm px-2 py-1 rounded">
                                {upcomingBookings.length}
                            </span>
                        )}
                    </h3>
                    <UpcomingAppointmentsList bookings={upcomingBookings} />
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                    Manage Availability
                </h3>
                <MechanicAvailabilityManager
                    initialSchedule={mechanicSchedule || undefined}
                    onSave={handleSaveAvailability}
                    isLoading={isUpdatingAvailability}
                />
            </div>
        </div>
    );

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary dark:border-accent"></div>
                </div>
            );
        }

        switch (activeSection) {
            case 'scheduling':
                return renderSchedulingContent();
            case 'customers':
                return <CustomerManager />;
            case 'analytics':
                return user && <ServiceManagerWrapper user={user} />;
            default:
                return (
                    <div className="text-center py-12">
                        <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                            Coming Soon
                        </h3>
                        <p className="text-neutral-600 dark:text-neutral-400">
                            This feature is under development.
                        </p>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
            <div className="flex">
                <Sidebar />
                <div className="flex-1 md:ml-0">
                    <DashboardHeader />
                    <main className="p-6">
                        {renderContent()}
                    </main>
                </div>
            </div>
        </div>
    );
}

// Main export component with providers
export default function MechanicDashboard() {
    return (
        <ProtectedRoute requiredRole="mechanic">
            <Head>
                <title>Mechanic Dashboard</title>
            </Head>
            <NavigationProvider>
                <DashboardContent />
            </NavigationProvider>
        </ProtectedRoute>
    );
}
