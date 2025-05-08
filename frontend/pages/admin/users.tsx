import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useAuth } from '../../lib/auth-context';
import ProtectedRoute from '../../lib/protected-route';
import httpClient, { HttpClientError } from '../../lib/httpClient';

interface UserData {
    uid: string;
    email: string;
    name: string;
    disabled: boolean;
    created_at: number | null;
    last_sign_in: number | null;
    roles: {
        admin: boolean;
        mechanic: boolean;
    };
}

export default function AdminUserManagement() {
    const { user } = useAuth();
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updatingRole, setUpdatingRole] = useState<string | null>(null); // Store UID of user being updated

    useEffect(() => {
        const fetchUsers = async () => {
            if (!user) return;
            setLoading(true);
            setError(null);
            try {
                const token = await user.getIdToken();
                httpClient.setAuthToken(token);
                const data = await httpClient.get<UserData[]>('/api/admin/users');
                setUsers(data);
            } catch (err) {
                console.error('Error fetching users:', err);
                const errorMsg = ((err as HttpClientError).data as { error?: string })?.error || 'Failed to load users. Ensure you are an admin.';
                setError(errorMsg);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, [user]);

    const handleRoleChange = async (uid: string, newRole: string) => {
        if (!user) return;
        setUpdatingRole(uid);
        setError(null);
        try {
            const token = await user.getIdToken();
            httpClient.setAuthToken(token);

            await httpClient.post(`/api/admin/users/${uid}/role`, { role: newRole });

            // Refresh user list after successful update
            const data = await httpClient.get<UserData[]>('/api/admin/users');
            setUsers(data);
            alert(`Role updated successfully for user ${uid}`);
        } catch (err) {
            console.error(`Error updating role for user ${uid}:`, err);
            const errorMsg = ((err as HttpClientError).data as { error?: string })?.error || 'Failed to update role.';
            setError(errorMsg);
        } finally {
            setUpdatingRole(null);
        }
    };

    const determineCurrentRole = (roles: UserData['roles']): string => {
        if (roles.admin) return 'admin';
        if (roles.mechanic) return 'mechanic';
        return 'customer';
    };

    return (
        <ProtectedRoute requiredRole="admin">
            <Head>
                <title>Admin - User Management</title>
            </Head>
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-6">User Management</h1>

                {loading && <p>Loading users...</p>}
                {error && <p className="text-red-600">Error: {error}</p>}

                {!loading && !error && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">UID</th>
                                    {/* Add more columns if needed (e.g., created_at, last_sign_in) */}
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                {users.map((u) => (
                                    <tr key={u.uid}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{u.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{u.name || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            <select
                                                value={determineCurrentRole(u.roles)}
                                                onChange={(e) => handleRoleChange(u.uid, e.target.value)}
                                                disabled={updatingRole === u.uid}
                                                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50"
                                            >
                                                <option value="customer">Customer</option>
                                                <option value="mechanic">Mechanic</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                            {updatingRole === u.uid && <span className="text-xs ml-2">Updating...</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{u.uid}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </ProtectedRoute>
    );
} 