import { absenceNoteForCheckIn } from '@attendence-up/shared';
import { describe, expect, it } from 'vitest';

describe('absenceNoteForCheckIn', () => {
  it('stores the reason when the student says they are not in the classroom', () => {
    expect(absenceNoteForCheckIn(true, '  ')).toMatchObject({ ok: false });
    expect(absenceNoteForCheckIn(true, 'work')).toMatchObject({ ok: false });
    expect(absenceNoteForCheckIn(true, 'I am at work until 5.')).toEqual({
      ok: true,
      note: 'I am at work until 5.',
    });
  });

  it('confirms attendance with no reason when the student does not say they are away', () => {
    expect(absenceNoteForCheckIn(false, null)).toEqual({ ok: true, note: null });
    expect(absenceNoteForCheckIn(false, 'I am at work until 5.')).toEqual({ ok: true, note: null });
  });
});
