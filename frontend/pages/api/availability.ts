import type { NextApiRequest, NextApiResponse } from 'next';
import { forwardRequest } from '../../lib/api-route-utils';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Only allow GET requests for availability
    if (req.method !== 'GET') {
        return res.status(405).json({ detail: 'Method not allowed' });
    }

    console.log(`[API Route /api/availability] Handler invoked with method: ${req.method}`);

    // The backend endpoint is /availability
    const endpoint = '/availability';
    
    // Configure options for the request
    const options = {
        timeout: 5000,
        // Availability doesn't require authentication (public endpoint)
        requireAuth: false,
        // Use backend service authentication for dynamic availability generation
        preferUserAuth: false
    };
    
    // Forward the request to the backend using our standardized utility
    return forwardRequest(req, res, endpoint, options);
}