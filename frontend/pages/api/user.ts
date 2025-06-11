import type { NextApiRequest, NextApiResponse } from 'next';
import { forwardRequest } from '../../lib/api-route-utils';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Only allow GET and PUT requests
    if (req.method !== 'GET' && req.method !== 'PUT') {
        return res.status(405).json({ detail: 'Method not allowed' });
    }

    console.log(`[API Route /api/user] Handler invoked with method: ${req.method}`);

    // The endpoint is /users/me
    const endpoint = '/users/me';
    
    // Configure options for the request
    const options = {
        timeout: 5000,
        // User profile always requires authentication
        requireAuth: true,
        // Always use user authentication for user profile
        preferUserAuth: true
    };
    
    // Forward the request to the backend using our standardized utility
    return forwardRequest(req, res, endpoint, options);
}
