import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ detail: 'Method not allowed' });
    }

    try {
        // Get the backend API URL from environment variables
        const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

        // Extract query parameters
        const { date, service_id } = req.query;

        // Build the backend URL with the correct parameter names
        const backendUrl = `${apiBase}/availability?date=${date}${service_id ? `&service_id=${service_id}` : ''}`;

        console.log(`[API Route /api/availability] Calling backend URL: ${backendUrl}`);

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        // When running inside Cloud Run, obtain an identity token for the backend service
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
        const response = await fetch(backendUrl, {
            method: 'GET',
            headers,
        });

        // Get the response data
        const data = await response.json();

        // Return the result
        return res.status(response.status).json(data);
    } catch (error: unknown) {
        console.error('Error fetching availability:', error);
        return res.status(500).json({
            detail: error instanceof Error ? error.message : 'Failed to fetch availability'
        });
    }
}
