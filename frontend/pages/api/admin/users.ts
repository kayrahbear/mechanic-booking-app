import type { NextApiRequest, NextApiResponse } from 'next';
import httpClient, { HttpClientError } from '../../../lib/httpClient';

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
        httpClient.setAuthToken(token as string);
        const data = await httpClient.get(`${apiUrl}/admin/users`);
        return res.status(200).json(data);
    } catch (error: unknown) {
        console.error('Error listing users:', error);
        if ((error as HttpClientError).status) {
            const httpError = error as HttpClientError;
            return res.status(httpError.status || 500).json({
                error: httpError.data || 'Failed to list users'
            });
        }
        return res.status(500).json({ error: 'An error occurred' });
    }
} 