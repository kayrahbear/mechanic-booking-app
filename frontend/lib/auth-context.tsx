import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, logoutUser } from './firebase';

type AuthError = Error | unknown;

type AuthContextType = {
    user: User | null;
    loading: boolean;
    userRole: string | null;
    logout: () => Promise<{ success: boolean; error: AuthError }>;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    userRole: null,
    logout: async () => ({ success: false, error: new Error('Context not initialized') }),
});

type AuthProviderProps = {
    children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (authUser: User | null) => {
            setUser(authUser);

            if (authUser) {
                // Get user's ID token to check for custom claims
                const idTokenResult = await authUser.getIdTokenResult();

                // Determine user role from custom claims
                if (idTokenResult.claims.admin) {
                    setUserRole('admin');
                } else if (idTokenResult.claims.mechanic) {
                    setUserRole('mechanic');
                } else {
                    setUserRole('customer');
                }
            } else {
                setUserRole(null);
            }

            setLoading(false);
        });

        // Cleanup subscription
        return unsubscribe;
    }, []);

    const logout = async () => {
        return await logoutUser();
    };

    return (
        <AuthContext.Provider value={{ user, loading, userRole, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext); 