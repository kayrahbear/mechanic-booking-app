import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth-context';
import { getUserProfile, updateUserProfile } from '../lib/api';

export default function ProfilePage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Load profile data when the user is authenticated
    useEffect(() => {
        async function loadProfile() {
            if (!user) return;

            try {
                setLoading(true);
                setError('');

                const token = await user.getIdToken();
                const profile = await getUserProfile(token);

                setName(profile.name || '');
                setPhone(profile.phone || '');
            } catch (err) {
                console.error('Error loading profile:', err);
                setError('Failed to load your profile information');
            } finally {
                setLoading(false);
            }
        }

        if (user) {
            loadProfile();
        } else if (!authLoading) {
            // Redirect to login if not authenticated
            router.push('/login?returnUrl=/profile');
        }
    }, [user, authLoading, router]);

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) return;

        if (!name.trim()) {
            setError('Name is required');
            return;
        }

        try {
            setSaving(true);
            setError('');
            setSuccess(false);

            const token = await user.getIdToken();
            await updateUserProfile(token, {
                name: name.trim(),
                phone: phone.trim() || undefined
            });

            setSuccess(true);

            // Reset the form success message after 3 seconds
            setTimeout(() => {
                setSuccess(false);
            }, 3000);
        } catch (err) {
            console.error('Error updating profile:', err);
            setError('Failed to update your profile');
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || (loading && user)) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-neutral-900">
                <div className="text-center">
                    <div className="spinner mr-2"></div>
                    <p className="mt-2 text-neutral-600 dark:text-neutral-300">Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-card">
                <h1 className="text-2xl font-bold mb-6 text-neutral-900 dark:text-white">Your Profile</h1>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-error dark:text-red-300 rounded-md">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-md">
                        Your profile has been updated successfully!
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                            Full Name*
                        </label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white focus:ring-primary focus:border-primary dark:focus:border-accent"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                            Phone Number
                        </label>
                        <input
                            id="phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white focus:ring-primary focus:border-primary dark:focus:border-accent"
                        />
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full bg-primary hover:bg-primary-dark dark:bg-accent dark:hover:bg-accent-dark text-white py-2 px-4 rounded-md disabled:opacity-70 transition-colors"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
} 