import type { NextApiRequest, NextApiResponse } from 'next';
import { forwardRequest } from '../../../../../../lib/api-route-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { vehicleId } = req.query;

    if (!vehicleId || typeof vehicleId !== 'string') {
        return res.status(400).json({ error: 'Vehicle ID is required' });
    }

    return forwardRequest(req, res, `/vehicles/users/me/vehicles/${vehicleId}`, {
        requireAuth: true,
        preferUserAuth: true
    });
}
