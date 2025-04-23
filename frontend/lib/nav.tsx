import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from './auth-context';

export default function Nav() {
    const { user, logout, loading } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        const { success } = await logout();
        if (success) {
            router.push('/login');
        }
    };

    return (
        <nav className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <Link href="/" className="text-xl font-bold text-blue-600">
                                Mechanic Scheduler
                            </Link>
                        </div>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            <Link href="/" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${router.pathname === '/' ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}>
                                Home
                            </Link>
                            <Link href="/services" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${router.pathname === '/services' ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}>
                                Services
                            </Link>
                            <Link href="/availability" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${router.pathname === '/availability' ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}>
                                Availability
                            </Link>
                            {user && (
                                <Link href="/bookings" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${router.pathname === '/bookings' ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}>
                                    My Bookings
                                </Link>
                            )}
                        </div>
                    </div>
                    <div className="hidden sm:ml-6 sm:flex sm:items-center">
                        {!loading && (
                            user ? (
                                <div className="flex items-center space-x-4">
                                    <span className="text-sm text-gray-700">{user.email}</span>
                                    <button
                                        onClick={handleLogout}
                                        className="bg-white px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        Sign out
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center space-x-4">
                                    <Link
                                        href="/login"
                                        className="px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-blue-700 hover:text-blue-800"
                                    >
                                        Sign in
                                    </Link>
                                    <Link
                                        href="/register"
                                        className="px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
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