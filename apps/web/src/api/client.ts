import type {
  AttendanceRecordDto,
  AttendanceStatus,
  AttendanceSubmissionDto,
  ClassAttendanceDto,
  ClassDetailDto,
  ClassDto,
  CreateClassInput,
  CreateSavedLocationInput,
  InstructorDto,
  PublicSessionDto,
  SavedLocationDto,
  SessionDto,
  SessionWriteInput,
  SubmitAttendanceInput,
  UpdateClassInput,
  UpdatePrintSettingsInput,
  UpdateSavedLocationInput,
} from '@attendence-up/shared';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

async function parseError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as { error?: string; code?: string };
    return new ApiError(response.status, body.error ?? response.statusText, body.code);
  } catch {
    return new ApiError(response.status, response.statusText || 'Request failed.');
  }
}

export function createApiClient(getToken: () => Promise<string | null>) {
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const token = await getToken();
    const headers = new Headers(init?.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (init?.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    const response = await fetch(path, { ...init, headers });
    if (!response.ok) throw await parseError(response);
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  return {
    me: () => request<InstructorDto>('/api/me'),
    updateMe: (body: UpdatePrintSettingsInput) =>
      request<InstructorDto>('/api/me', { method: 'PATCH', body: JSON.stringify(body) }),
    locations: () => request<SavedLocationDto[]>('/api/locations'),
    createLocation: (body: CreateSavedLocationInput) =>
      request<SavedLocationDto>('/api/locations', { method: 'POST', body: JSON.stringify(body) }),
    updateLocation: (id: string, body: UpdateSavedLocationInput) =>
      request<SavedLocationDto>(`/api/locations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    deleteLocation: (id: string) => request<void>(`/api/locations/${id}`, { method: 'DELETE' }),
    classes: () => request<ClassDto[]>('/api/classes'),
    class: (id: string) => request<ClassDetailDto>(`/api/classes/${id}`),
    classAttendance: (id: string) => request<ClassAttendanceDto>(`/api/classes/${id}/attendance`),
    exportClassAttendance: async (id: string, format: 'csv' | 'xlsx', locale: 'en' | 'es') => {
      const token = await getToken();
      const headers = new Headers();
      if (token) headers.set('Authorization', `Bearer ${token}`);
      const params = new URLSearchParams({ format, locale });
      const response = await fetch(`/api/classes/${id}/attendance/export?${params}`, { headers });
      if (!response.ok) throw await parseError(response);
      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename="([^"]+)"/);
      return { blob, filename: match?.[1] ?? `attendance.${format}` };
    },
    createClass: (body: CreateClassInput) =>
      request<ClassDto>('/api/classes', { method: 'POST', body: JSON.stringify(body) }),
    updateClass: (id: string, body: UpdateClassInput) =>
      request<ClassDto>(`/api/classes/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    sessions: (scope: 'all' | 'open' | 'draft' | 'closed' = 'all') =>
      request<SessionDto[]>(`/api/sessions?scope=${scope}`),
    session: (id: string) => request<SessionDto>(`/api/sessions/${id}`),
    createSession: (body: SessionWriteInput) =>
      request<SessionDto>('/api/sessions', { method: 'POST', body: JSON.stringify(body) }),
    createClassSession: (classId: string, body: SessionWriteInput) =>
      request<SessionDto>(`/api/classes/${classId}/sessions`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    duplicateSession: (id: string, body: { shiftDays?: number } = {}) =>
      request<SessionDto>(`/api/sessions/${id}/duplicate`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    updateSession: (id: string, body: SessionWriteInput) =>
      request<SessionDto>(`/api/sessions/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    openSession: (id: string) =>
      request<SessionDto>(`/api/sessions/${id}/open`, { method: 'POST' }),
    closeSession: (id: string) =>
      request<SessionDto>(`/api/sessions/${id}/close`, { method: 'POST' }),
    reopenSession: (id: string) =>
      request<SessionDto>(`/api/sessions/${id}/reopen`, { method: 'POST' }),
    deleteSession: (id: string) => request<void>(`/api/sessions/${id}`, { method: 'DELETE' }),
    attendance: (id: string) => request<AttendanceRecordDto[]>(`/api/sessions/${id}/attendance`),
    updateAttendanceStatus: (
      sessionId: string,
      recordId: string,
      attendanceStatus: AttendanceStatus,
    ) =>
      request<AttendanceRecordDto>(`/api/sessions/${sessionId}/attendance/${recordId}`, {
        method: 'PATCH',
        body: JSON.stringify({ attendanceStatus }),
      }),
    exportAttendance: async (id: string, params: URLSearchParams) => {
      const token = await getToken();
      const headers = new Headers();
      if (token) headers.set('Authorization', `Bearer ${token}`);
      const response = await fetch(`/api/sessions/${id}/export?${params}`, { headers });
      if (!response.ok) throw await parseError(response);
      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename="([^"]+)"/);
      return { blob, filename: match?.[1] ?? 'attendance' };
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

export async function fetchPublicSession(token: string): Promise<PublicSessionDto> {
  const response = await fetch(`/api/public/sessions/${encodeURIComponent(token)}`);
  if (!response.ok) throw await parseError(response);
  return (await response.json()) as PublicSessionDto;
}

export async function submitPublicAttendance(
  token: string,
  body: SubmitAttendanceInput,
): Promise<AttendanceSubmissionDto> {
  const response = await fetch(`/api/public/sessions/${encodeURIComponent(token)}/attendance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw await parseError(response);
  return (await response.json()) as AttendanceSubmissionDto;
}
