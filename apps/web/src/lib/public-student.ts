import { normalizeStudentCode, studentCodeSchema } from '@attendence-up/shared';

export const PUBLIC_STUDENT_LOOKUP_DELAY_MS = 400;

export function normalizedStudentCodeOrNull(code: string): string | null {
  const parsed = studentCodeSchema.safeParse(code);
  if (!parsed.success) return null;
  return normalizeStudentCode(parsed.data);
}

export type CheckInNameState = {
  name: string;
  edited: boolean;
  savedName: string | null;
  savedForCode: string | null;
};

export const initialCheckInNameState: CheckInNameState = {
  name: '',
  edited: false,
  savedName: null,
  savedForCode: null,
};

export type CheckInNameEvent =
  | { type: 'code'; code: string | null }
  | { type: 'name'; name: string }
  | { type: 'lookup'; code: string; activeCode: string | null; savedName: string | null };

/**
 * Fills the name from an exact-code lookup. A name the student typed stays.
 * Changing the code drops a previous autofill so another student's name cannot linger.
 */
export function reduceCheckInName(
  state: CheckInNameState,
  event: CheckInNameEvent,
): CheckInNameState {
  if (event.type === 'name') {
    const editedAway = state.savedName != null && event.name !== state.savedName;
    return {
      name: event.name,
      edited: true,
      savedName: editedAway ? null : state.savedName,
      savedForCode: editedAway ? null : state.savedForCode,
    };
  }

  if (event.type === 'code') {
    if (state.savedForCode == null || event.code === state.savedForCode) return state;
    const clearAutofill = !state.edited && state.name === state.savedName;
    return {
      name: clearAutofill ? '' : state.name,
      edited: state.edited,
      savedName: null,
      savedForCode: null,
    };
  }

  if (event.code !== event.activeCode || state.edited) return state;
  if (!event.savedName) {
    if (state.name !== '' && state.name !== state.savedName) return state;
    return { ...state, name: '', savedName: null, savedForCode: null };
  }
  return {
    name: event.savedName,
    edited: false,
    savedName: event.savedName,
    savedForCode: event.code,
  };
}
