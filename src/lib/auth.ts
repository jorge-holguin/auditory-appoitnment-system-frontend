/**
 * Authentication utility functions for token management
 */

export interface UserInfo {
  nombreCompleto: string;
  puesto: string;
  documento: string;
}

const TOKEN_KEY = 'authToken';

/**
 * Stores the authentication token in localStorage
 */
export const setAuthToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

/**
 * Retrieves the authentication token from localStorage
 */
export const getAuthToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Removes the authentication token from localStorage
 */
export const removeAuthToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

/**
 * Decodes a JWT token and extracts the payload
 */
const decodeToken = (token: string): any => {
  try {
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      throw new Error('Invalid token format');
    }
    const payload = JSON.parse(atob(tokenParts[1]));
    return payload;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

/**
 * Gets the current user information from the stored token
 */
export const getCurrentUser = (): UserInfo | null => {
  try {
    const token = getAuthToken();
    if (!token) return null;

    const payload = decodeToken(token);
    if (!payload) return null;

    return {
      nombreCompleto: payload.nombreCompleto || '',
      puesto: payload.puesto || '',
      documento: payload.sub || '',
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

/**
 * Checks if the token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = decodeToken(token);
    if (!payload || !payload.exp) return true;

    // Check if token is expired (exp is in seconds, Date.now() is in milliseconds)
    return payload.exp * 1000 < Date.now();
  } catch (error) {
    return true;
  }
};

/**
 * Refreshes the authentication token
 * @param currentToken - The current authentication token
 * @returns A promise that resolves to the new token or null if refresh fails
 */
export const refreshToken = async (currentToken: string): Promise<string | null> => {
  try {
    const API_AUTH = import.meta.env.VITE_AUTH_API_URL;
    
    const response = await fetch(`${API_AUTH}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    
    if (data.success && data.data?.jwt) {
      return data.data.jwt;
    }

    return null;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
};
