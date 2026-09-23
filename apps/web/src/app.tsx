import { ClerkProvider, Show } from '@clerk/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navigate, Outlet, Route, BrowserRouter, Routes } from 'react-router';
import { ApiProvider } from './api/context';
import { AppShell } from './components/AppShell';
import { ClassCreatePage } from './routes/ClassCreatePage';
import { ClassDetailPage } from './routes/ClassDetailPage';
import { ClassesPage } from './routes/ClassesPage';
import { DashboardPage } from './routes/DashboardPage';
import { PublicAttendancePage } from './routes/PublicAttendancePage';
import { SessionCreatePage } from './routes/SessionCreatePage';
import { SessionDetailPage } from './routes/SessionDetailPage';
import { SessionsPage } from './routes/SessionsPage';
import { SignInPage } from './routes/SignInPage';
import { SignUpPage } from './routes/SignUpPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function publishableKey(): string | null {
  const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (!key || key.includes('replace_me')) return null;
  return key;
}

function MissingClerkConfig() {
  return (
    <div className="grid min-h-screen place-items-center bg-paper px-4">
      <div className="max-w-lg rounded-xl border border-line bg-card p-6 shadow-card">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Add your Clerk keys</h1>
        <p className="mt-3 text-muted">
          Instructor sign-in uses Clerk. Copy <code>apps/web/.env.example</code> to{' '}
          <code>apps/web/.env</code> and set <code>VITE_CLERK_PUBLISHABLE_KEY</code>. Set{' '}
          <code>CLERK_SECRET_KEY</code> in <code>apps/api/.env</code>, then restart both apps.
        </p>
        <p className="mt-3 text-sm text-muted">
          The public attendance page does not need an account and stays available at{' '}
          <code>/attendance/&lt;token&gt;</code>.
        </p>
      </div>
    </div>
  );
}

function ClerkGate() {
  const key = publishableKey();
  if (!key) return <MissingClerkConfig />;
  return (
    <ClerkProvider publishableKey={key} signInUrl="/sign-in" signUpUrl="/sign-up">
      <ApiProvider>
        <Outlet />
      </ApiProvider>
    </ClerkProvider>
  );
}

function RequireAuth() {
  return (
    <Show when="signed-in" fallback={<Navigate to="/sign-in" replace />}>
      <Outlet />
    </Show>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/attendance/:token" element={<PublicAttendancePage />} />
          <Route element={<ClerkGate />}>
            <Route path="/sign-in/*" element={<SignInPage />} />
            <Route path="/sign-up/*" element={<SignUpPage />} />
            <Route element={<RequireAuth />}>
              <Route element={<AppShell />}>
                <Route index element={<DashboardPage />} />
                <Route path="classes" element={<ClassesPage />} />
                <Route path="classes/new" element={<ClassCreatePage />} />
                <Route path="classes/:id" element={<ClassDetailPage />} />
                <Route path="classes/:classId/sessions/new" element={<SessionCreatePage />} />
                <Route path="sessions" element={<SessionsPage />} />
                <Route path="sessions/new" element={<SessionCreatePage />} />
                <Route path="sessions/:id" element={<SessionDetailPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<MissingRoute />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function MissingRoute() {
  return (
    <div className="grid min-h-screen place-items-center bg-paper">
      <p className="text-muted">That page does not exist.</p>
    </div>
  );
}
