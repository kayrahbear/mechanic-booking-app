import type { NextApiRequest, NextApiResponse } from 'next';
import backendClient from '../../../../lib/backendClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { make } = req.query;

    if (!make || typeof make !== 'string') {
        return res.status(400).json({ error: 'Make parameter is required' });
    }

    try {
        const response = await backendClient.get(`/vehicles/models/${encodeURIComponent(make)}`);
        res.status(200).json(response);
    } catch (error: unknown) {
        console.error('Error fetching vehicle models:', error);
        
        if (error && typeof error === 'object' && 'status' in error) {
            const backendError = error as { status?: number; data?: { detail?: string } };
            res.status(backendError.status || 500).json({
                error: backendError.data?.detail || 'Failed to fetch vehicle models'
            });
        } else {
            res.status(500).json({
                error: 'Failed to fetch vehicle models'
            });
        }
    }
}
