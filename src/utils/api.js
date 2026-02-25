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

  // Auto-inject establecimiento_id from stored user data for GET requests
  let finalPath = path;
  if (!path.startsWith('http') && (!options.method || options.method === 'GET')) {
    try {
      const storedUser = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user.establecimiento_id && !path.includes('establecimiento_id')) {
          const separator = path.includes('?') ? '&' : '?';
          finalPath = `${path}${separator}establecimiento_id=${user.establecimiento_id}`;
        }
      }
    } catch (e) { /* ignore parse errors */ }
  }

  const url = finalPath.startsWith('http') ? finalPath : `${config.apiBaseUrl}${finalPath}`;

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
