import { useTranslation } from 'react-i18next';

const KNOWN: Record<string, string> = {
  'Something went wrong.': 'errors.generic',
  'Request failed.': 'errors.requestFailed',
  'Sign in required.': 'errors.signInRequired',
  'Session not found.': 'errors.sessionNotFound',
  'Class not found.': 'errors.classNotFound',
  'Archived classes cannot accept new sessions.': 'errors.archivedNoSessions',
  'This attendance link is not valid.': 'errors.invalidLink',
  'Reopen the session before editing it.': 'errors.reopenBeforeEdit',
  'Only a draft session can be opened. Reopen a closed session instead.': 'errors.openDraftOnly',
  'Open the session before closing it.': 'errors.closeOpenOnly',
  'Only a closed session can be reopened.': 'errors.reopenClosedOnly',
  'Only a draft session with no attendance can be deleted.': 'errors.deleteDraftOnly',
  'This attendance session is not open.': 'errors.notOpen',
  'Attendance is not open yet.': 'errors.tooEarly',
  'The attendance window has closed.': 'errors.tooLate',
  'Attendance was already recorded for this student code.': 'errors.duplicateAttendance',
  'Attendance record not found.': 'errors.recordNotFound',
  'Say why you are not at the classroom.': 'errors.absenceNote',
  'Unknown time zone.': 'errors.unknownTimeZone',
  'Select at least one column.': 'errors.selectColumn',
  'Select at least one known column.': 'errors.selectKnownColumn',
  'Could not copy the link. Check clipboard permission and try again.': 'errors.copyFailed',
  'Check the form and try again.': 'errors.checkForm',
  'Expected an ISO date-time.': 'validation.iso',
  'End time must be after the start time.': 'validation.endAfterStart',
  'Attendance close must be after attendance open.': 'validation.closeAfterOpen',
  'Draw or write a signature.': 'validation.signature',
  'Signature is too large.': 'validation.signatureTooLarge',
  'Latitude and longitude must be provided together.': 'validation.latLngTogether',
  'Use letters, numbers, or hyphens.': 'validation.studentCode',
};

export function localizeMessage(message: string, translate: (key: string) => string): string {
  const key = KNOWN[message];
  if (key) return translate(key);
  if (/too small/i.test(message)) return translate('validation.required');
  if (/too big/i.test(message)) return translate('validation.tooLong');
  return message;
}

export function useLocalizedMessage() {
  const { t } = useTranslation();
  return (message: string | null | undefined) => (message ? localizeMessage(message, (key) => t(key)) : message);
}
