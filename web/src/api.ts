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
  email?: string | null;
  mobile?: string | null;
  address?: string | null;
  age?: number | null;
  joinedAt?: string | null;
  isActive: boolean;
  createdAt: string;
  passwordAvailable: boolean;
  studentProfile?: {
    halaqah?: { id: string; name: string } | null;
    dormitory?: { building: string; room: string } | null;
    memorizedAmount?: string | null;
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
  attended: boolean;
  recordType?: 'HIFZ' | 'NEAR_REVIEW' | 'FAR_REVIEW' | 'MATN' | null;
  surah?: string | null;
  verseFrom?: number | null;
  endSurah?: string | null;
  verseTo?: number | null;
  matnName?: string | null;
  matnFrom?: string | null;
  matnTo?: string | null;
  pages: string | number;
  rating?: number | null;
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
  footerPhone?: string | null;
  footerEmail?: string | null;
  footerInstagram?: string | null;
  footerFacebook?: string | null;
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

export type LeaveRequest = {
  id: string;
  type: 'VACATION' | 'DAY_OFF';
  fromDate: string;
  toDate?: string | null;
  reason?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  reviewNote?: string | null;
  createdAt: string;
  requester: { id: string; loginId: string; fullName: string; role: Role };
  reviewer?: { id: string; fullName: string } | null;
};

export type NoteViolation = {
  id: string;
  kind: 'NOTE' | 'VIOLATION';
  context: string;
  content: string;
  createdAt: string;
  subject: { id: string; loginId: string; fullName: string; role: Role };
  author: { id: string; loginId: string; fullName: string; role: Role };
  halaqah?: { id: string; name: string } | null;
};

export type MonthlyTestQuestion = {
  id?: string;
  questionNumber: number;
  correct: boolean;
  surah?: string | null;
  ayah?: number | null;
  referenceText?: string | null;
};

export type MonthlyTest = {
  id: string;
  type: 'HIFZ' | 'REVIEW' | 'MATN';
  matnName?: string | null;
  score: number;
  note?: string | null;
  testDate: string;
  createdAt: string;
  student: { id: string; user: { id?: string; loginId: string; fullName: string } };
  examiner: { id: string; loginId?: string; fullName: string };
  halaqah: { id: string; name: string };
  questions: MonthlyTestQuestion[];
};

export type HalaqahReport = {
  halaqah: {
    id: string;
    name: string;
    teacher?: { id: string; fullName: string; loginId: string } | null;
    students: Array<{
      id: string;
      memorizedAmount?: string | null;
      user: { id: string; fullName: string; loginId: string; mobile?: string | null; email?: string | null };
    }>;
  };
  summary: {
    students: number;
    progressRecords: number;
    attended: number;
    absent: number;
    averageRating: number;
    monthlyTests: number;
    averageTestScore: number;
  };
  progress: ProgressEntry[];
  tests: MonthlyTest[];
};

export type StudentNotification = {
  id: string;
  recipientId: string;
  senderId: string;
  title: string;
  message: string;
  type: 'TASK' | 'ACTIVITY' | 'REMINDER' | string;
  eventAt?: string | null;
  isRead: boolean;
  createdAt: string;
  sender?: { id: string; fullName: string; role: Role };
  recipient?: { id: string; loginId: string; fullName: string; role: Role };
};


export type ReportStudent = {
  id: string;
  memorizedAmount?: string | null;
  user: {
    id: string;
    loginId: string;
    fullName: string;
    email?: string | null;
    mobile?: string | null;
    age?: number | null;
    joinedAt?: string | null;
    isActive: boolean;
  };
  halaqah: {
    id: string;
    name: string;
    teacher?: { id: string; loginId: string; fullName: string } | null;
  };
  dormitory?: { building: string; room: string } | null;
};

export type StudentPerformanceReport = {
  student: ReportStudent;
  period: {
    from: string;
    to: string;
    previousFrom: string;
    previousTo: string;
  };
  summary: {
    sessions: number;
    attended: number;
    absent: number;
    attendanceRate: number;
    totalPages: number;
    averageRating: number;
    tests: number;
    averageTestScore: number;
    latestTestScore?: number | null;
    recordTypes: Record<string, { count: number; averageRating: number; pages: number }>;
  };
  trend: {
    rating: { current: number; previous: number; direction: string };
    tests: { current: number; previous: number; direction: string };
  };
  progress: ProgressEntry[];
  tests: MonthlyTest[];
};

export type AiPerson = {
  id: string;
  loginId: string;
  fullName: string;
  role: Role;
  studentProfile?: {
    id: string;
    memorizedAmount?: string | null;
    halaqah: { id: string; name: string };
  } | null;
};

export type AiAnalysis = {
  title: string;
  summary: string;
  trajectory: {
    label: 'IMPROVING' | 'STABLE' | 'DECLINING' | 'INSUFFICIENT_DATA' | 'NOT_APPLICABLE';
    explanation: string;
  };
  recommendations: Array<{
    title: string;
    reason: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;
  evidence: string[];
  limitations: string[];
  answer: string;
};

export type AiAnalysisResponse = {
  analysis: AiAnalysis;
  subject: { id: string; loginId: string; fullName: string; role: Role };
  period: { from: string; to: string };
  audience: 'ADMIN' | 'STUDENT' | 'PARENT' | 'TEACHER' | 'MANAGER';
  model: string;
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
  uploadLibraryFile: async (file: File) => {
    const token = getToken();
    const headers = new Headers();
    headers.set('Content-Type', file.type || 'application/octet-stream');
    headers.set('X-File-Name', encodeURIComponent(file.name));
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(`${API_URL}/content/library/upload`, { method: 'POST', headers, body: file });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error?.message ?? 'تعذر رفع ملف المكتبة');
    return body as { file: { url: string; fileName: string; mimeType: string; type: string }; message: string };
  },
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

  listLeaveRequests: () => request<{ requests: LeaveRequest[] }>('/operations/leaves'),
  createLeaveRequest: (payload: Record<string, unknown>) =>
    request<{ request: LeaveRequest; message: string }>('/operations/leaves', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  reviewLeaveRequest: (id: string, payload: Record<string, unknown>) =>
    request<{ request: LeaveRequest; message: string }>(`/operations/leaves/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  listNotes: () => request<{ notes: NoteViolation[] }>('/operations/notes'),
  createNote: (payload: Record<string, unknown>) =>
    request<{ note: NoteViolation; message: string }>('/operations/notes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  listMonthlyTests: () => request<{ tests: MonthlyTest[] }>('/operations/monthly-tests'),
  createMonthlyTest: (payload: Record<string, unknown>) =>
    request<{ test: MonthlyTest; message: string }>('/operations/monthly-tests', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getHalaqahReport: (id: string) => request<{ report: HalaqahReport }>(`/operations/halaqah-reports/${id}`),

  listNotifications: () =>
    request<{ notifications: StudentNotification[]; unreadCount: number }>('/notifications'),
  createNotification: (payload: Record<string, unknown>) =>
    request<{ notification: StudentNotification; message: string }>('/notifications', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  markNotificationRead: (id: string) =>
    request<{ notification: StudentNotification; message: string }>(`/notifications/${id}/read`, {
      method: 'PATCH',
    }),
  markAllNotificationsRead: () =>
    request<{ message: string }>('/notifications/read-all', { method: 'PATCH' }),

  listReportStudents: () => request<{ students: ReportStudent[] }>('/reports/students'),
  getStudentReport: (studentId: string, from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const query = params.toString();
    return request<{ report: StudentPerformanceReport }>(`/reports/students/${studentId}${query ? `?${query}` : ''}`);
  },

  getAiStatus: () => request<{ configured: boolean; model: string }>('/ai/status'),
  listAiPeople: () => request<{ people: AiPerson[] }>('/ai/people'),
  analyzePerson: (payload: Record<string, unknown>) =>
    request<AiAnalysisResponse>('/ai/analyze', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
