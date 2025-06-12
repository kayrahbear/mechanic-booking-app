import type { NextApiRequest, NextApiResponse } from 'next';
import { forwardRequest } from '../../lib/api-route-utils';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ detail: 'Method not allowed' });
    }

    console.log(`[API Route /api/bookings] Handler invoked with method: ${req.method}`);

    // The backend endpoint is /bookings
    const endpoint = '/bookings';
    
    // Configure options for the request
    const options = {
        timeout: 5000,
        // Booking creation requires user authentication
        requireAuth: true,
        // Use user authentication (Firebase token) for booking creation
        preferUserAuth: true
    };
    
    // Forward the request to the backend using our standardized utility
    return forwardRequest(req, res, endpoint, options);
}
