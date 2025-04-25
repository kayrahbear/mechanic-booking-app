import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const apiUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        if (req.method === 'GET') {
            // Get mechanic availability
            const response = await axios.get(
                `${apiUrl}/mechanic/availability`,
                {
                    headers: {
                        'Authorization': token
                    }
                }
            );
            return res.status(200).json(response.data);
        } else if (req.method === 'POST') {
            // Update mechanic availability
            const response = await axios.post(
                `${apiUrl}/mechanic/availability`,
                req.body,
                {
                    headers: {
                        'Authorization': token,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return res.status(200).json(response.data);
        } else {
            return res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error: unknown) {
        console.error('Error managing mechanic availability:', error);

        // Type guard for axios error with response
        if (axios.isAxiosError(error) && error.response) {
            return res.status(error.response.status || 500).json({
                error: error.response.data?.detail || 'Failed to manage mechanic availability'
            });
        }

        return res.status(500).json({
            error: 'An error occurred while processing your request'
        });
    }
} 