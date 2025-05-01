import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const backendBaseUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // Forward the request to the backend
        const response = await axios.post(
            `${backendBaseUrl}/availability/seed`,
            req.body,
            {
                headers: {
                    Authorization: req.headers.authorization,
                    'Content-Type': 'application/json',
                },
            }
        );

        return res.status(response.status).json(response.data);
    } catch (error: unknown) {
        const axiosError = error as { response?: { status?: number; data?: { detail?: string } }; message?: string };
        console.error('Error seeding availability:', axiosError.response?.data || axiosError.message);
        return res.status(axiosError.response?.status || 500).json({
            message: axiosError.response?.data?.detail || 'Failed to seed availability',
        });
    }
} 