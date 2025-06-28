import type { NextApiRequest, NextApiResponse } from 'next';
import httpClient, { HttpClientError } from '../../lib/httpClient';

const apiUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Allow GET (list customers) and POST (create customer)
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        httpClient.setAuthToken(token as string);
        
        if (req.method === 'GET') {
            const data = await httpClient.get(`${apiUrl}/customers`);
            return res.status(200).json(data);
        } else if (req.method === 'POST') {
            const data = await httpClient.post(`${apiUrl}/customers`, req.body);
            return res.status(201).json(data);
        }
        
    } catch (error: unknown) {
        console.error('Error with customers endpoint:', error);
        if ((error as HttpClientError).status) {
            const httpError = error as HttpClientError;
            return res.status(httpError.status || 500).json({
                error: httpError.data || 'Failed to process customers request'
            });
        }
        return res.status(500).json({ error: 'An error occurred' });
    }
}