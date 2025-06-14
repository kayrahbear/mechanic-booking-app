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
                                    Dashboard
                                </Link>
                            )}
                            {userRole === 'admin' && (
                                <Link href="/admin/users" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${startsWith('/admin') ? 'border-primary dark:border-accent text-neutral-900 dark:text-white' : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
                                    Admin
                                </Link>
                            )}
                        </div>
                    </div>
                    <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
                        {/* Schedule Appointment Button - Always visible */}
                        <Link
                            href="/book"
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-colors"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Schedule Appointment
                        </Link>
                        
                        <ThemeToggle />
                        
                        {!loading && (
                            user ? (
                                <div className="flex items-center space-x-3">
                                    {userRole && (
                                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border">
                                            {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                                        </span>
                                    )}
                                    <div className="relative">
                                        <button className="flex items-center space-x-1 text-sm text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white focus:outline-none">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                        {/* User menu dropdown - hidden for now, can be implemented later */}
                                    </div>
                                    <Link
                                        href="/profile"
                                        className="text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                                    >
                                        Profile
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                                    >
                                        Sign out
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center space-x-3">
                                    <Link
                                        href="/login"
                                        className="text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                                    >
                                        Sign in
                                    </Link>
                                    <Link
                                        href="/register"
                                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark dark:bg-accent dark:hover:bg-amber-500 shadow-sm"
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
