import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const apiUrl = process.env.BACKEND_API_BASE || 'http://localhost:8000';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id } = req.query;
    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const response = await axios.post(
            `${apiUrl}/bookings/${id}/approval`,
            req.body,
            {
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                }
            }
        );

        return res.status(200).json(response.data);
    } catch (error: unknown) {
        console.error('Error updating booking approval status:',
            axios.isAxiosError(error) ? error.response?.data || error.message : error);

        // Forward the backend's error status and message if available
        if (axios.isAxiosError(error) && error.response) {
            return res.status(error.response.status || 500).json({
                error: error.response.data?.detail || 'Failed to update booking'
            });
        }

        return res.status(500).json({
            error: 'An error occurred while processing your request'
        });
    }
} 