/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// NOTE: Removed unused v2 imports (onRequest, logger) to fix lint errors.
// If you need HTTPS triggers later, use functions.https.onRequest (v1 style)
// or re-import from v2 following Firebase guidelines.
import * as funcs from "firebase-functions/v1";
import * as admin from "firebase-admin";
import {UserRecord} from "firebase-functions/v1/auth";

// Initialize Firebase Admin SDK
admin.initializeApp();

const db = admin.firestore();

/**
 * Triggered when a new user is created in Firebase Authentication.
 * Creates a corresponding user document in the Firestore 'users' collection.
 */
export const createFirestoreUser = funcs.auth.user().onCreate(
  async (user: UserRecord) => {
    funcs.logger.info(`New user created: ${user.uid}, Email: ${user.email}`);

    const userRef = db.collection("users").doc(user.uid);

    const userData = {
      email: user.email || "", // Ensure email is not undefined
      name: user.displayName || "", // Use displayName if available
      phone: user.phoneNumber || null, // Use phone number if available
      role: "customer", // Default role for new users
      // mechanic_id: null, // Set this later if user becomes a mechanic
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    try {
      await userRef.set(userData);
      funcs.logger.info(
        `Successfully created Firestore user document for ${user.uid}`
      );
    } catch (error) {
      funcs.logger.error(
        `Error creating Firestore user document for ${user.uid}:`, error
      );
      // Consider adding error handling/retries if needed
    }
  });

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
