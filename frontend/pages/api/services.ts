import type { NextApiRequest, NextApiResponse } from 'next';
import backendClient, { BackendClientError } from '../../lib/backendClient';

console.log(`[API Route /api/services] Using backend client for service-to-service authentication`);

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    console.log(`[API Route /api/services] Handler invoked with method: ${req.method}`); // Log entry

    try {
        switch (req.method) {
            case 'GET':
                console.log(`[API Route /api/services] GET request`);
                
                // Check if requesting all services (including inactive)
                const includeInactive = req.query.all === 'true';
                const endpoint = includeInactive ? '/services/all' : '/services';
                
                console.log(`[API Route /api/services] Attempting to fetch from backend: ${endpoint}`);
                
                // If requesting all services and authorization header is present, forward it
                if (includeInactive && req.headers.authorization) {
                    console.log(`[API Route /api/services] Forwarding user's authorization token to backend`);
                    
                    // Get the backend API URL from environment variables
                    const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";
                    
                    // Forward the Authorization header from the client request
                    const headers: Record<string, string> = {
                        'Content-Type': 'application/json',
                        'Authorization': req.headers.authorization as string
                    };
                    
                    // Make the request with the user's token
                    const response = await fetch(`${apiBase}${endpoint}`, {
                        method: 'GET',
                        headers
                    });
                    
                    // Get the response data
                    const data = await response.json();
                    
                    console.log(`[API Route /api/services] Backend response with user token successful`);
                    console.log(`[API Route /api/services] Backend response data length: ${Array.isArray(data) ? data.length : 'N/A'}`);
                    
                    return res.status(response.status).json(data);
                }
                
                // Otherwise use service-to-service authentication
                const data = await backendClient.get(endpoint, {
                    timeout: 5000
                });

                console.log(`[API Route /api/services] Backend response successful`);
                console.log(`[API Route /api/services] Backend response data length: ${Array.isArray(data) ? data.length : 'N/A'}`);

                return res.status(200).json(data);

            case 'POST':
                console.log(`[API Route /api/services] POST request - creating service`);
                
                const createData = await backendClient.post('/services', req.body, {
                    timeout: 5000
                });

                console.log(`[API Route /api/services] Service created successfully`);
                return res.status(201).json(createData);

            case 'PUT':
                console.log(`[API Route /api/services] PUT request - updating service`);
                
                const serviceId = req.query.id as string;
                if (!serviceId) {
                    return res.status(400).json({ error: 'Service ID is required for updates' });
                }

                const updateData = await backendClient.put(`/services/${serviceId}`, req.body, {
                    timeout: 5000
                });

                console.log(`[API Route /api/services] Service updated successfully`);
                return res.status(200).json(updateData);

            case 'DELETE':
                console.log(`[API Route /api/services] DELETE request - deleting service`);
                
                const deleteServiceId = req.query.id as string;
                if (!deleteServiceId) {
                    return res.status(400).json({ error: 'Service ID is required for deletion' });
                }

                await backendClient.delete(`/services/${deleteServiceId}`, {
                    timeout: 5000
                });

                console.log(`[API Route /api/services] Service deleted successfully`);
                return res.status(200).json({ message: 'Service deleted successfully' });

            default:
                console.log(`[API Route /api/services] Method not allowed: ${req.method}`);
                res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
                return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
        }

    } catch (error: unknown) {
        console.error(`[API Route /api/services] Error with ${req.method} request:`, error);

        if ((error as BackendClientError).status) {
            const backendError = error as BackendClientError;
            console.error('[API Route /api/services] Backend error details:', {
                message: backendError.message,
                status: backendError.status,
                data: backendError.data
            });
            // Forward backend error status and detail if possible
            return res.status(backendError.status || 500).json({
                error: backendError.data || `Failed to ${req.method?.toLowerCase() || 'process'} service`
            });
        } else {
            console.error('[API Route /api/services] Network or other error:', error);
        }

        // Generic internal server error
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
