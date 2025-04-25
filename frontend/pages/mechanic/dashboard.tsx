import { useEffect, useState } from 'react';
import Head from 'next/head';
import ProtectedRoute from '../../lib/protected-route';
import { useAuth } from '../../lib/auth-context';

export default function MechanicDashboard() {
    const { user, userRole } = useAuth();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Load mechanic-specific data here
        setIsLoading(false);
    }, []);

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
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Availability Management */}
                            <div className="bg-white shadow rounded-lg p-6">
                                <h2 className="text-xl font-semibold mb-4">Manage Availability</h2>
                                <p className="text-gray-600 mb-4">Set your working hours and availability.</p>
                                <button className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded">
                                    Update Availability
                                </button>
                            </div>

                            {/* Pending Appointments */}
                            <div className="bg-white shadow rounded-lg p-6">
                                <h2 className="text-xl font-semibold mb-4">Pending Appointments</h2>
                                <p className="text-gray-600 mb-4">Review and approve upcoming appointments.</p>
                                <button className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded">
                                    View Appointments
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </ProtectedRoute>
    );
} 