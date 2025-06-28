import type { NextApiRequest, NextApiResponse } from 'next';
import { forwardRequest } from '../../../lib/api-route-utils';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Allow GET (get customer), PUT (update customer), and DELETE (delete customer)
    if (req.method !== 'GET' && req.method !== 'PUT' && req.method !== 'DELETE') {
        return res.status(405).json({ detail: 'Method not allowed' });
    }

    const { customerId } = req.query;

    if (!customerId || typeof customerId !== 'string') {
        return res.status(400).json({ detail: 'Customer ID is required' });
    }

    console.log(`[API Route /api/customers/${customerId}] Handler invoked with method: ${req.method}`);

    // The endpoint is /customers/{customerId}
    const endpoint = `/customers/${customerId}`;
    
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