import type { NextApiRequest, NextApiResponse } from 'next';
import { forwardRequest } from '../../../../../lib/api-route-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    return forwardRequest(req, res, '/vehicles/users/me/vehicles', {
        requireAuth: true,
        preferUserAuth: true
    });
}
