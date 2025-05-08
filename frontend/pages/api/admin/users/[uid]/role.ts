import type { NextApiRequest, NextApiResponse } from 'next';
import httpClient, { HttpClientError } from '../../../../../lib/httpClient';

const apiUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

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
        httpClient.setAuthToken(token as string);
        await httpClient.post(`${apiUrl}/admin/users/${uid}/role`, req.body);
        // The backend returns 204 No Content on success
        return res.status(204).end();
    } catch (error: unknown) {
        console.error(`Error setting role for user ${uid}:`, error);
        if ((error as HttpClientError).status) {
            const httpError = error as HttpClientError;
            return res.status(httpError.status || 500).json({
                error: httpError.data || 'Failed to set role'
            });
        }
        return res.status(500).json({ error: 'An error occurred' });
    }
} 