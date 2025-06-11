/**
 * backendClient.ts - HTTP client for service-to-service calls to the backend
 * 
 * This client automatically handles Google Cloud service account authentication
 * for calls from the frontend Cloud Run service to the backend Cloud Run service.
 */

import { GoogleAuth } from 'google-auth-library';

interface BackendClientError extends Error {
    status?: number;
    data?: unknown;
}

class BackendError extends Error implements BackendClientError {
    status?: number;
    data?: unknown;

    constructor(message: string, status?: number, data?: unknown) {
        super(message);
        this.name = 'BackendError';
        this.status = status;
        this.data = data;
    }
}

// Default timeout in milliseconds
const DEFAULT_TIMEOUT = 10000;

class BackendClient {
    private auth: GoogleAuth;
    private baseURL: string;

    constructor(baseURL: string) {
        this.baseURL = baseURL;
        this.auth = new GoogleAuth();
    }

    /**
     * Get an authenticated HTTP client for the backend service
     */
    private async getAuthenticatedClient() {
        try {
            // Get an ID token client for the backend service URL
            const client = await this.auth.getIdTokenClient(this.baseURL);
            return client;
        } catch (error) {
            console.error('Failed to get authenticated client:', error);
            throw new BackendError('Failed to authenticate with backend service');
        }
    }

    /**
     * Make an authenticated request to the backend
     */
    private async makeRequest<T>(
        endpoint: string,
        options: {
            method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
            body?: unknown;
            timeout?: number;
        } = {}
    ): Promise<T> {
        const { method = 'GET', body, timeout = DEFAULT_TIMEOUT } = options;

        try {
            const client = await this.getAuthenticatedClient();
            const url = `${this.baseURL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

            console.log(`[BackendClient] Making ${method} request to: ${url}`);

            const requestOptions: {
                method: 'GET' | 'POST' | 'PUT' | 'DELETE';
                timeout: number;
                headers: Record<string, string>;
                body?: string;
            } = {
                method,
                timeout,
                headers: {
                    'Content-Type': 'application/json',
                },
            };

            if (body && (method === 'POST' || method === 'PUT')) {
                requestOptions.body = JSON.stringify(body);
            }

            const response = await client.request({
                url,
                ...requestOptions,
            });

            console.log(`[BackendClient] Request successful, status: ${response.status}`);
            return response.data as T;

        } catch (error: unknown) {
            console.error(`[BackendClient] Request failed:`, error);

            // Handle Google Auth library errors
            if (error && typeof error === 'object' && 'response' in error) {
                const gaxiosError = error as { response: { status: number; data: unknown } };
                const status = gaxiosError.response.status;
                const data = gaxiosError.response.data;
                throw new BackendError(
                    `Backend request failed with status ${status}`,
                    status,
                    data
                );
            }

            // Handle other errors
            const errorMessage = error instanceof Error ? error.message : 'Backend request failed';
            throw new BackendError(
                errorMessage,
                undefined,
                error
            );
        }
    }

    /**
     * GET request
     */
    async get<T>(endpoint: string, options: { timeout?: number } = {}): Promise<T> {
        return this.makeRequest<T>(endpoint, { method: 'GET', ...options });
    }

    /**
     * POST request
     */
    async post<T>(endpoint: string, data?: unknown, options: { timeout?: number } = {}): Promise<T> {
        return this.makeRequest<T>(endpoint, { method: 'POST', body: data, ...options });
    }

    /**
     * PUT request
     */
    async put<T>(endpoint: string, data?: unknown, options: { timeout?: number } = {}): Promise<T> {
        return this.makeRequest<T>(endpoint, { method: 'PUT', body: data, ...options });
    }

    /**
     * DELETE request
     */
    async delete<T>(endpoint: string, options: { timeout?: number } = {}): Promise<T> {
        return this.makeRequest<T>(endpoint, { method: 'DELETE', ...options });
    }
}

// Create a default instance using the backend URL from environment
const backendUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';
const backendClient = new BackendClient(backendUrl);

export default backendClient;
export { BackendClient };
export type { BackendClientError };
