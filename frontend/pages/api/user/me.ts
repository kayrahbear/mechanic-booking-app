import { NextApiRequest, NextApiResponse } from 'next';
import httpClient, { HttpClientError } from '../../../lib/httpClient';

const apiUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }

    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).json({ error: 'Authorization required' });
    }

    try {
        httpClient.setAuthToken(token as string);
        const userData = await httpClient.get(`${apiUrl}/users/me`);
        return res.status(200).json(userData);
    } catch (error: unknown) {
        console.error('User API error:', error);
        
        if ((error as HttpClientError).status) {
            const httpError = error as HttpClientError;
            return res.status(httpError.status || 500).json({
                error: httpError.data || 'Request failed'
            });
        }
        
        return res.status(500).json({ error: 'Internal server error' });
    }
}