import type { NextApiRequest, NextApiResponse } from 'next';
import { forwardRequest } from '../../../../lib/api-route-utils';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Only allow POST requests for sending invitations
    if (req.method !== 'POST') {
        return res.status(405).json({ detail: 'Method not allowed' });
    }

    const { customerId } = req.query;

    if (!customerId || typeof customerId !== 'string') {
        return res.status(400).json({ detail: 'Customer ID is required' });
    }

    console.log(`[API Route /api/customers/${customerId}/invite] Handler invoked with method: ${req.method}`);

    // The endpoint is /customers/{customerId}/invite
    const endpoint = `/customers/${customerId}/invite`;
    
    // Configure options for the request
    const options = {
        timeout: 15000, // Longer timeout for email operations
        // Customer invitation requires authentication
        requireAuth: true,
        // Always use user authentication for customer management
        preferUserAuth: true
    };
    
    // Forward the request to the backend using our standardized utility
    return forwardRequest(req, res, endpoint, options);
}