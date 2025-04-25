import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './auth-context';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: string;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
    const { user, loading, userRole } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login');
            } else if (requiredRole && userRole !== requiredRole && userRole !== 'admin') {
                // Admins can access all protected routes, others need specific roles
                router.push('/unauthorized');
            }
        }
    }, [user, loading, router, requiredRole, userRole]);

    // Show loading state while checking authentication
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    // Only render children if user is authenticated and has required role (if specified)
    if (!user) return null;
    if (requiredRole && userRole !== requiredRole && userRole !== 'admin') return null;

    return <>{children}</>;
} 