import type { NextApiRequest, NextApiResponse } from 'next';
import { createBooking } from '../../lib/api';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ detail: 'Method not allowed' });
    }

    try {
        // Extract booking data from request body
        const bookingData = req.body;

        // Validate required fields
        if (!bookingData.service_id || !bookingData.slot_start ||
            !bookingData.customer_name || !bookingData.customer_email) {
            return res.status(400).json({ detail: 'Missing required fields' });
        }

        // Forward the request to the backend API
        const result = await createBooking(bookingData);

        // Return the result
        return res.status(201).json(result);
    } catch (error: unknown) {
        console.error('Error creating booking:', error);
        return res.status(500).json({
            detail: error instanceof Error ? error.message : 'Failed to create booking'
        });
    }
}
