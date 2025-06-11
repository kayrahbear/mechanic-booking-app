import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Only allow GET and PUT requests
    if (req.method !== 'GET' && req.method !== 'PUT') {
        return res.status(405).json({ detail: 'Method not allowed' });
    }

    try {
        // Get the backend API URL from environment variables
        const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

        // Forward the Authorization header from the client request
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        // Check if the request has an authorization header
        if (req.headers.authorization) {
            headers['Authorization'] = req.headers.authorization;
        } else {
            return res.status(401).json({ detail: 'Authorization header required' });
        }

        // IMPORTANT: Do NOT override the user's Firebase auth token with the service account token
        // The user's Firebase auth token is already in the headers['Authorization'] from the client request
        // This ensures we're using the user's identity, not the service account

        // Build the request configuration
        const requestConfig: RequestInit = {
            method: req.method,
            headers,
        };

        // For PUT requests, add the request body
        if (req.method === 'PUT') {
            requestConfig.body = JSON.stringify(req.body);
        }

        // Forward the request to the backend API
        const backendUrl = `${apiBase}/users/me`;
        const response = await fetch(backendUrl, requestConfig);

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
        console.error('Error handling user profile request:', error);
        return res.status(500).json({
            detail: error instanceof Error ? error.message : 'Failed to process request'
        });
    }
}
