import { describe, expect, it } from 'vitest';
import { en } from '../i18n/en';
import { es } from '../i18n/es';
import {
  initialCheckInNameState,
  normalizedStudentCodeOrNull,
  reduceCheckInName,
  type CheckInNameState,
} from './public-student';

function lookup(state: CheckInNameState, code: string, savedName: string | null) {
  return reduceCheckInName(state, { type: 'lookup', code, activeCode: code, savedName });
}

describe('public student code lookup', () => {
  it('accepts only a whole student code', () => {
    expect(normalizedStudentCodeOrNull(' sm001 ')).toBe('SM001');
    expect(normalizedStudentCodeOrNull('SM-12')).toBe('SM-12');
    expect(normalizedStudentCodeOrNull('')).toBeNull();
    expect(normalizedStudentCodeOrNull('SM 001')).toBeNull();
    expect(normalizedStudentCodeOrNull('SM%')).toBeNull();
    expect(normalizedStudentCodeOrNull('SM_01')).toBeNull();
  });

  it('fills an empty name from the exact saved name', () => {
    const typed = reduceCheckInName(initialCheckInNameState, { type: 'code', code: 'SM001' });
    const filled = lookup(typed, 'SM001', 'Ana López');
    expect(filled).toMatchObject({
      name: 'Ana López',
      edited: false,
      savedName: 'Ana López',
      savedForCode: 'SM001',
    });
  });

  it('keeps a name the student typed', () => {
    const typed = reduceCheckInName(initialCheckInNameState, { type: 'name', name: 'Bob' });
    const filled = lookup(typed, 'SM001', 'Ana López');
    expect(filled.name).toBe('Bob');
    expect(filled.savedName).toBeNull();
  });

  it('replaces a previous autofill and clears it when the code no longer matches', () => {
    const filled = lookup(initialCheckInNameState, 'SM001', 'Ana López');
    const changed = reduceCheckInName(filled, { type: 'code', code: 'SM' });
    expect(changed).toMatchObject({ name: '', savedName: null, savedForCode: null, edited: false });
    const miss = lookup(changed, 'SM', null);
    expect(miss.name).toBe('');
    expect(miss.savedName).toBeNull();
    const next = lookup(miss, 'SM0012', 'Beatriz Soto');
    expect(next.name).toBe('Beatriz Soto');
    expect(next.savedName).toBe('Beatriz Soto');
  });

  it('ignores a lookup for a code the field no longer shows', () => {
    const filled = lookup(initialCheckInNameState, 'SM001', 'Ana López');
    const stale = reduceCheckInName(filled, {
      type: 'lookup',
      code: 'SM001',
      activeCode: 'SM0012',
      savedName: 'Ana López',
    });
    expect(stale).toBe(filled);
  });

  it('uses the saved-name copy in both languages', () => {
    expect(en.public.savedName.length).toBeGreaterThan(0);
    expect(es.public.savedName.length).toBeGreaterThan(0);
    expect(es.public.savedName).not.toBe(en.public.savedName);
  });
});
