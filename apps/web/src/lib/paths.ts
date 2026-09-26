export const paths = {
  home: '/',
  signIn: '/sign-in',
  signUp: '/sign-up',
  classes: '/c',
  classNew: '/c/new',
  class: (id: string) => `/c/${id}`,
  classSessionNew: (classId: string) => `/c/${classId}/s/new`,
  sessions: '/s',
  sessionNew: '/s/new',
  session: (id: string) => `/s/${id}`,
  locations: '/l',
  settings: '/p',
  attendance: (token: string) => `/a/${token}`,
} as const;

export function isAttendancePath(pathname: string) {
  return pathname.startsWith('/a/') || pathname.startsWith('/attendance/');
}
