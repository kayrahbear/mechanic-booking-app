/**
 * httpClient.ts - Fetch-based HTTP client to replace axios
 * 
 * This module provides a fetch-based HTTP client with similar functionality to axios:
 * - Base URL configuration
 * - Automatic JSON handling
 * - Timeouts
 * - Auth headers
 * - Error handling with response data
 */

interface RequestOptions extends RequestInit {
    baseURL?: string;
    timeout?: number;
    params?: Record<string, string | number | boolean | undefined>;
}

interface HttpClientError extends Error {
    status?: number;
    data?: unknown;
}

class HttpError extends Error implements HttpClientError {
    status?: number;
    data?: unknown;

    constructor(message: string, status?: number, data?: unknown) {
        super(message);
        this.name = 'HttpError';
        this.status = status;
        this.data = data;
    }
}

// Default timeout in milliseconds
const DEFAULT_TIMEOUT = 10000;

// Create the base httpClient with default configuration
const createHttpClient = (defaultOptions: RequestOptions = {}) => {
    // Default headers merged with provided headers
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(defaultOptions.headers as Record<string, string> || {})
    };

    // Store auth token for later use
    let authToken: string | null = null;

    // Set auth token to be included in future requests
    const setAuthToken = (token: string | null) => {
        authToken = token;
    };

    // Build the request options by merging defaults with provided options
    const buildRequestOptions = (url: string, options: RequestOptions = {}): [string, RequestInit] => {
        // Clone to avoid mutating the original options
        const requestOptions: RequestInit = { ...defaultOptions, ...options };

        // Merge headers
        requestOptions.headers = {
            ...headers,
            ...(options.headers as Record<string, string> || {})
        };

        // Add auth token if available
        if (authToken) {
            (requestOptions.headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;
        }

        // Handle URL
        let fullUrl = url;

        // Add baseURL if the URL doesn't start with http/https and baseURL is provided
        if (!url.startsWith('http') && (options.baseURL || defaultOptions.baseURL)) {
            const baseURL = options.baseURL || defaultOptions.baseURL;
            fullUrl = `${baseURL}${url.startsWith('/') ? url : `/${url}`}`;
        }

        // Add query parameters if provided
        if (options.params) {
            const queryParams = new URLSearchParams();
            Object.entries(options.params).forEach(([key, value]) => {
                if (value !== undefined) {
                    queryParams.append(key, String(value));
                }
            });

            const queryString = queryParams.toString();
            if (queryString) {
                fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString;
            }
        }

        return [fullUrl, requestOptions];
    };

    // Helper to handle the fetch with timeout
    const fetchWithTimeout = async (url: string, options: RequestInit & { timeout?: number } = {}) => {
        const { timeout = DEFAULT_TIMEOUT } = options;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });

            return response;
        } finally {
            clearTimeout(timeoutId);
        }
    };

    // Process the response
    const processResponse = async (response: Response): Promise<unknown> => {
        // Check if the response has JSON content
        const contentType = response.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');

        // Parse response data based on content type
        const data = isJson ? await response.json() : await response.text();

        // If response is not ok, throw an error with status and data
        if (!response.ok) {
            const error = new HttpError(
                `Request failed with status ${response.status}`,
                response.status,
                data
            );
            throw error;
        }

        return data;
    };

    // HTTP methods implementation
    const get = async <T>(url: string, options: RequestOptions = {}): Promise<T> => {
        const [fullUrl, requestOptions] = buildRequestOptions(url, options);

        const response = await fetchWithTimeout(fullUrl, {
            ...requestOptions,
            method: 'GET',
        });

        return processResponse(response) as Promise<T>;
    };

    const post = async <T>(url: string, data?: Record<string, unknown> | unknown[], options: RequestOptions = {}): Promise<T> => {
        const [fullUrl, requestOptions] = buildRequestOptions(url, options);

        const response = await fetchWithTimeout(fullUrl, {
            ...requestOptions,
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        });

        return processResponse(response) as Promise<T>;
    };

    const put = async <T>(url: string, data?: Record<string, unknown> | unknown[], options: RequestOptions = {}): Promise<T> => {
        const [fullUrl, requestOptions] = buildRequestOptions(url, options);

        const response = await fetchWithTimeout(fullUrl, {
            ...requestOptions,
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        });

        return processResponse(response) as Promise<T>;
    };

    const del = async <T>(url: string, options: RequestOptions = {}): Promise<T> => {
        const [fullUrl, requestOptions] = buildRequestOptions(url, options);

        const response = await fetchWithTimeout(fullUrl, {
            ...requestOptions,
            method: 'DELETE',
        });

        return processResponse(response) as Promise<T>;
    };

    // Return the client interface
    return {
        get,
        post,
        put,
        delete: del,
        setAuthToken,
    };
};

// Create a default instance
const httpClient = createHttpClient({
    baseURL: process.env.NEXT_PUBLIC_API_BASE ? '' : '/api',
});

export default httpClient;
export { createHttpClient };
export type { HttpClientError }; 