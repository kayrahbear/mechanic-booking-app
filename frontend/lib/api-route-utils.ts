/**
 * api-route-utils.ts - Utilities for Next.js API routes
 * 
 * This module provides standardized functions for handling authentication
 * and making requests to the backend from Next.js API routes.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import backendClient, { BackendClientError } from './backendClient';

// Default timeout for requests
const DEFAULT_TIMEOUT = 5000;

/**
 * Options for forwarding requests
 */
interface ForwardRequestOptions {
  // Request timeout in milliseconds
  timeout?: number;
  // Whether to require user authentication
  requireAuth?: boolean;
  // Whether to prefer user authentication when available
  preferUserAuth?: boolean;
}

/**
 * Forward a GET request to the backend
 * 
 * This function will:
 * 1. Check if user authentication is available and should be used
 * 2. Forward the request to the backend with the appropriate authentication
 * 3. Handle errors and return the response
 * 
 * @param req Next.js API request
 * @param res Next.js API response
 * @param endpoint Backend endpoint to call (e.g., "/services")
 * @param options Request options
 */
export async function forwardGetRequest(
  req: NextApiRequest,
  res: NextApiResponse,
  endpoint: string,
  options: ForwardRequestOptions = {}
) {
  const { timeout = DEFAULT_TIMEOUT, requireAuth = false, preferUserAuth = true } = options;
  
  try {
    // Build the full endpoint with query parameters
    const queryString = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        queryString.append(key, value);
      }
    }
    
    const fullEndpoint = `${endpoint}${queryString.toString() ? `?${queryString.toString()}` : ''}`;
    console.log(`[API Route] Forwarding GET request to backend: ${fullEndpoint}`);
    
    // Check if user authentication is available and should be used
    const userToken = req.headers.authorization;
    const shouldUseUserAuth = (userToken && preferUserAuth) || (userToken && requireAuth);
    
    if (shouldUseUserAuth) {
      console.log(`[API Route] Using user authentication token`);
      
      // Get the backend API URL from environment variables
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";
      
      // Forward the Authorization header from the client request
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': userToken
      };
      
      // Make the request with the user's token
      const response = await fetch(`${apiBase}${fullEndpoint}`, {
        method: 'GET',
        headers
      });
      
      // Get the response data
      let data;
      try {
        data = await response.json();
      } catch (error) {
        console.error('Error parsing JSON response:', error);
        data = { detail: 'No response data or invalid JSON' };
      }
      
      console.log(`[API Route] Backend response with user token: ${response.status}`);
      
      return res.status(response.status).json(data);
    } else {
      // Use service-to-service authentication
      console.log(`[API Route] Using service-to-service authentication`);
      
      if (requireAuth && !userToken) {
        return res.status(401).json({ detail: 'Authentication required' });
      }
      
      const data = await backendClient.get(fullEndpoint, { timeout });
      
      console.log(`[API Route] Backend response with service token successful`);
      
      return res.status(200).json(data);
    }
  } catch (error: unknown) {
    console.error(`[API Route] Error forwarding GET request:`, error);
    
    if ((error as BackendClientError).status) {
      const backendError = error as BackendClientError;
      console.error('[API Route] Backend error details:', {
        message: backendError.message,
        status: backendError.status,
        data: backendError.data
      });
      
      return res.status(backendError.status || 500).json({
        detail: backendError.data || 'Failed to process request'
      });
    }
    
    return res.status(500).json({
      detail: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}

/**
 * Forward a POST request to the backend
 * 
 * @param req Next.js API request
 * @param res Next.js API response
 * @param endpoint Backend endpoint to call
 * @param options Request options
 */
export async function forwardPostRequest(
  req: NextApiRequest,
  res: NextApiResponse,
  endpoint: string,
  options: ForwardRequestOptions = {}
) {
  const { timeout = DEFAULT_TIMEOUT, requireAuth = true, preferUserAuth = true } = options;
  
  try {
    console.log(`[API Route] Forwarding POST request to backend: ${endpoint}`);
    
    // Check if user authentication is available and should be used
    const userToken = req.headers.authorization;
    const shouldUseUserAuth = (userToken && preferUserAuth) || (userToken && requireAuth);
    
    if (shouldUseUserAuth) {
      console.log(`[API Route] Using user authentication token`);
      
      // Get the backend API URL from environment variables
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";
      
      // Forward the Authorization header from the client request
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': userToken
      };
      
      // Make the request with the user's token
      const response = await fetch(`${apiBase}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(req.body)
      });
      
      // Get the response data
      let data;
      try {
        data = await response.json();
      } catch (error) {
        console.error('Error parsing JSON response:', error);
        data = { detail: 'No response data or invalid JSON' };
      }
      
      console.log(`[API Route] Backend response with user token: ${response.status}`);
      
      return res.status(response.status).json(data);
    } else {
      // Use service-to-service authentication
      console.log(`[API Route] Using service-to-service authentication`);
      
      if (requireAuth && !userToken) {
        return res.status(401).json({ detail: 'Authentication required' });
      }
      
      const data = await backendClient.post(endpoint, req.body, { timeout });
      
      console.log(`[API Route] Backend response with service token successful`);
      
      return res.status(201).json(data);
    }
  } catch (error: unknown) {
    console.error(`[API Route] Error forwarding POST request:`, error);
    
    if ((error as BackendClientError).status) {
      const backendError = error as BackendClientError;
      console.error('[API Route] Backend error details:', {
        message: backendError.message,
        status: backendError.status,
        data: backendError.data
      });
      
      return res.status(backendError.status || 500).json({
        detail: backendError.data || 'Failed to process request'
      });
    }
    
    return res.status(500).json({
      detail: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}

/**
 * Forward a PUT request to the backend
 * 
 * @param req Next.js API request
 * @param res Next.js API response
 * @param endpoint Backend endpoint to call
 * @param options Request options
 */
export async function forwardPutRequest(
  req: NextApiRequest,
  res: NextApiResponse,
  endpoint: string,
  options: ForwardRequestOptions = {}
) {
  const { timeout = DEFAULT_TIMEOUT, requireAuth = true, preferUserAuth = true } = options;
  
  try {
    console.log(`[API Route] Forwarding PUT request to backend: ${endpoint}`);
    
    // Check if user authentication is available and should be used
    const userToken = req.headers.authorization;
    const shouldUseUserAuth = (userToken && preferUserAuth) || (userToken && requireAuth);
    
    if (shouldUseUserAuth) {
      console.log(`[API Route] Using user authentication token`);
      
      // Get the backend API URL from environment variables
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";
      
      // Forward the Authorization header from the client request
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': userToken
      };
      
      // Make the request with the user's token
      const response = await fetch(`${apiBase}${endpoint}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(req.body)
      });
      
      // Get the response data
      let data;
      try {
        data = await response.json();
      } catch (error) {
        console.error('Error parsing JSON response:', error);
        data = { detail: 'No response data or invalid JSON' };
      }
      
      console.log(`[API Route] Backend response with user token: ${response.status}`);
      
      return res.status(response.status).json(data);
    } else {
      // Use service-to-service authentication
      console.log(`[API Route] Using service-to-service authentication`);
      
      if (requireAuth && !userToken) {
        return res.status(401).json({ detail: 'Authentication required' });
      }
      
      const data = await backendClient.put(endpoint, req.body, { timeout });
      
      console.log(`[API Route] Backend response with service token successful`);
      
      return res.status(200).json(data);
    }
  } catch (error: unknown) {
    console.error(`[API Route] Error forwarding PUT request:`, error);
    
    if ((error as BackendClientError).status) {
      const backendError = error as BackendClientError;
      console.error('[API Route] Backend error details:', {
        message: backendError.message,
        status: backendError.status,
        data: backendError.data
      });
      
      return res.status(backendError.status || 500).json({
        detail: backendError.data || 'Failed to process request'
      });
    }
    
    return res.status(500).json({
      detail: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}

/**
 * Forward a DELETE request to the backend
 * 
 * @param req Next.js API request
 * @param res Next.js API response
 * @param endpoint Backend endpoint to call
 * @param options Request options
 */
export async function forwardDeleteRequest(
  req: NextApiRequest,
  res: NextApiResponse,
  endpoint: string,
  options: ForwardRequestOptions = {}
) {
  const { timeout = DEFAULT_TIMEOUT, requireAuth = true, preferUserAuth = true } = options;
  
  try {
    console.log(`[API Route] Forwarding DELETE request to backend: ${endpoint}`);
    
    // Check if user authentication is available and should be used
    const userToken = req.headers.authorization;
    const shouldUseUserAuth = (userToken && preferUserAuth) || (userToken && requireAuth);
    
    if (shouldUseUserAuth) {
      console.log(`[API Route] Using user authentication token`);
      
      // Get the backend API URL from environment variables
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";
      
      // Forward the Authorization header from the client request
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': userToken
      };
      
      // Make the request with the user's token
      const response = await fetch(`${apiBase}${endpoint}`, {
        method: 'DELETE',
        headers
      });
      
      // Get the response data
      let data;
      try {
        data = await response.json();
      } catch (error) {
        console.error('Error parsing JSON response:', error);
        data = { detail: 'No response data or invalid JSON' };
      }
      
      console.log(`[API Route] Backend response with user token: ${response.status}`);
      
      return res.status(response.status).json(data);
    } else {
      // Use service-to-service authentication
      console.log(`[API Route] Using service-to-service authentication`);
      
      if (requireAuth && !userToken) {
        return res.status(401).json({ detail: 'Authentication required' });
      }
      
      const data = await backendClient.delete(endpoint, { timeout });
      
      console.log(`[API Route] Backend response with service token successful`);
      
      return res.status(200).json(data);
    }
  } catch (error: unknown) {
    console.error(`[API Route] Error forwarding DELETE request:`, error);
    
    if ((error as BackendClientError).status) {
      const backendError = error as BackendClientError;
      console.error('[API Route] Backend error details:', {
        message: backendError.message,
        status: backendError.status,
        data: backendError.data
      });
      
      return res.status(backendError.status || 500).json({
        detail: backendError.data || 'Failed to process request'
      });
    }
    
    return res.status(500).json({
      detail: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}

/**
 * Forward a request to the backend based on the HTTP method
 * 
 * @param req Next.js API request
 * @param res Next.js API response
 * @param endpoint Backend endpoint to call
 * @param options Request options
 */
export async function forwardRequest(
  req: NextApiRequest,
  res: NextApiResponse,
  endpoint: string,
  options: ForwardRequestOptions = {}
) {
  switch (req.method) {
    case 'GET':
      return forwardGetRequest(req, res, endpoint, options);
    case 'POST':
      return forwardPostRequest(req, res, endpoint, options);
    case 'PUT':
      return forwardPutRequest(req, res, endpoint, options);
    case 'DELETE':
      return forwardDeleteRequest(req, res, endpoint, options);
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).json({ detail: `Method ${req.method} Not Allowed` });
  }
}
