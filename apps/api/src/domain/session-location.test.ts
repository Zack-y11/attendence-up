import { describe, expect, it } from 'vitest';
import { resolveSessionLocation } from './session-location';

const classroom = { latitude: 13.69, longitude: -89.21, radiusMeters: 200 };
const override = { latitude: 13.7, longitude: -89.22, radiusMeters: 500 };

describe('resolveSessionLocation', () => {
  it('copies the class default when location is omitted', () => {
    expect(resolveSessionLocation(undefined, classroom)).toEqual(classroom);
  });

  it('clears location when the client sends null', () => {
    expect(resolveSessionLocation(null, classroom)).toBeNull();
  });

  it('uses an explicit location over the class default', () => {
    expect(resolveSessionLocation(override, classroom)).toEqual(override);
  });

  it('stays empty for a standalone session when location is omitted', () => {
    expect(resolveSessionLocation(undefined, null)).toBeNull();
  });
});
