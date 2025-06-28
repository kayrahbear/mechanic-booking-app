import { useState, useEffect } from 'react';
import { useAuth } from './auth-context';
import { FirestoreUser } from './types';

export function useCurrentUser() {
    const { user: authUser } = useAuth();
    const [firestoreUser, setFirestoreUser] = useState<FirestoreUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchFirestoreUser = async () => {
            if (!authUser) {
                setFirestoreUser(null);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                
                const token = await authUser.getIdToken();
                const response = await fetch('/api/user/me', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch user data');
                }

                const userData = await response.json();
                setFirestoreUser(userData);
            } catch (err) {
                console.error('Error fetching Firestore user:', err);
                setError(err instanceof Error ? err.message : 'Failed to fetch user data');
                setFirestoreUser(null);
            } finally {
                setLoading(false);
            }
        };

        fetchFirestoreUser();
    }, [authUser]);

    return { firestoreUser, loading, error };
}