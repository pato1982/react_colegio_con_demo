import config from '../config/env';

/**
 * Wrapper around fetch that automatically includes:
 * - The auth token from localStorage (for demo interceptor support)
 * - Content-Type header for POST/PUT/DELETE requests
 * - The API base URL prefix
 *
 * Usage:
 *   const data = await apiFetch('/docentes');
 *   const data = await apiFetch('/docentes/1', { method: 'PUT', body: JSON.stringify({...}) });
 */
export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('auth_token');
  const url = path.startsWith('http') ? path : `${config.apiBaseUrl}${path}`;

  const headers = {
    ...(options.body && { 'Content-Type': 'application/json' }),
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });
  return response;
}

/**
 * Shorthand for GET requests that returns parsed JSON
 */
export async function apiGet(path) {
  const response = await apiFetch(path);
  return response.json();
}

/**
 * Shorthand for POST requests that returns parsed JSON
 */
export async function apiPost(path, body) {
  const response = await apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return response.json();
}

/**
 * Shorthand for PUT requests that returns parsed JSON
 */
export async function apiPut(path, body) {
  const response = await apiFetch(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return response.json();
}

/**
 * Shorthand for DELETE requests that returns parsed JSON
 */
export async function apiDelete(path, body) {
  const response = await apiFetch(path, {
    method: 'DELETE',
    ...(body && { body: JSON.stringify(body) }),
  });
  return response.json();
}
