/** Same identity as check-in: trim and uppercase, so `sm001` and `SM001` match. */
export function normalizeStudentCode(code: string): string {
  return code.trim().toUpperCase();
}
