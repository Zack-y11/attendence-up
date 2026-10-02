/** Public check-in page. Old `/attendance/{token}` links still redirect here. */
export function publicAttendancePath(token: string) {
  return `/a/${encodeURIComponent(token)}`;
}

/** Late check-in extension for one student (`e` query param). */
export function publicAttendanceExtensionPath(sessionToken: string, extensionToken: string) {
  const base = publicAttendancePath(sessionToken);
  const params = new URLSearchParams({ e: extensionToken });
  return `${base}?${params.toString()}`;
}
