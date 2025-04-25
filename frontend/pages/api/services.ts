import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// Read the backend URL from environment variables
// Ensure this is set in your deployment environment (e.g., Cloud Run service)
const apiUrl = process.env.BACKEND_URL || 'http://localhost:8000'; // Default for local dev

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    try {
        // Forward the request to the actual backend API
        const response = await axios.get(`${apiUrl}/services`, {
            // Forward any relevant headers if needed, e.g., Authorization for protected routes
            // headers: { ...req.headers }, // Be cautious forwarding all headers
        });

        // Send the backend response back to the client
        return res.status(200).json(response.data);

    } catch (error: unknown) {
        console.error('Error fetching services from backend:', error);

        if (axios.isAxiosError(error) && error.response) {
            // Forward backend error status and detail if possible
            return res.status(error.response.status || 500).json({
                error: error.response.data?.detail || 'Failed to fetch services from backend'
            });
        }

        // Generic internal server error
        return res.status(500).json({ error: 'Internal Server Error' });
    }
} 