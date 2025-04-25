import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth-context';

export default function Unauthorized() {
    const { userRole } = useAuth();
    const router = useRouter();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Access Denied
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        You don&apos;t have permission to access this page.
                    </p>
                    <p className="text-center text-sm text-gray-500">
                        Current role: {userRole || 'Not logged in'}
                    </p>
                </div>
                <div className="flex justify-center">
                    <button
                        onClick={() => router.push('/')}
                        className="group relative w-1/2 flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        </div>
    );
} 