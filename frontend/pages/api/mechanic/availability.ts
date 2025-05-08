import type { NextApiRequest, NextApiResponse } from 'next';
import httpClient, { HttpClientError } from '../../../lib/httpClient';

const apiUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        httpClient.setAuthToken(token as string);

        if (req.method === 'GET') {
            // Get mechanic availability
            const data = await httpClient.get(`${apiUrl}/mechanic/availability`);
            return res.status(200).json(data);
        } else if (req.method === 'POST') {
            // Update mechanic availability
            const data = await httpClient.post(`${apiUrl}/mechanic/availability`, req.body);
            return res.status(200).json(data);
        } else {
            return res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error: unknown) {
        console.error('Error managing mechanic availability:', error);

        // Type guard for HTTP error with status
        if ((error as HttpClientError).status) {
            const httpError = error as HttpClientError;
            return res.status(httpError.status || 500).json({
                error: httpError.data || 'Failed to manage mechanic availability'
            });
        }

        return res.status(500).json({
            error: 'An error occurred while processing your request'
        });
    }
} 