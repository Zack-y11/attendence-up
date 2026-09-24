export const SIGNATURE_IMAGE_PREFIX = 'data:image/png;base64,';
const SIGNATURE_TEXT_MAX = 120;

export function isSignatureImage(value: string): boolean {
  if (!value.startsWith(SIGNATURE_IMAGE_PREFIX)) return false;
  const payload = value.slice(SIGNATURE_IMAGE_PREFIX.length);
  return payload.length > 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(payload);
}

/** A drawn or typed signature image, or a short legacy name. */
export function isAcceptableSignature(value: string): boolean {
  if (value.startsWith('data:')) return isSignatureImage(value);
  return value.length > 0 && value.length <= SIGNATURE_TEXT_MAX;
}

/** Text for spreadsheets. Image payloads stay out of the cell. */
export function signatureLabel(value: string | null): string {
  if (!value || isSignatureImage(value)) return '';
  return value;
}
