import { useEffect, useState } from 'react';

export function useCopy() {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!copied && !error) return;
    const timer = window.setTimeout(() => {
      setCopied(false);
      setError(null);
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [copied, error]);

  async function copy(text: string) {
    setError(null);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
      setError('Could not copy the link. Check clipboard permission and try again.');
    }
  }

  return { copied, error, copy };
}
