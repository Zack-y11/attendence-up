import type { AttendanceRecordDto, AttendanceStatus, SessionDto } from '@attendence-up/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionDetailPage } from './SessionDetailPage';

const sessionId = '11111111-1111-4111-8111-111111111111';
const recordId = '22222222-2222-4222-8222-222222222222';

const { api } = vi.hoisted(() => ({
  api: {
    session: vi.fn(),
    attendance: vi.fn(),
    updateAttendanceStatus: vi.fn(),
  },
}));

vi.mock('../api/context', () => ({
  useApi: () => api,
}));

const session: SessionDto = {
  id: sessionId,
  publicToken: 'token-123',
  publicPath: '/attendance/token-123',
  classId: null,
  className: null,
  name: 'September 23',
  description: '',
  status: 'CLOSED',
  startsAt: null,
  endsAt: null,
  attendanceOpensAt: null,
  attendanceClosesAt: null,
  location: null,
  attendanceCount: 1,
  createdAt: '2026-09-23T14:00:00.000Z',
  updatedAt: '2026-09-23T14:00:00.000Z',
};

const record: AttendanceRecordDto = {
  id: recordId,
  studentCode: 'SM001',
  studentName: 'Juan Pérez',
  signature: null,
  latitude: null,
  longitude: null,
  locationAccuracyMeters: null,
  distanceFromSessionMeters: null,
  locationStatus: 'NO_EXPECTED_LOCATION',
  attendanceStatus: 'PRESENT',
  createdAt: '2026-09-23T14:03:00.000Z',
};

function renderRoster() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return render(
    <MemoryRouter initialEntries={[`/sessions/${sessionId}`]}>
      <Routes>
        <Route path="/sessions/:id" element={<SessionDetailPage />} />
      </Routes>
    </MemoryRouter>,
    { wrapper: Wrapper },
  );
}

function statusSelect() {
  return screen.getByLabelText('Attendance status for Juan Pérez') as HTMLSelectElement;
}

describe('session roster attendance status', () => {
  beforeEach(() => {
    api.session.mockResolvedValue(session);
    api.attendance.mockResolvedValue([record]);
    api.updateAttendanceStatus.mockImplementation(
      async (_sessionId: string, id: string, attendanceStatus: AttendanceStatus) => ({
        ...record,
        id,
        attendanceStatus,
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('lets the instructor mark a closed-session check-in Late or Excused', async () => {
    renderRoster();

    expect(
      await screen.findByText(
        /You can still set Late, Excused, or Absent after the session closes/,
      ),
    ).toBeTruthy();
    const select = (await screen.findByLabelText(
      'Attendance status for Juan Pérez',
    )) as HTMLSelectElement;
    expect(select.value).toBe('PRESENT');
    expect(select.disabled).toBe(false);

    fireEvent.change(select, { target: { value: 'LATE' } });
    await waitFor(() => expect(statusSelect().value).toBe('LATE'));
    expect(api.updateAttendanceStatus).toHaveBeenCalledWith(sessionId, recordId, 'LATE');

    fireEvent.change(statusSelect(), { target: { value: 'EXCUSED' } });
    await waitFor(() => expect(statusSelect().value).toBe('EXCUSED'));
    expect(api.updateAttendanceStatus).toHaveBeenLastCalledWith(sessionId, recordId, 'EXCUSED');
    expect(screen.getByText('No classroom location')).toBeTruthy();
  });

  it('keeps Present and shows the error when the override is rejected', async () => {
    api.updateAttendanceStatus.mockRejectedValue(new Error('Could not save attendance status.'));
    renderRoster();
    const select = await screen.findByLabelText('Attendance status for Juan Pérez');

    fireEvent.change(select, { target: { value: 'ABSENT' } });

    expect(await screen.findByText('Could not save attendance status.')).toBeTruthy();
    expect(statusSelect().value).toBe('PRESENT');
  });
});
