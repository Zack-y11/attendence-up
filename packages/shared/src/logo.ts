const PNG_PREFIX = 'data:image/png;base64,';
const JPEG_PREFIX = 'data:image/jpeg;base64,';
const LOGO_MAX_CHARS = 500_000;

export function isClassLogo(value: string): boolean {
  const prefix = value.startsWith(PNG_PREFIX) ? PNG_PREFIX : value.startsWith(JPEG_PREFIX) ? JPEG_PREFIX : null;
  if (!prefix || value.length > LOGO_MAX_CHARS) return false;
  const payload = value.slice(prefix.length);
  return payload.length > 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(payload);
}

export function classLogoKind(value: string | null | undefined): 'png' | 'jpeg' | null {
  if (!value || !isClassLogo(value)) return null;
  return value.startsWith(JPEG_PREFIX) ? 'jpeg' : 'png';
}
