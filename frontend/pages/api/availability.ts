import type { NextApiRequest, NextApiResponse } from 'next';
import { forwardRequest } from '../../lib/api-route-utils';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ detail: 'Method not allowed' });
    }

    console.log(`[API Route /api/availability] Handler invoked with method: GET`);

    // The endpoint is /availability with the date query parameter
    const endpoint = '/availability';
    
    // Configure options for the request
    const options = {
        timeout: 5000,
        // Prefer user authentication when available, but don't require it
        requireAuth: false,
        preferUserAuth: true
    };
    
    // Forward the request to the backend using our standardized utility
    return forwardRequest(req, res, endpoint, options);
}
