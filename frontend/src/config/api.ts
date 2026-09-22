/// <reference types="vite/client" />

/**
 * SentriDose Centralized Production API Configuration
 * Dynamically resolves the API base URL from environment variables (VITE_API_BASE_URL)
 * without hardcoding localhost or development ports.
 */

export const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    const cleanUrl = envUrl.trim();
    if (cleanUrl.endsWith('/api/v1')) {
      return cleanUrl;
    }
    return cleanUrl.endsWith('/') ? `${cleanUrl}api/v1` : `${cleanUrl}/api/v1`;
  }
  return '/api/v1';
};

export const API_BASE_URL = getApiBaseUrl();
