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

        // Use the backend client which handles authentication automatically
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
