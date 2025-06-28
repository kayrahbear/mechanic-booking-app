import type { NextApiRequest, NextApiResponse } from 'next';
import httpClient, { HttpClientError } from '../../../../lib/httpClient';

const apiUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Only allow POST requests for sending invitations
    if (req.method !== 'POST') {
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
        
        const data = await httpClient.post(`${apiUrl}/customers/${customerId}/invite`, req.body);
        return res.status(200).json(data);
        
    } catch (error: unknown) {
        console.error(`Error sending invitation to customer ${customerId}:`, error);
        if ((error as HttpClientError).status) {
            const httpError = error as HttpClientError;
            return res.status(httpError.status || 500).json({
                error: httpError.data || 'Failed to send invitation'
            });
        }
        return res.status(500).json({ error: 'An error occurred' });
    }
}