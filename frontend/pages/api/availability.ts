import type { NextApiRequest, NextApiResponse } from 'next';
import backendClient, { BackendClientError } from '../../lib/backendClient';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ detail: 'Method not allowed' });
    }

    try {
        // Extract query parameters
        const { date } = req.query;

        // Build the endpoint with query parameters
        const endpoint = `/availability?date=${date}`;

        console.log(`[API Route /api/availability] Calling backend endpoint: ${endpoint}`);

        // If authorization header is present, forward it
        if (req.headers.authorization) {
            console.log(`[API Route /api/availability] Forwarding user's authorization token to backend`);
            
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
            
            console.log(`[API Route /api/availability] Backend response with user token successful`);
            
            return res.status(response.status).json(data);
        }
        
        // Otherwise use service-to-service authentication
        const data = await backendClient.get(endpoint, {
            timeout: 5000
        });

        // Log the response data for debugging
        console.log(`[API Route /api/availability] Backend response:`, JSON.stringify(data).substring(0, 200) + "...");

        // Return the result
        return res.status(200).json(data);
    } catch (error: unknown) {
        console.error('Error fetching availability:', error);

        if ((error as BackendClientError).status) {
            const backendError = error as BackendClientError;
            console.error('[API Route /api/availability] Backend error details:', {
                message: backendError.message,
                status: backendError.status,
                data: backendError.data
            });
            return res.status(backendError.status || 500).json({
                detail: backendError.data || 'Failed to fetch availability'
            });
        }

        return res.status(500).json({
            detail: error instanceof Error ? error.message : 'Failed to fetch availability'
        });
    }
}
