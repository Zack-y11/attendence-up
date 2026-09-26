import { useAuth, useSession } from '@clerk/react';
import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';
import { createApiClient, type ApiClient } from './client';

const ApiContext = createContext<ApiClient | null>(null);

async function readSessionToken(
  getToken: () => Promise<string | null>,
  sessionGetToken?: () => Promise<string | null>,
): Promise<string | null> {
  const fromHook = await getToken();
  if (fromHook) return fromHook;
  return (await sessionGetToken?.()) ?? null;
}

export function ApiProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();
  const { session } = useSession();
  const getTokenRef = useRef(getToken);
  const sessionTokenRef = useRef(session?.getToken);
  getTokenRef.current = getToken;
  sessionTokenRef.current = session ? session.getToken.bind(session) : undefined;
  const client = useMemo(
    () => createApiClient(() => readSessionToken(getTokenRef.current, sessionTokenRef.current)),
    [],
  );
  return <ApiContext.Provider value={client}>{children}</ApiContext.Provider>;
}

export function ApiClientProvider({ client, children }: { client: ApiClient; children: ReactNode }) {
  return <ApiContext.Provider value={client}>{children}</ApiContext.Provider>;
}

export function useApi(): ApiClient {
  const client = useContext(ApiContext);
  if (!client) throw new Error('API client is unavailable.');
  return client;
}
