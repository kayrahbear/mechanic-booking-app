import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// Read the backend URL from environment variables
// Ensure this is set in your deployment environment (e.g., Cloud Run service)
const apiUrl = process.env.BACKEND_API_BASE || 'http://localhost:8000'; // Use BACKEND_API_BASE

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
        const response = await axios.get(`${apiUrl}/services`, {
            // Forward any relevant headers if needed, e.g., Authorization for protected routes
            // headers: { ...req.headers }, // Be cautious forwarding all headers
            // Set a reasonable timeout
            timeout: 5000 // 5 seconds
        });

        console.log(`[API Route /api/services] Backend response status: ${response.status}`);
        console.log(`[API Route /api/services] Backend response data length: ${response.data?.length ?? 'N/A'}`);

        // Send the backend response back to the client
        return res.status(200).json(response.data);

    } catch (error: unknown) {
        console.error('[API Route /api/services] Error fetching services from backend:', error);

        if (axios.isAxiosError(error)) {
            console.error('[API Route /api/services] Axios error details:', {
                message: error.message,
                code: error.code,
                status: error.response?.status,
                data: error.response?.data
            });
            // Forward backend error status and detail if possible
            return res.status(error.response?.status || 500).json({
                error: error.response?.data?.detail || 'Failed to fetch services from backend'
            });
        } else {
            console.error('[API Route /api/services] Non-Axios error:', error);
        }

        // Generic internal server error
        return res.status(500).json({ error: 'Internal Server Error' });
    }
} 