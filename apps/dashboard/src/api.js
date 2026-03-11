// Central API URL configuration
// Reads from VITE_API_URL env var, falls back to /api (proxied in dev)
export const API_URL = (import.meta.env.VITE_API_URL ?? '') + '/api';
