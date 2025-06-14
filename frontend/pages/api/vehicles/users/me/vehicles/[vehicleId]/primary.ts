import type { NextApiRequest, NextApiResponse } from 'next';
import { forwardPutRequest } from '../../../../../../../lib/api-route-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'PUT') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { vehicleId } = req.query;

    if (!vehicleId || typeof vehicleId !== 'string') {
        return res.status(400).json({ error: 'Vehicle ID is required' });
    }

    return forwardPutRequest(req, res, `/vehicles/users/me/vehicles/${vehicleId}/primary`, {
        requireAuth: true,
        preferUserAuth: true
    });
}
