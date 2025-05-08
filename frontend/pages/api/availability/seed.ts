import { NextApiRequest, NextApiResponse } from 'next';
import httpClient, { HttpClientError } from '../../../lib/httpClient';

const backendBaseUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // Set the authorization token from the request
        const token = req.headers.authorization;
        httpClient.setAuthToken(token as string);

        // Forward the request to the backend
        const data = await httpClient.post(`${backendBaseUrl}/availability/seed`, req.body);

        return res.status(200).json(data);
    } catch (error: unknown) {
        console.error('Error seeding availability:', error);

        if ((error as HttpClientError).status) {
            const httpError = error as HttpClientError;
            return res.status(httpError.status || 500).json({
                message: httpError.data || 'Failed to seed availability',
            });
        }

        return res.status(500).json({
            message: 'Failed to seed availability',
        });
    }
} 