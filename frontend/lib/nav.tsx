import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from './auth-context';
import ThemeToggle from '../components/ThemeToggle';
import { useState, useRef, useEffect } from 'react';

export default function Nav() {
    const { user, logout, loading, userRole } = useAuth();
    const router = useRouter();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const handleLogout = async () => {
        const { success } = await logout();
        if (success) {
            router.push('/login');
        }
    };

    const isActive = (path: string) => router.pathname === path;
    const startsWith = (path: string) => router.pathname.startsWith(path);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Get user's display name or email
    const getUserDisplayName = () => {
        if (!user) return '';
        return user.displayName || user.email || 'User';
    };

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
                                <div className="relative" ref={dropdownRef}>
                                    <button
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                        className="flex items-center space-x-2 text-sm text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-md px-2 py-1"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        <span className="hidden md:block">{getUserDisplayName()}</span>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {/* Dropdown Menu */}
                                    {isDropdownOpen && (
                                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-neutral-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                                            <div className="py-1">
                                                {/* User Name */}
                                                <div className="px-4 py-2 text-sm text-neutral-900 dark:text-white font-medium border-b border-neutral-200 dark:border-neutral-700">
                                                    {getUserDisplayName()}
                                                </div>
                                                
                                                {/* User Role */}
                                                {userRole && (
                                                    <div className="px-4 py-2 border-b border-neutral-200 dark:border-neutral-700">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                                                            {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Profile Link */}
                                                <Link
                                                    href="/profile"
                                                    className="block px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white"
                                                    onClick={() => setIsDropdownOpen(false)}
                                                >
                                                    <div className="flex items-center">
                                                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                        </svg>
                                                        Profile
                                                    </div>
                                                </Link>

                                                {/* Sign Out */}
                                                <button
                                                    onClick={() => {
                                                        setIsDropdownOpen(false);
                                                        handleLogout();
                                                    }}
                                                    className="block w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white"
                                                >
                                                    <div className="flex items-center">
                                                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                        </svg>
                                                        Sign out
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                    )}
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
