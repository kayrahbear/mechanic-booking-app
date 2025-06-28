import { NextApiRequest, NextApiResponse } from 'next';
import { httpClient } from '../../../../lib/backend-client';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { customerId } = req.query;
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Authorization required' });
    }

    if (!customerId || typeof customerId !== 'string') {
        return res.status(400).json({ error: 'Customer ID required' });
    }

    try {
        httpClient.setAuthToken(token);

        switch (req.method) {
            case 'POST':
                // Add vehicle to customer
                const response = await httpClient.post(
                    `/customers/${customerId}/vehicles`,
                    req.body
                );
                return res.status(201).json(response);

            default:
                res.setHeader('Allow', ['POST']);
                return res.status(405).json({ error: `Method ${req.method} not allowed` });
        }
    } catch (error: unknown) {
        console.error('Customer vehicles API error:', error);
        
        if (error && typeof error === 'object' && 'response' in error) {
            const httpError = error as { response: { status: number; data?: { detail?: string } } };
            return res.status(httpError.response.status).json({
                error: httpError.response.data?.detail || 'Request failed'
            });
        }
        
        return res.status(500).json({ error: 'Internal server error' });
    }
}