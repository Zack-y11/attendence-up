import { useEffect, useState } from 'react';

/** Delay until the next QR fetch. A code that is already due retries once a second. */
export function rotationDelayMs(rotatesAt: string | undefined, now = Date.now()): number {
  if (!rotatesAt) return 30_000;
  const delay = Date.parse(rotatesAt) - now;
  if (!Number.isFinite(delay)) return 30_000;
  return Math.max(delay, 1_000);
}

export function secondsUntilRotation(rotatesAt: string, now = Date.now()): number {
  const delay = Date.parse(rotatesAt) - now;
  if (!Number.isFinite(delay)) return 0;
  return Math.max(0, Math.ceil(delay / 1000));
}

export function useSecondsUntilRotation(rotatesAt: string | undefined): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  if (!rotatesAt) return null;
  return secondsUntilRotation(rotatesAt, now);
}
