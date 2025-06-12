/**
 * Unified API client for the frontend
 * Simplifies the dual client pattern by choosing one approach consistently
 */

import { auth } from './firebase';

interface RequestOptions extends RequestInit {
    timeout?: number;
    params?: Record<string, string | number | boolean | undefined>;
}

interface ApiClientError extends Error {
    status?: number;
    data?: unknown;
}

class ApiError extends Error implements ApiClientError {
    status?: number;
    data?: unknown;

    constructor(message: string, status?: number, data?: unknown) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

const DEFAULT_TIMEOUT = 10000;

class UnifiedApiClient {
    private baseURL: string;

    constructor() {
        // Use environment-aware base URL
        this.baseURL = typeof window !== 'undefined' 
            ? '/api'  // Browser: use API routes for CORS/auth handling
            : process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';  // Server: direct backend
    }

    private async getAuthToken(): Promise<string | null> {
        if (typeof window === 'undefined') {
            return null; // Server-side calls don't need user auth tokens
        }

        try {
            const user = auth.currentUser;
            if (user) {
                return await user.getIdToken();
            }
        } catch (error) {
            console.warn('Failed to get auth token:', error);
        }
        return null;
    }

    private buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
        const url = `${this.baseURL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
        
        if (!params) return url;

        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined) {
                queryParams.append(key, String(value));
            }
        });

        const queryString = queryParams.toString();
        return queryString ? `${url}?${queryString}` : url;
    }

    private async request<T>(
        endpoint: string,
        options: RequestOptions = {}
    ): Promise<T> {
        const { timeout = DEFAULT_TIMEOUT, params, ...fetchOptions } = options;

        try {
            const url = this.buildUrl(endpoint, params);
            
            // Get auth token for browser requests
            const token = await this.getAuthToken();
            
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                ...(fetchOptions.headers as Record<string, string> || {})
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            try {
                const response = await fetch(url, {
                    ...fetchOptions,
                    headers,
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                const contentType = response.headers.get('content-type');
                const isJson = contentType && contentType.includes('application/json');
                const data = isJson ? await response.json() : await response.text();

                if (!response.ok) {
                    throw new ApiError(
                        `Request failed with status ${response.status}`,
                        response.status,
                        data
                    );
                }

                return data as T;
            } finally {
                clearTimeout(timeoutId);
            }
        } catch (error: unknown) {
            if (error instanceof ApiError) {
                throw error;
            }

            const errorMessage = error instanceof Error ? error.message : 'API request failed';
            throw new ApiError(errorMessage, undefined, error);
        }
    }

    async get<T>(endpoint: string, options: Omit<RequestOptions, 'method'> = {}): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'GET' });
    }

    async post<T>(endpoint: string, data?: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async put<T>(endpoint: string, data?: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async delete<T>(endpoint: string, options: Omit<RequestOptions, 'method'> = {}): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'DELETE' });
    }
}

// Create a default instance
const apiClient = new UnifiedApiClient();

export default apiClient;
export { UnifiedApiClient, ApiError };
export type { ApiClientError };