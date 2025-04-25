import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchAvailableSlots } from '../../lib/api';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ detail: 'Method not allowed' });
    }

    const { date } = req.query;

    if (!date) {
        return res.status(400).json({ detail: 'Missing required parameter: date' });
    }

    try {
        const data = await fetchAvailableSlots(date as string);
        return res.status(200).json(data);
    } catch (error: unknown) {
        console.error('Error fetching availability:', error);
        return res.status(500).json({
            detail: error instanceof Error ? error.message : 'Failed to fetch availability'
        });
    }
}
