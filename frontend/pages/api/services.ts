import type { NextApiRequest, NextApiResponse } from 'next';
import httpClient, { HttpClientError } from '../../lib/httpClient';

// Read the backend URL from environment variables
// Ensure this is set in your deployment environment (e.g., Cloud Run service)
const apiUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

console.log(`[API Route /api/services] Using backend API URL: ${apiUrl}`); // Log the URL being used

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    console.log(`[API Route /api/services] Handler invoked with method: ${req.method}`); // Log entry

    // Extract authorization header
    const authHeader = req.headers.authorization;
    const headers: Record<string, string> = {};
    if (authHeader) {
        headers.Authorization = authHeader;
    }

    try {
        switch (req.method) {
            case 'GET':
                console.log(`[API Route /api/services] GET request`);
                
                // Check if requesting all services (including inactive)
                const includeInactive = req.query.all === 'true';
                const endpoint = includeInactive ? `${apiUrl}/services/all` : `${apiUrl}/services`;
                
                console.log(`[API Route /api/services] Attempting to fetch from backend: ${endpoint}`);
                
                const data = await httpClient.get(endpoint, {
                    timeout: 5000,
                    headers
                });

                console.log(`[API Route /api/services] Backend response successful`);
                console.log(`[API Route /api/services] Backend response data length: ${Array.isArray(data) ? data.length : 'N/A'}`);

                return res.status(200).json(data);

            case 'POST':
                console.log(`[API Route /api/services] POST request - creating service`);
                
                const createData = await httpClient.post(`${apiUrl}/services`, req.body, {
                    timeout: 5000,
                    headers
                });

                console.log(`[API Route /api/services] Service created successfully`);
                return res.status(201).json(createData);

            case 'PUT':
                console.log(`[API Route /api/services] PUT request - updating service`);
                
                const serviceId = req.query.id as string;
                if (!serviceId) {
                    return res.status(400).json({ error: 'Service ID is required for updates' });
                }

                const updateData = await httpClient.put(`${apiUrl}/services/${serviceId}`, req.body, {
                    timeout: 5000,
                    headers
                });

                console.log(`[API Route /api/services] Service updated successfully`);
                return res.status(200).json(updateData);

            case 'DELETE':
                console.log(`[API Route /api/services] DELETE request - deleting service`);
                
                const deleteServiceId = req.query.id as string;
                if (!deleteServiceId) {
                    return res.status(400).json({ error: 'Service ID is required for deletion' });
                }

                await httpClient.delete(`${apiUrl}/services/${deleteServiceId}`, {
                    timeout: 5000,
                    headers
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

        if ((error as HttpClientError).status) {
            const httpError = error as HttpClientError;
            console.error('[API Route /api/services] HTTP error details:', {
                message: httpError.message,
                status: httpError.status,
                data: httpError.data
            });
            // Forward backend error status and detail if possible
            return res.status(httpError.status || 500).json({
                error: httpError.data || `Failed to ${req.method?.toLowerCase() || 'process'} service`
            });
        } else {
            console.error('[API Route /api/services] Network or other error:', error);
        }

        // Generic internal server error
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
