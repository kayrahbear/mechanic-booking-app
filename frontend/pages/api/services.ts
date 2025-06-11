import type { NextApiRequest, NextApiResponse } from 'next';
import { forwardRequest } from '../../lib/api-route-utils';

console.log(`[API Route /api/services] Using standardized API route utilities`);

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    console.log(`[API Route /api/services] Handler invoked with method: ${req.method}`);

    // Check if requesting all services (including inactive)
    const includeInactive = req.query.all === 'true';
    
    // Determine the endpoint and options based on the request
    let endpoint = '/services';
    const options = {
        timeout: 5000,
        // For /services/all, we require user auth and prefer it when available
        requireAuth: includeInactive,
        preferUserAuth: true
    };
    
    // For PUT and DELETE requests, we need to handle the service ID
    if (req.method === 'PUT' || req.method === 'DELETE') {
        const serviceId = req.query.id as string;
        if (!serviceId) {
            return res.status(400).json({ error: 'Service ID is required' });
        }
        endpoint = `/services/${serviceId}`;
    }
    
    // For /services/all, use a different endpoint
    if (includeInactive) {
        endpoint = '/services/all';
    }
    
    // Forward the request to the backend using our standardized utility
    return forwardRequest(req, res, endpoint, options);
}
