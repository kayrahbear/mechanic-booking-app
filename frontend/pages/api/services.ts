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
    console.log('[API Route /api/services] Handler invoked.'); // Log entry

    if (req.method !== 'GET') {
        console.log(`[API Route /api/services] Method not allowed: ${req.method}`);
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    console.log(`[API Route /api/services] Attempting to fetch from backend: ${apiUrl}/services`);

    try {
        // Forward the request to the actual backend API
        const data = await httpClient.get(`${apiUrl}/services`, {
            // Set a reasonable timeout
            timeout: 5000 // 5 seconds
        });

        console.log(`[API Route /api/services] Backend response successful`);
        console.log(`[API Route /api/services] Backend response data length: ${Array.isArray(data) ? data.length : 'N/A'}`);

        // Send the backend response back to the client
        return res.status(200).json(data);

    } catch (error: unknown) {
        console.error('[API Route /api/services] Error fetching services from backend:', error);

        if ((error as HttpClientError).status) {
            const httpError = error as HttpClientError;
            console.error('[API Route /api/services] HTTP error details:', {
                message: httpError.message,
                status: httpError.status,
                data: httpError.data
            });
            // Forward backend error status and detail if possible
            return res.status(httpError.status || 500).json({
                error: httpError.data || 'Failed to fetch services from backend'
            });
        } else {
            console.error('[API Route /api/services] Network or other error:', error);
        }

        // Generic internal server error
        return res.status(500).json({ error: 'Internal Server Error' });
    }
} 