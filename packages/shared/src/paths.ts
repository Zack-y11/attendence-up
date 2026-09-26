/** Public check-in page. Old `/attendance/{token}` links still redirect here. */
export function publicAttendancePath(token: string) {
  return `/a/${encodeURIComponent(token)}`;
}
