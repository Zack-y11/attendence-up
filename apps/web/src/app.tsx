import { ClerkProvider, Show } from '@clerk/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Navigate, Outlet, Route, BrowserRouter, Routes, useLocation, useParams } from 'react-router';
import { setPageMeta } from './lib/seo';
import { isAttendancePath, paths } from './lib/paths';
import { applyDocumentLanguage, clerkLocalization } from './i18n';
import { ApiProvider } from './api/context';
import { AppShell } from './components/AppShell';
import { ClassCreatePage } from './routes/ClassCreatePage';
import { ClassDetailPage } from './routes/ClassDetailPage';
import { ClassesPage } from './routes/ClassesPage';
import { LocationsPage } from './routes/LocationsPage';
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
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {t('missingClerk.title')}
        </h1>
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
      signInUrl={paths.signIn}
      signUpUrl={paths.signUp}
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
    <Show when="signed-in" fallback={<Navigate to={paths.signIn} replace />}>
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
          <Route path="/a/:token" element={<PublicAttendancePage />} />
          <Route path="/attendance/:token" element={<LegacyAttendance />} />
          <Route path="/classes/:classId/sessions/new" element={<LegacyClassSessionNew />} />
          <Route path="/classes/*" element={<LegacyPrefix from="/classes" to={paths.classes} />} />
          <Route path="/sessions/*" element={<LegacyPrefix from="/sessions" to={paths.sessions} />} />
          <Route path="/locations" element={<Navigate to={paths.locations} replace />} />
          <Route path="/settings" element={<Navigate to={paths.settings} replace />} />
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
                <Route path="c" element={<ClassesPage />} />
                <Route path="c/new" element={<ClassCreatePage />} />
                <Route path="c/:id" element={<ClassDetailPage />} />
                <Route path="c/:classId/s/new" element={<SessionCreatePage />} />
                <Route path="s" element={<SessionsPage />} />
                <Route path="s/new" element={<SessionCreatePage />} />
                <Route path="s/:id" element={<SessionDetailPage />} />
                <Route path="l" element={<LocationsPage />} />
                <Route path="p" element={<SettingsPage />} />
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
  if (isAttendancePath(pathname)) return '/a/:token';
  if (pathname.startsWith('/sign-in')) return '/sign-in';
  if (pathname.startsWith('/sign-up')) return '/sign-up';
  if (/^\/c\/[^/]+\/s\/new$/.test(pathname)) return '/c/:classId/s/new';
  if (/^\/c\/[^/]+$/.test(pathname) && pathname !== '/c/new') return '/c/:id';
  if (/^\/s\/[^/]+$/.test(pathname) && pathname !== '/s/new') return '/s/:id';
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
    if (isAttendancePath(pathname)) return;
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
    setPageMeta({
      title: t('seo.appTitle'),
      description: t('seo.appDescription'),
      index: false,
      language,
    });
  }, [pathname, t, language]);
  return null;
}

function LegacyAttendance() {
  const { token = '' } = useParams();
  return <Navigate to={paths.attendance(token)} replace />;
}

function LegacyClassSessionNew() {
  const { classId = '' } = useParams();
  return <Navigate to={paths.classSessionNew(classId)} replace />;
}

function LegacyPrefix({ from, to }: { from: string; to: string }) {
  const { pathname, search, hash } = useLocation();
  return <Navigate to={`${to}${pathname.slice(from.length)}${search}${hash}`} replace />;
}

function MissingRoute() {
  const { t } = useTranslation();
  return (
    <div className="grid min-h-screen place-items-center bg-paper">
      <p className="text-muted">{t('missingRoute')}</p>
    </div>
  );
}
