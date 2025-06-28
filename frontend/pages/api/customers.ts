import type { NextApiRequest, NextApiResponse } from 'next';
import { forwardRequest } from '../../lib/api-route-utils';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Allow GET (list customers) and POST (create customer)
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ detail: 'Method not allowed' });
    }

    console.log(`[API Route /api/customers] Handler invoked with method: ${req.method}`);

    // The endpoint is /customers
    const endpoint = '/customers';
    
    // Configure options for the request
    const options = {
        timeout: 10000, // Longer timeout for customer operations
        // Customer management requires authentication
        requireAuth: true,
        // Always use user authentication for customer management
        preferUserAuth: true
    };
    
    // Forward the request to the backend using our standardized utility
    return forwardRequest(req, res, endpoint, options);
}