import { ClerkProvider, Show } from '@clerk/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Navigate, Outlet, Route, BrowserRouter, Routes, useLocation } from 'react-router';
import { setPageMeta } from './lib/seo';
import { applyDocumentLanguage, clerkLocalization } from './i18n';
import { ApiProvider } from './api/context';
import { AppShell } from './components/AppShell';
import { ClassCreatePage } from './routes/ClassCreatePage';
import { ClassDetailPage } from './routes/ClassDetailPage';
import { ClassesPage } from './routes/ClassesPage';
import { DashboardPage } from './routes/DashboardPage';
import { PublicAttendancePage } from './routes/PublicAttendancePage';
import { SessionCreatePage } from './routes/SessionCreatePage';
import { SessionDetailPage } from './routes/SessionDetailPage';
import { SettingsPage } from './routes/SettingsPage';
import { SessionsPage } from './routes/SessionsPage';
import { LandingPage } from './routes/LandingPage';
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
  const { t } = useTranslation();
  return (
    <div className="grid min-h-screen place-items-center bg-paper px-4">
      <div className="max-w-lg rounded-xl border border-line bg-card p-6 shadow-card">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{t('missingClerk.title')}</h1>
        <p className="mt-3 text-muted">{t('missingClerk.body')}</p>
        <p className="mt-3 text-sm text-muted">{t('missingClerk.public')}</p>
      </div>
    </div>
  );
}

function ClerkGate() {
  const { i18n } = useTranslation();
  const key = publishableKey();
  if (!key) return <MissingClerkConfig />;
  return (
    <ClerkProvider
      publishableKey={key}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      localization={clerkLocalization()}
      key={i18n.resolvedLanguage}
    >
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
  const { i18n } = useTranslation();
  useEffect(() => {
    applyDocumentLanguage();
  }, [i18n.language, i18n.resolvedLanguage]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <RouteSeo />
        <SpeedInsightsRoute />
        <Routes>
          <Route path="/attendance/:token" element={<PublicAttendancePage />} />
          <Route element={<ClerkGate />}>
            <Route path="/sign-in/*" element={<SignInPage />} />
            <Route path="/sign-up/*" element={<SignUpPage />} />
            <Route
              path="/"
              element={
                <Show when="signed-in" fallback={<LandingPage />}>
                  <AppShell />
                </Show>
              }
            >
              <Route index element={<DashboardPage />} />
            </Route>
            <Route element={<RequireAuth />}>
              <Route element={<AppShell />}>
                <Route path="classes" element={<ClassesPage />} />
                <Route path="classes/new" element={<ClassCreatePage />} />
                <Route path="classes/:id" element={<ClassDetailPage />} />
                <Route path="classes/:classId/sessions/new" element={<SessionCreatePage />} />
                <Route path="sessions" element={<SessionsPage />} />
                <Route path="sessions/new" element={<SessionCreatePage />} />
                <Route path="sessions/:id" element={<SessionDetailPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<MissingRoute />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function insightRoute(pathname: string): string {
  if (pathname.startsWith('/attendance/')) return '/attendance/:token';
  if (pathname.startsWith('/sign-in')) return '/sign-in';
  if (pathname.startsWith('/sign-up')) return '/sign-up';
  if (/^\/classes\/[^/]+\/sessions\/new$/.test(pathname)) return '/classes/:classId/sessions/new';
  if (/^\/classes\/[^/]+$/.test(pathname) && pathname !== '/classes/new') return '/classes/:id';
  if (/^\/sessions\/[^/]+$/.test(pathname) && pathname !== '/sessions/new') return '/sessions/:id';
  return pathname;
}

function SpeedInsightsRoute() {
  const { pathname } = useLocation();
  return <SpeedInsights route={insightRoute(pathname)} />;
}

function RouteSeo() {
  const { pathname } = useLocation();
  const { t, i18n } = useTranslation();
  const language = i18n.language === 'es' ? 'es' : 'en';
  useEffect(() => {
    if (pathname.startsWith('/attendance/')) return;
    if (pathname === '/') {
      setPageMeta({
        title: t('seo.homeTitle'),
        description: t('seo.snippet'),
        index: true,
        language,
      });
      return;
    }
    if (pathname.startsWith('/sign-in')) {
      setPageMeta({
        title: t('seo.signInTitle'),
        description: t('seo.signInDescription'),
        index: true,
        language,
      });
      return;
    }
    if (pathname.startsWith('/sign-up')) {
      setPageMeta({
        title: t('seo.signUpTitle'),
        description: t('seo.signUpDescription'),
        index: true,
        language,
      });
      return;
    }
    setPageMeta({ title: t('seo.appTitle'), description: t('seo.appDescription'), index: false, language });
  }, [pathname, t, language]);
  return null;
}

function MissingRoute() {
  const { t } = useTranslation();
  return (
    <div className="grid min-h-screen place-items-center bg-paper">
      <p className="text-muted">{t('missingRoute')}</p>
    </div>
  );
}
