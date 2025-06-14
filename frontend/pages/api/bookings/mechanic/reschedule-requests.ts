import type { NextApiRequest, NextApiResponse } from 'next';
import httpClient, { HttpClientError } from '../../../../lib/httpClient';

const apiUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        httpClient.setAuthToken(token);
        const data = await httpClient.get(`${apiUrl}/bookings/mechanic/reschedule-requests`);

        return res.status(200).json(data);
    } catch (error: unknown) {
        console.error('Error fetching reschedule requests:',
            (error as HttpClientError).status
                ? `Status: ${(error as HttpClientError).status}, Data: ${(error as HttpClientError).data}`
                : error);

        // Forward the backend's error status and message if available
        if ((error as HttpClientError).status) {
            const httpError = error as HttpClientError;
            return res.status(httpError.status || 500).json({
                error: httpError.data || 'Failed to fetch reschedule requests'
            });
        }

        return res.status(500).json({
            error: 'An error occurred while processing your request'
        });
    }
}