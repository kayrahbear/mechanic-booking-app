import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// Read the backend URL from environment variables
// Ensure this is set in your deployment environment (e.g., Cloud Run service)
const apiUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

console.log(`[API Route /api/services] Using backend API URL: ${apiUrl}`); // Log the URL being used

// Helper function to get OIDC token from Google Cloud metadata server
async function getOidcToken(audience: string): Promise<string | null> {
    // This function should only attempt to get a token if running in a Google Cloud environment
    // and the audience (apiUrl) is a Cloud Run URL.
    if (!process.env.K_SERVICE) { // K_SERVICE is a standard env var in Cloud Run
        console.log('[API Route /api/services] Not running in Cloud Run, skipping OIDC token fetch.');
        return null;
    }
    if (!audience || !audience.includes('run.app')) {
        console.log('[API Route /api/services] Audience is not a Cloud Run URL, skipping OIDC token fetch for safety.');
        return null;
    }

    const metadataServerTokenUrl = `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(audience)}`;
    try {
        console.log(`[API Route / api / services] Fetching OIDC token for audience: ${audience} `);
        const tokenResponse = await axios.get(metadataServerTokenUrl, {
            headers: { 'Metadata-Flavor': 'Google' },
            timeout: 2000 // Short timeout for metadata server
        });
        console.log('[API Route /api/services] Successfully fetched OIDC token.');
        return tokenResponse.data;
    } catch (error) {
        console.error('[API Route /api/services] Failed to fetch OIDC token:', error);
        // Depending on the error, you might want to throw or handle differently
        if (axios.isAxiosError(error) && error.response?.status === 404) {
            console.warn("[API Route /api/services] Metadata server returned 404. Ensure workload identity is configured or you're running on GCP with a service account.");
        }
        return null; // Or throw an error to prevent calling the backend unauthenticated
    }
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    console.log('[API Route /api/services] Handler invoked.'); // Log entry

    if (req.method !== 'GET') {
        console.log(`[API Route / api / services] Method not allowed: ${req.method} `);
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    console.log(`[API Route / api / services] Attempting to fetch from backend: ${apiUrl}/services`);

    try {
        const headers: Record<string, string> = {};
        const token = await getOidcToken(apiUrl);

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            console.log('[API Route /api/services] Added Authorization header for backend request.');
        } else {
            // This case should ideally not happen if the backend requires auth and we're on Cloud Run.
            // For local dev against a locally running backend, this might be fine if the local backend doesn't enforce auth.
            console.warn('[API Route /api/services] No OIDC token fetched. Request to backend will be unauthenticated.');
        }

        const response = await axios.get(`${apiUrl}/services`, {
            headers,
            timeout: 5000 // 5 seconds
        });

        console.log(`[API Route /api/services] Backend response status: ${response.status}`);
        console.log(`[API Route /api/services] Backend response data length: ${response.data?.length ?? 'N/A'}`);

        // Send the backend response back to the client
        return res.status(200).json(response.data);

    } catch (error: unknown) {
        console.error('[API Route /api/services] Error fetching services from backend:', error);

        if (axios.isAxiosError(error)) {
            console.error('[API Route /api/services] Axios error details:', {
                message: error.message,
                code: error.code,
                status: error.response?.status,
                // data: error.response?.data // Be careful logging potentially large/sensitive data
            });
            // Forward backend error status and detail if possible
            return res.status(error.response?.status || 500).json({
                error: error.response?.data?.detail || 'Failed to fetch services from backend'
            });
        } else {
            console.error('[API Route /api/services] Non-Axios error:', error);
        }

        // Generic internal server error
        return res.status(500).json({ error: 'Internal Server Error' });
    }
} 