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
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        return;
      }
    } catch {
      // Fall through to the selection fallback.
    }
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.left = '-9999px';
      document.body.appendChild(area);
      try {
        area.select();
        const ok = document.execCommand('copy');
        if (!ok) throw new Error('copy failed');
      } finally {
        area.remove();
      }
      setCopied(true);
    } catch {
      setCopied(false);
      setError('Could not copy the link. Check clipboard permission and try again.');
    }
  }

  return { copied, error, copy };
}
