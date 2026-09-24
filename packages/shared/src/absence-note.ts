export const ABSENCE_NOTE_MIN = 8;
export const ABSENCE_NOTE_MAX = 500;

/** English API message. The web app maps it in i18n. */
export const ABSENCE_NOTE_REQUIRED = 'Say why you are not at the classroom.';

export function normalizeAbsenceNote(value: string | null | undefined): string | null {
  const note = value?.trim() ?? '';
  return note.length === 0 ? null : note;
}

/**
 * Saying you are not in the classroom does not cancel attendance.
 * The check-in stays Present. The written reason is stored only when the
 * student says they are away; otherwise it is dropped.
 */
export function absenceNoteForCheckIn(
  notInClassroom: boolean,
  raw: string | null | undefined,
): { ok: true; note: string | null } | { ok: false; message: string } {
  const note = normalizeAbsenceNote(raw);
  if (!notInClassroom) return { ok: true, note: null };
  if (!note || note.length < ABSENCE_NOTE_MIN || note.length > ABSENCE_NOTE_MAX) {
    return { ok: false, message: ABSENCE_NOTE_REQUIRED };
  }
  return { ok: true, note };
}
