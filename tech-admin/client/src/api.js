const BASE = '/tech/api';

function getToken() {
  return localStorage.getItem('tech_token');
}

export function setToken(token) {
  localStorage.setItem('tech_token', token);
}

export function clearToken() {
  localStorage.removeItem('tech_token');
}

export function isAuthenticated() {
  const token = getToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export async function api(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  if (res.status === 401) {
    clearToken();
    window.location.href = '/tech/';
    throw new Error('No autorizado');
  }

  return res.json();
}

export async function login(user, password) {
  const res = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error de login');
  setToken(data.token);
  return data;
}
