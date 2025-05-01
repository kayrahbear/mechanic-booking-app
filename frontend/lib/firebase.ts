import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase only if it hasn't been initialized yet
let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApps()[0];
}

const auth = getAuth(app);

export const loginWithEmail = async (email: string, password: string) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { user: userCredential.user, error: null };
    } catch (error) {
        return { user: null, error };
    }
};

export const registerWithEmail = async (email: string, password: string, name: string, _phone: string) => {
    // The phone number is currently captured by the UI and passed here so that it can be
    // forwarded to a backend endpoint / cloud-function at a later stage. We intentionally
    // prefix the parameter with an underscore to signal it is not yet used. To satisfy
    // the linter we reference it via a `void` expression.
    void _phone;
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);

        // Update the user profile with name
        await updateProfile(userCredential.user, {
            displayName: name
        });

        // We can't set phoneNumber directly through updateProfile (Firebase restriction)
        // It will be stored in Firestore through the Firebase Function

        return { user: userCredential.user, error: null };
    } catch (error) {
        return { user: null, error };
    }
};

export const logoutUser = async () => {
    try {
        await signOut(auth);
        return { success: true, error: null };
    } catch (error) {
        return { success: false, error };
    }
};

export { auth }; 