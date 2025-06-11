/**
 * backendClient.ts - HTTP client for service-to-service calls to the backend
 * 
 * This client automatically handles Google Cloud service account authentication
 * for calls from the frontend Cloud Run service to the backend Cloud Run service.
 */

// Define interfaces for the GoogleAuth library
interface GoogleAuthClient {
    getAccessToken(): Promise<{ token?: string | null }>;
}

interface GoogleAuth {
    getIdTokenClient(audience: string): Promise<GoogleAuthClient>;
}

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
    private auth: GoogleAuth | null = null;
    private baseURL: string;

    constructor(baseURL: string) {
        this.baseURL = baseURL;
    }

    /**
     * Lazily initialize GoogleAuth when needed
     */
    private async getGoogleAuth(): Promise<GoogleAuth | null> {
        if (this.auth) {
            return this.auth;
        }

        if (typeof window === 'undefined') {
            try {
                const { GoogleAuth } = await import('google-auth-library');
                this.auth = new GoogleAuth();
                return this.auth;
            } catch (error) {
                console.warn('google-auth-library not available:', error);
                return null;
            }
        }
        
        return null;
    }

    /**
     * Get an identity token for the backend service
     */
    private async getIdentityToken(): Promise<string | null> {
        try {
            console.log(`[BackendClient] Getting identity token for audience: ${this.baseURL}`);
            
            // First try using GoogleAuth library
            if (this.auth) {
                try {
                    const client = await this.auth.getIdTokenClient(this.baseURL);
                    const token = await client.getAccessToken();
                    if (token.token) {
                        console.log(`[BackendClient] Successfully obtained token via GoogleAuth`);
                        return token.token;
                    }
                } catch (authError) {
                    console.warn(`[BackendClient] GoogleAuth failed, trying metadata server:`, authError);
                }
            } else {
                // Try to initialize auth if not already done
                this.auth = await this.getGoogleAuth();
                if (this.auth) {
                    return this.getIdentityToken(); // Retry with initialized auth
                }
            }

            // Fallback to metadata server (when running in Cloud Run)
            if (typeof window === 'undefined') {
                try {
                    const metadataURL = `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(this.baseURL)}&format=full`;
                    console.log(`[BackendClient] Fetching token from metadata server: ${metadataURL}`);
                    
                    const tokenResp = await fetch(metadataURL, {
                        headers: { 'Metadata-Flavor': 'Google' }
                    });

                    if (tokenResp.ok) {
                        const token = await tokenResp.text();
                        console.log(`[BackendClient] Successfully obtained token via metadata server`);
                        return token;
                    } else {
                        console.error(`[BackendClient] Metadata server returned status: ${tokenResp.status}`);
                    }
                } catch (metadataError) {
                    console.error(`[BackendClient] Metadata server failed:`, metadataError);
                }
            }

            return null;
        } catch (error) {
            console.error(`[BackendClient] Failed to get identity token:`, error);
            return null;
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
            const url = `${this.baseURL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
            console.log(`[BackendClient] Making ${method} request to: ${url}`);

            // Get identity token for authentication
            const token = await this.getIdentityToken();

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            // Add authorization header if we have a token
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
                console.log(`[BackendClient] Added Authorization header with token`);
            } else {
                console.warn(`[BackendClient] No identity token available, making unauthenticated request`);
            }

            const requestOptions: RequestInit = {
                method,
                headers,
            };

            if (body && (method === 'POST' || method === 'PUT')) {
                requestOptions.body = JSON.stringify(body);
            }

            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            try {
                const response = await fetch(url, {
                    ...requestOptions,
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                console.log(`[BackendClient] Request completed with status: ${response.status}`);

                // Check if the response has JSON content
                const contentType = response.headers.get('content-type');
                const isJson = contentType && contentType.includes('application/json');

                // Parse response data based on content type
                const data = isJson ? await response.json() : await response.text();

                // If response is not ok, throw an error with status and data
                if (!response.ok) {
                    throw new BackendError(
                        `Request failed with status ${response.status}`,
                        response.status,
                        data
                    );
                }

                console.log(`[BackendClient] Request successful`);
                return data as T;

            } finally {
                clearTimeout(timeoutId);
            }

        } catch (error: unknown) {
            console.error(`[BackendClient] Request failed:`, error);

            // Handle fetch errors
            if (error instanceof BackendError) {
                throw error;
            }

            // Handle other errors
            const errorMessage = error instanceof Error ? error.message : 'Backend request failed';
            throw new BackendError(errorMessage, undefined, error);
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
console.log(`[BackendClient] Initializing with backend URL: ${backendUrl}`);
const backendClient = new BackendClient(backendUrl);

export default backendClient;
export { BackendClient };
export type { BackendClientError };
