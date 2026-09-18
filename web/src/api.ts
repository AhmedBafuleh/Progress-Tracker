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

export type ManagedUser = {
  id: string;
  loginId: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  passwordAvailable: boolean;
  studentProfile?: {
    halaqah?: { id: string; name: string } | null;
    dormitory?: { building: string; room: string } | null;
  } | null;
};

export type Halaqah = {
  id: string;
  name: string;
  teacherId?: string | null;
  teacher?: { id: string; loginId?: string; fullName: string } | null;
  _count?: { students: number };
};

export type Teacher = {
  id: string;
  loginId: string;
  fullName: string;
  taughtHalaqahs: Array<{ id: string; name: string }>;
};

export type Period = {
  id: string;
  number: number;
  name: string;
  startTime: string;
  endTime: string;
};

export type StudentOption = {
  id: string;
  user: { id: string; loginId: string; fullName: string; isActive?: boolean };
  halaqah: {
    id: string;
    name: string;
    teacher?: { id: string; fullName: string } | null;
  };
  dormitory?: { building: string; room: string } | null;
};

export type ProgressEntry = {
  id: string;
  surah: string;
  verseFrom: number;
  verseTo: number;
  pages: string | number;
  rating: number;
  recordDate: string;
  note?: string | null;
  createdAt: string;
  student: {
    id: string;
    user: { id: string; fullName: string; loginId: string };
    halaqah: { id: string; name: string };
  };
  teacher: { id: string; fullName: string; loginId: string };
  period: Period;
};

export type HomeContent = {
  id?: string;
  eyebrow: string;
  heroTitle: string;
  heroBody: string;
  aboutTitle: string;
  aboutBody: string;
  feature1Title: string;
  feature1Body: string;
  feature2Title: string;
  feature2Body: string;
  feature3Title: string;
  feature3Body: string;
  calloutTitle: string;
  calloutBody: string;
};

export type LibraryItem = {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  url: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MediaAsset = {
  id: string;
  kind: 'IMAGE' | 'VIDEO' | string;
  mimeType: string;
  fileName: string;
  url: string;
  sortOrder: number;
  createdAt: string;
};

export type Activity = {
  id: string;
  title: string;
  content: string;
  category: string;
  imageUrl?: string | null;
  assets?: MediaAsset[];
  published: boolean;
  createdAt: string;
  updatedAt: string;
  author?: { id: string; fullName: string };
};

export type ParentLink = {
  id: string;
  createdAt: string;
  parent: { id: string; fullName: string; loginId: string };
  student: {
    id: string;
    user: { id: string; fullName: string; loginId: string };
    halaqah: { id: string; name: string };
  };
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

export function resolveMediaUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  const origin = new URL(API_URL, window.location.origin).origin;
  return `${origin}${url.startsWith('/') ? url : `/${url}`}`;
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

  getHome: () => request<{ home: HomeContent }>('/content/home'),
  getPublicLibrary: () => request<{ items: LibraryItem[] }>('/content/library'),
  getPublicMedia: () => request<{ activities: Activity[] }>('/content/media'),
  getManagedLibrary: () => request<{ items: LibraryItem[] }>('/content/library/manage'),
  getManagedMedia: () => request<{ activities: Activity[] }>('/content/media/manage'),
  updateHome: (payload: HomeContent) =>
    request<{ home: HomeContent; message: string }>('/content/home', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  createLibraryItem: (payload: Record<string, unknown>) =>
    request<{ item: LibraryItem; message: string }>('/content/library', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateLibraryItem: (id: string, payload: Record<string, unknown>) =>
    request<{ item: LibraryItem; message: string }>(`/content/library/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteLibraryItem: (id: string) =>
    request<{ message: string }>(`/content/library/${id}`, { method: 'DELETE' }),
  createActivity: (payload: Record<string, unknown>) =>
    request<{ activity: Activity; message: string }>('/content/media', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateActivity: (id: string, payload: Record<string, unknown>) =>
    request<{ activity: Activity; message: string }>(`/content/media/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  uploadActivityAsset: async (activityId: string, file: File) => {
    const token = getToken();
    const headers = new Headers();
    headers.set('Content-Type', file.type || 'application/octet-stream');
    headers.set('X-File-Name', encodeURIComponent(file.name));
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const response = await fetch(`${API_URL}/content/media/${activityId}/assets`, {
      method: 'POST',
      headers,
      body: file,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error?.message ?? 'تعذر رفع الملف');
    return body as { asset: MediaAsset; message: string };
  },
  deleteActivityAsset: (activityId: string, assetId: string) =>
    request<{ message: string }>(`/content/media/${activityId}/assets/${assetId}`, { method: 'DELETE' }),
  deleteActivity: (id: string) =>
    request<{ message: string }>(`/content/media/${id}`, { method: 'DELETE' }),

  listUsers: () => request<{ users: ManagedUser[] }>('/admin/users'),
  listHalaqahs: () => request<{ halaqahs: Halaqah[] }>('/admin/halaqahs'),
  createHalaqah: (name: string) =>
    request<{ halaqah: Halaqah }>('/admin/halaqahs', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  createUser: (payload: Record<string, unknown>) =>
    request<{ message: string }>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getCredential: (userId: string) =>
    request<{ loginId: string; password: string }>(`/admin/users/${userId}/credential`),
  resetPassword: (userId: string, password: string) =>
    request<{ message: string }>(`/admin/users/${userId}/password`, {
      method: 'PATCH',
      body: JSON.stringify({ password }),
    }),
  deleteUser: (userId: string) =>
    request<{ message: string }>(`/admin/users/${userId}`, { method: 'DELETE' }),

  listTeachers: () => request<{ teachers: Teacher[] }>('/management/teachers'),
  updateHalaqah: (id: string, payload: Record<string, unknown>) =>
    request<{ halaqah: Halaqah; message: string }>(`/management/halaqahs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteHalaqah: (id: string) =>
    request<{ message: string }>(`/management/halaqahs/${id}`, { method: 'DELETE' }),
  updateUser: (id: string, payload: Record<string, unknown>) =>
    request<{ message: string }>(`/management/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  listParentLinks: () => request<{ links: ParentLink[] }>('/management/parent-links'),
  createParentLink: (parentUserId: string, studentUserId: string) =>
    request<{ message: string }>('/management/parent-links', {
      method: 'POST',
      body: JSON.stringify({ parentUserId, studentUserId }),
    }),
  deleteParentLink: (id: string) =>
    request<{ message: string }>(`/management/parent-links/${id}`, { method: 'DELETE' }),
  listPeriods: () => request<{ periods: Period[] }>('/management/periods'),
  createPeriod: (payload: Record<string, unknown>) =>
    request<{ period: Period; message: string }>('/management/periods', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updatePeriod: (id: string, payload: Record<string, unknown>) =>
    request<{ period: Period; message: string }>(`/management/periods/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deletePeriod: (id: string) =>
    request<{ message: string }>(`/management/periods/${id}`, { method: 'DELETE' }),

  listProgressStudents: () => request<{ students: StudentOption[] }>('/progress/students'),
  listChildren: () => request<{ children: StudentOption[] }>('/progress/children'),
  listProgress: () => request<{ entries: ProgressEntry[] }>('/progress'),
  createProgress: (payload: Record<string, unknown>) =>
    request<{ entry: ProgressEntry; message: string }>('/progress', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateProgress: (id: string, payload: Record<string, unknown>) =>
    request<{ entry: ProgressEntry; message: string }>(`/progress/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteProgress: (id: string) =>
    request<{ message: string }>(`/progress/${id}`, { method: 'DELETE' }),
};
