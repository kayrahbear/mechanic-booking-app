import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ detail: 'Method not allowed' });
    }

    try {
        // Get the backend API URL from environment variables
        const apiBase = process.env.BACKEND_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

        // Extract query parameters
        const { day, service_id } = req.query;

        // Build the backend URL
        const backendUrl = `${apiBase}/availability?day=${day}${service_id ? `&service_id=${service_id}` : ''}`;

        // Forward the request to the backend API
        const response = await fetch(backendUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Get the response data
        const data = await response.json();

        // Return the result
        return res.status(response.status).json(data);
    } catch (error: unknown) {
        console.error('Error fetching availability:', error);
        return res.status(500).json({
            detail: error instanceof Error ? error.message : 'Failed to fetch availability'
        });
    }
}
