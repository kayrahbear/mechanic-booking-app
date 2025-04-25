const apiBase = process.env.BACKEND_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

export async function fetchServices() {
    const url = `${apiBase}/services`;

    // Build headers – add an identity token when running inside Cloud Run
    const headers: Record<string, string> = {};

    if (typeof window === "undefined") {
        try {
            const metadataURL = `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(apiBase)}&format=full`;
            const tokenResp = await fetch(metadataURL, {
                headers: { "Metadata-Flavor": "Google" }
            });
            console.log("identity token fetch", tokenResp.status, metadataURL);

            if (tokenResp.ok) {
                const token = await tokenResp.text();
                headers["Authorization"] = `Bearer ${token}`;
            }
        } catch (err) {
            console.error("Failed to obtain identity token for backend call", err);
        }
    }

    console.log("fetching services from", url);
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Failed to load services – ${res.status}`);
    return res.json();
}

// Function to fetch available slots for a specific date and service
export async function fetchAvailableSlots(date: string, service_id?: string) {
    // The backend expects a 'day' parameter
    const url = `${apiBase}/availability?day=${date}${service_id ? `&service_id=${service_id}` : ''}`;

    const headers: Record<string, string> = {};
    // Add auth headers if needed (similar to your fetchServices function)

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Failed to load availability – ${res.status}`);

    // The backend returns a list of Slot objects, but the frontend expects a different format
    const slots = await res.json();

    // Transform the response to match the expected format
    const slotsMap: Record<string, string> = {};

    if (Array.isArray(slots)) {
        slots.forEach(slot => {
            // Extract time from the ISO string (e.g., "2023-04-25T08:00:00" -> "08:00")
            const timeMatch = slot.start.match(/T(\d{2}:\d{2})/);
            if (timeMatch && timeMatch[1]) {
                const time = timeMatch[1];
                slotsMap[time] = slot.is_free ? 'free' : 'booked';
            }
        });
    }

    return {
        date,
        slots: slotsMap
    }
}

// Function to create a new booking
export async function createBooking(bookingData: {
    service_id: string;
    slot_start: string;
    customer_name: string;
    customer_email: string;
    customer_phone?: string;
    notes?: string;
}) {
    const url = `${apiBase}/bookings`;

    // Get auth token if needed
    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };

    // If running in browser, we'll need to add the Firebase auth token
    if (typeof window !== "undefined") {
        const token = await getFirebaseAuthToken(); // You'll need to implement this
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
    }

    const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(bookingData)
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to create booking – ${res.status}`);
    }

    return res.json();
}

// Helper to get Firebase auth token - implement this based on your authentication setup
async function getFirebaseAuthToken() {
    // If you're using Firebase auth, get the current user's ID token
    // Example (adjust based on your auth implementation):
    try {
        const { auth } = await import('./firebase');
        if (auth.currentUser) {
            return await auth.currentUser.getIdToken();
        }
    } catch (error) {
        console.error("Error getting auth token:", error);
    }
    return null;
}
