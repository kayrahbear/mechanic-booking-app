import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, logoutUser } from './firebase';

type AuthError = Error | unknown;

type AuthContextType = {
    user: User | null;
    loading: boolean;
    logout: () => Promise<{ success: boolean; error: AuthError }>;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    logout: async () => ({ success: false, error: new Error('Context not initialized') }),
});

type AuthProviderProps = {
    children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (authUser: User | null) => {
            setUser(authUser);
            setLoading(false);
        });

        // Cleanup subscription
        return unsubscribe;
    }, []);

    const logout = async () => {
        return await logoutUser();
    };

    return (
        <AuthContext.Provider value={{ user, loading, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext); 