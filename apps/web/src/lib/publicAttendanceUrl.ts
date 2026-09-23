/** Absolute URL for `/attendance/{token}`, the same string Copy link writes to the clipboard. */
export function publicAttendanceUrl(origin: string, publicPath: string) {
  return `${origin}${publicPath}`;
}
