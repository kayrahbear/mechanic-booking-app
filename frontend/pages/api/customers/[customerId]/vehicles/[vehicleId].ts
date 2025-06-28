import { NextApiRequest, NextApiResponse } from 'next';
import httpClient, { HttpClientError } from '../../../../../lib/httpClient';

const apiUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { customerId, vehicleId } = req.query;
    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).json({ error: 'Authorization required' });
    }

    if (!customerId || typeof customerId !== 'string') {
        return res.status(400).json({ error: 'Customer ID required' });
    }

    if (!vehicleId || typeof vehicleId !== 'string') {
        return res.status(400).json({ error: 'Vehicle ID required' });
    }

    try {
        httpClient.setAuthToken(token as string);

        switch (req.method) {
            case 'PUT':
                // Update vehicle
                const updateResponse = await httpClient.put(
                    `${apiUrl}/customers/${customerId}/vehicles/${vehicleId}`,
                    req.body
                );
                return res.status(200).json(updateResponse);

            case 'DELETE':
                // Delete vehicle
                await httpClient.delete(`${apiUrl}/customers/${customerId}/vehicles/${vehicleId}`);
                return res.status(200).json({ message: 'Vehicle deleted successfully' });

            default:
                res.setHeader('Allow', ['PUT', 'DELETE']);
                return res.status(405).json({ error: `Method ${req.method} not allowed` });
        }
    } catch (error: unknown) {
        console.error('Customer vehicle API error:', error);
        
        if ((error as HttpClientError).status) {
            const httpError = error as HttpClientError;
            return res.status(httpError.status || 500).json({
                error: httpError.data || 'Request failed'
            });
        }
        
        return res.status(500).json({ error: 'Internal server error' });
    }
}