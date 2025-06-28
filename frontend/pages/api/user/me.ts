import { NextApiRequest, NextApiResponse } from 'next';
import { httpClient } from '../../../lib/backend-client';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }

    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Authorization required' });
    }

    try {
        httpClient.setAuthToken(token);
        const userData = await httpClient.get('/users/me');
        return res.status(200).json(userData);
    } catch (error: unknown) {
        console.error('User API error:', error);
        
        if (error && typeof error === 'object' && 'response' in error) {
            const httpError = error as { response: { status: number; data?: { detail?: string } } };
            return res.status(httpError.response.status).json({
                error: httpError.response.data?.detail || 'Request failed'
            });
        }
        
        return res.status(500).json({ error: 'Internal server error' });
    }
}