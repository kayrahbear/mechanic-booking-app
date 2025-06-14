import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from './auth-context';
import ThemeToggle from '../components/ThemeToggle';

export default function Nav() {
    const { user, logout, loading, userRole } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        const { success } = await logout();
        if (success) {
            router.push('/login');
        }
    };

    const isActive = (path: string) => router.pathname === path;
    const startsWith = (path: string) => router.pathname.startsWith(path);

    return (
        <nav className="bg-neutral-50 dark:bg-neutral-800 shadow-card">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <Link href="/" className="text-xl font-bold text-primary dark:text-white">
                                Monkey Boi Garage
                            </Link>
                        </div>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            <Link href="/" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/') ? 'border-primary dark:border-accent text-neutral-900 dark:text-white' : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
                                Home
                            </Link>
                            <Link href="/services" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/services') ? 'border-primary dark:border-accent text-neutral-900 dark:text-white' : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
                                Services
                            </Link>
                            {userRole === 'customer' && (
                                <Link href="/bookings" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/bookings') ? 'border-primary dark:border-accent text-neutral-900 dark:text-white' : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
                                    My Appointments
                                </Link>
                            )}
                            {(userRole === 'mechanic' || userRole === 'admin') && (
                                <Link href="/mechanic/dashboard" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${startsWith('/mechanic') ? 'border-primary dark:border-accent text-neutral-900 dark:text-white' : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
                                    Mechanic Dashboard
                                </Link>
                            )}
                            {userRole === 'admin' && (
                                <Link href="/admin/users" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${startsWith('/admin') ? 'border-primary dark:border-accent text-neutral-900 dark:text-white' : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
                                    Admin Panel
                                </Link>
                            )}
                        </div>
                    </div>
                    <div className="hidden sm:ml-6 sm:flex sm:items-center">
                        <ThemeToggle />
                        {!loading && (
                            user ? (
                                <div className="flex items-center space-x-4">
                                    <span className="text-sm text-neutral-700 dark:text-neutral-300">
                                        {user.email}
                                        {userRole && (
                                            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                                {userRole}
                                            </span>
                                        )}
                                    </span>
                                    <Link
                                        href="/profile"
                                        className={`bg-white dark:bg-neutral-700 px-3 py-1.5 border ${isActive('/profile') ? 'border-primary dark:border-accent' : 'border-neutral-300 dark:border-neutral-600'} rounded-md text-sm font-medium ${isActive('/profile') ? 'text-primary dark:text-accent' : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-600'}`}
                                    >
                                        Profile
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="bg-white dark:bg-neutral-700 px-3 py-1.5 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-600"
                                    >
                                        Sign out
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center space-x-4">
                                    <Link
                                        href="/login"
                                        className="px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-primary dark:text-neutral-200 hover:text-primary-dark dark:hover:text-white"
                                    >
                                        Sign in
                                    </Link>
                                    <Link
                                        href="/register"
                                        className="px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark dark:bg-accent dark:hover:bg-amber-500"
                                    >
                                        Sign up
                                    </Link>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
