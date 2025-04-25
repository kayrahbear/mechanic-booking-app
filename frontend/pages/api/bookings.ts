import type { NextApiRequest, NextApiResponse } from 'next';

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

        // Get the backend API URL from environment variables
        const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

        // Build headers for forwarding request
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        // When running on the server (Cloud Run), obtain an identity token for backend service
        if (typeof window === 'undefined') {
            try {
                const metadataURL = `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(apiBase)}&format=full`;
                const tokenResp = await fetch(metadataURL, {
                    headers: { 'Metadata-Flavor': 'Google' }
                });

                if (tokenResp.ok) {
                    const token = await tokenResp.text();
                    headers['Authorization'] = `Bearer ${token}`;
                }
            } catch (err) {
                console.error('Failed to obtain identity token for backend call', err);
            }
        }

        // Forward the request to the backend API
        const backendUrl = `${apiBase}/bookings`;
        console.log(`[API Route /api/bookings] Calling backend URL: ${backendUrl}`);
        const response = await fetch(backendUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(bookingData)
        });

        // Get the response data
        let data;
        try {
            data = await response.json();
        } catch (error) {
            console.error('Error parsing JSON response:', error);
            data = { detail: 'No response data' };
        }

        // Return the result
        return res.status(response.status).json(data);
    } catch (error: unknown) {
        console.error('Error creating booking:', error);
        return res.status(500).json({
            detail: error instanceof Error ? error.message : 'Failed to create booking'
        });
    }
}
