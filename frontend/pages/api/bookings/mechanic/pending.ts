import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const apiUrl = process.env.BACKEND_URL || 'http://localhost:8000';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const response = await axios.get(
            `${apiUrl}/bookings/mechanic/pending`,
            {
                headers: {
                    'Authorization': token
                }
            }
        );

        return res.status(200).json(response.data);
    } catch (error: unknown) {
        console.error('Error fetching pending bookings:', error);

        // Type guard for axios error with response
        if (axios.isAxiosError(error) && error.response) {
            return res.status(error.response.status || 500).json({
                error: error.response.data?.detail || 'Failed to fetch pending bookings'
            });
        }

        return res.status(500).json({
            error: 'An error occurred while processing your request'
        });
    }
} 