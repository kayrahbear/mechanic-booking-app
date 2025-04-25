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

    const { uid } = req.query;
    const token = req.headers.authorization;

    if (!token || !uid || typeof uid !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid UID' });
    }

    try {
        await axios.post(
            `${apiUrl}/admin/users/${uid}/role`,
            req.body,
            {
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                },
            }
        );
        // The backend returns 204 No Content on success
        return res.status(204).end();
    } catch (error: unknown) {
        console.error(`Error setting role for user ${uid}:`, error);
        if (axios.isAxiosError(error) && error.response) {
            return res.status(error.response.status || 500).json({
                error: error.response.data?.detail || 'Failed to set role'
            });
        }
        return res.status(500).json({ error: 'An error occurred' });
    }
} 