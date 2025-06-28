import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from './auth-context';
import ThemeToggle from '../components/ThemeToggle';
import { useState, useRef, useEffect } from 'react';

export default function Nav() {
    const { user, logout, loading, userRole } = useAuth();
    const router = useRouter();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    const handleLogout = async () => {
        const { success } = await logout();
        if (success) {
            router.push('/login');
        }
    };

    const isActive = (path: string) => router.pathname === path;
    const startsWith = (path: string) => router.pathname.startsWith(path);

    // Close dropdown and mobile menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
                setIsMobileMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Close mobile menu when route changes
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [router.pathname]);

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
                            {userRole === 'admin' && (
                                <Link href="/admin/users" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${startsWith('/admin') ? 'border-primary dark:border-accent text-neutral-900 dark:text-white' : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
                                    Admin
                                </Link>
                            )}
                        </div>
                    </div>
                    
                    {/* Mobile menu button */}
                    <div className="sm:hidden flex items-center space-x-2">
                        <ThemeToggle />
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsMobileMenuOpen(!isMobileMenuOpen);
                            }}
                            className="inline-flex items-center justify-center p-2 rounded-md text-neutral-400 hover:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                            aria-expanded={isMobileMenuOpen}
                        >
                            <span className="sr-only">Open main menu</span>
                            {/* Hamburger icon */}
                            <svg
                                className={`${isMobileMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                aria-hidden="true"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                            {/* Close icon */}
                            <svg
                                className={`${isMobileMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                aria-hidden="true"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
                        {userRole === 'mechanic' && (
                        <Link
                            href="/mechanic/dashboard"
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-colors"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Management Dashboard
                        </Link>
                        )}
                        {/* Schedule Appointment Button - Always visible for customers */}
                        {userRole === 'customer' && (
                        <Link
                            href="/book"
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-colors"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Schedule Appointment
                        </Link>
                        )}
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

            {/* Mobile menu */}
            {isMobileMenuOpen && (
                <div className="sm:hidden" ref={mobileMenuRef}>
                    <div className="pt-2 pb-3 space-y-1 bg-neutral-50 dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700">
                        {/* Navigation Links */}
                        <Link
                            href="/"
                            className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                                isActive('/') 
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300' 
                                    : 'border-transparent text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:text-neutral-800 dark:hover:text-neutral-200'
                            }`}
                        >
                            Home
                        </Link>
                        <Link
                            href="/services"
                            className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                                isActive('/services') 
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300' 
                                    : 'border-transparent text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:text-neutral-800 dark:hover:text-neutral-200'
                            }`}
                        >
                            Services
                        </Link>
                        {userRole === 'customer' && (
                            <Link
                                href="/bookings"
                                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                                    isActive('/bookings') 
                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300' 
                                        : 'border-transparent text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:text-neutral-800 dark:hover:text-neutral-200'
                                }`}
                            >
                                My Appointments
                            </Link>
                        )}
                        {(userRole === 'mechanic' || userRole === 'admin') && (
                            <Link
                                href="/mechanic/dashboard"
                                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                                    startsWith('/mechanic') 
                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300' 
                                        : 'border-transparent text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:text-neutral-800 dark:hover:text-neutral-200'
                                }`}
                            >
                                Dashboard
                            </Link>
                        )}
                        {userRole === 'admin' && (
                            <Link
                                href="/admin/users"
                                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                                    startsWith('/admin') 
                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300' 
                                        : 'border-transparent text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:text-neutral-800 dark:hover:text-neutral-200'
                                }`}
                            >
                                Admin
                            </Link>
                        )}
                        
                        {/* Schedule Appointment Button */}
                        <div className="px-3 py-2">
                            <Link
                                href="/book"
                                className="block w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-colors"
                            >
                                <div className="flex items-center justify-center">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Schedule Appointment
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* User section */}
                    {!loading && (
                        <div className="pt-4 pb-3 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
                            {user ? (
                                <div className="space-y-1">
                                    {/* User info */}
                                    <div className="flex items-center px-4 py-2">
                                        <div className="flex-shrink-0">
                                            <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <div className="text-base font-medium text-neutral-800 dark:text-neutral-200">
                                                {getUserDisplayName()}
                                            </div>
                                            {userRole && (
                                                <div className="mt-1">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                                                        {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* User menu items */}
                                    <Link
                                        href="/profile"
                                        className="block px-4 py-2 text-base font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                                    >
                                        <div className="flex items-center">
                                            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            Profile
                                        </div>
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="block w-full text-left px-4 py-2 text-base font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                                    >
                                        <div className="flex items-center">
                                            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                            </svg>
                                            Sign out
                                        </div>
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-1 px-4">
                                    <Link
                                        href="/login"
                                        className="block px-3 py-2 text-base font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md"
                                    >
                                        Sign in
                                    </Link>
                                    <Link
                                        href="/register"
                                        className="block px-3 py-2 text-base font-medium text-white bg-primary hover:bg-primary-dark dark:bg-accent dark:hover:bg-amber-500 rounded-md text-center"
                                    >
                                        Sign up
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </nav>
    );
}
