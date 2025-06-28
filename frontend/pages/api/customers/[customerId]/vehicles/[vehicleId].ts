import { NextApiRequest, NextApiResponse } from 'next';
import { httpClient } from '../../../../../lib/backend-client';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { customerId, vehicleId } = req.query;
    const token = req.headers.authorization?.replace('Bearer ', '');

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
        httpClient.setAuthToken(token);

        switch (req.method) {
            case 'PUT':
                // Update vehicle
                const updateResponse = await httpClient.put(
                    `/customers/${customerId}/vehicles/${vehicleId}`,
                    req.body
                );
                return res.status(200).json(updateResponse);

            case 'DELETE':
                // Delete vehicle
                await httpClient.delete(`/customers/${customerId}/vehicles/${vehicleId}`);
                return res.status(200).json({ message: 'Vehicle deleted successfully' });

            default:
                res.setHeader('Allow', ['PUT', 'DELETE']);
                return res.status(405).json({ error: `Method ${req.method} not allowed` });
        }
    } catch (error: unknown) {
        console.error('Customer vehicle API error:', error);
        
        if (error && typeof error === 'object' && 'response' in error) {
            const httpError = error as { response: { status: number; data?: { detail?: string } } };
            return res.status(httpError.response.status).json({
                error: httpError.response.data?.detail || 'Request failed'
            });
        }
        
        return res.status(500).json({ error: 'Internal server error' });
    }
}