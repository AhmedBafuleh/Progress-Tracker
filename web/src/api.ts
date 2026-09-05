const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

export type Role = 'ADMIN' | 'MANAGER' | 'TEACHER' | 'STUDENT' | 'PARENT';

export type SessionUser = {
  id: string;
  loginId: string;
  fullName: string;
  role: Role;
};

export type LoginResponse = {
  token: string;
  user: SessionUser;
  dashboardReady: boolean;
};

function getToken() {
  return localStorage.getItem('progress_tracker_token');
}

export function saveToken(token: string) {
  localStorage.setItem('progress_tracker_token', token);
}

export function clearToken() {
  localStorage.removeItem('progress_tracker_token');
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = body?.error?.message ?? 'تعذر إكمال الطلب';
    throw new Error(message);
  }

  return body as T;
}

export const api = {
  login: (loginId: string, password: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ loginId, password }),
    }),

  me: () => request<{ user: SessionUser; dashboardReady: boolean }>('/auth/me'),

  listUsers: () => request<{ users: unknown[] }>('/admin/users'),

  listHalaqahs: () => request<{ halaqahs: Array<{ id: string; name: string }> }>('/admin/halaqahs'),

  createHalaqah: (name: string) =>
    request('/admin/halaqahs', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  createUser: (payload: Record<string, unknown>) =>
    request<{ message: string }>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
