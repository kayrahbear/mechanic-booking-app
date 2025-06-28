import type { NextApiRequest, NextApiResponse } from 'next';
import httpClient, { HttpClientError } from '../../../lib/httpClient';

const apiUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Allow GET (get customer), PUT (update customer), and DELETE (delete customer)
    if (req.method !== 'GET' && req.method !== 'PUT' && req.method !== 'DELETE') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { customerId } = req.query;

    if (!customerId || typeof customerId !== 'string') {
        return res.status(400).json({ error: 'Customer ID is required' });
    }

    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        httpClient.setAuthToken(token as string);
        
        const endpoint = `${apiUrl}/customers/${customerId}`;
        
        if (req.method === 'GET') {
            const data = await httpClient.get(endpoint);
            return res.status(200).json(data);
        } else if (req.method === 'PUT') {
            const data = await httpClient.put(endpoint, req.body);
            return res.status(200).json(data);
        } else if (req.method === 'DELETE') {
            await httpClient.delete(endpoint);
            return res.status(204).end();
        }
        
    } catch (error: unknown) {
        console.error(`Error with customer ${customerId}:`, error);
        if ((error as HttpClientError).status) {
            const httpError = error as HttpClientError;
            return res.status(httpError.status || 500).json({
                error: httpError.data || 'Failed to process customer request'
            });
        }
        return res.status(500).json({ error: 'An error occurred' });
    }
}