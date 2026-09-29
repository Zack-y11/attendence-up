import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPublicToken } from '../domain/tokens';

const { buildApp } = await import('../app');
const { prisma } = await import('../lib/prisma');

const instructorId = `instructor-lookup-${crypto.randomUUID()}`;
const hidden = [
  'Beatriz Soto',
  'Beatriz Rojas',
  'Standalone Name',
  'typed:SECRET-SIG',
  'secret-reason',
];

let app!: FastifyInstance;
let classToken = '';
let laterToken = '';
let otherClassToken = '';
let standaloneToken = '';

function lookup(token: string, studentCode: string) {
  const params = new URLSearchParams({ studentCode });
  return app.inject({
    method: 'GET',
    url: `/api/public/sessions/${token}/student?${params}`,
  });
}

function expectName(body: unknown, studentName: string | null) {
  expect(body).toEqual({ studentName });
  const raw = JSON.stringify(body);
  for (const secret of hidden) {
    if (secret === studentName) continue;
    expect(raw).not.toContain(secret);
  }
}

describe('public student lookup', () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    await prisma.user.create({
      data: {
        id: instructorId,
        email: `${instructorId}@example.test`,
        displayName: 'Lookup Instructor',
      },
    });
    const algebra = await prisma.class.create({
      data: { ownerId: instructorId, name: 'Algebra' },
    });
    const history = await prisma.class.create({
      data: { ownerId: instructorId, name: 'History' },
    });
    const earlier = await prisma.attendanceSession.create({
      data: {
        publicToken: createPublicToken(),
        classId: algebra.id,
        instructorId,
        name: 'Week 1',
        status: 'CLOSED',
      },
    });
    const current = await prisma.attendanceSession.create({
      data: {
        publicToken: createPublicToken(),
        classId: algebra.id,
        instructorId,
        name: 'Week 2',
        status: 'OPEN',
      },
    });
    const later = await prisma.attendanceSession.create({
      data: {
        publicToken: createPublicToken(),
        classId: algebra.id,
        instructorId,
        name: 'Week 3',
        status: 'OPEN',
      },
    });
    const historySession = await prisma.attendanceSession.create({
      data: {
        publicToken: createPublicToken(),
        classId: history.id,
        instructorId,
        name: 'History week',
        status: 'OPEN',
      },
    });
    const standalone = await prisma.attendanceSession.create({
      data: {
        publicToken: createPublicToken(),
        instructorId,
        name: 'Standalone',
        status: 'OPEN',
      },
    });
    classToken = current.publicToken;
    laterToken = later.publicToken;
    otherClassToken = historySession.publicToken;
    standaloneToken = standalone.publicToken;

    await prisma.attendanceRecord.createMany({
      data: [
        {
          sessionId: earlier.id,
          studentCode: 'SM001',
          studentName: 'Ana',
          locationStatus: 'NO_EXPECTED_LOCATION',
          createdAt: new Date('2026-01-01T12:00:00.000Z'),
        },
        {
          sessionId: current.id,
          studentCode: 'SM001',
          studentName: 'Ana López',
          signature: 'typed:SECRET-SIG',
          absenceNote: 'secret-reason',
          locationStatus: 'NO_EXPECTED_LOCATION',
          createdAt: new Date('2026-02-01T12:00:00.000Z'),
        },
        {
          sessionId: current.id,
          studentCode: 'SM0012',
          studentName: 'Beatriz Soto',
          locationStatus: 'NO_EXPECTED_LOCATION',
          createdAt: new Date('2026-02-02T12:00:00.000Z'),
        },
        {
          sessionId: historySession.id,
          studentCode: 'SM001',
          studentName: 'Beatriz Rojas',
          locationStatus: 'NO_EXPECTED_LOCATION',
          createdAt: new Date('2026-03-01T12:00:00.000Z'),
        },
        {
          sessionId: standalone.id,
          studentCode: 'SM001',
          studentName: 'Standalone Name',
          locationStatus: 'NO_EXPECTED_LOCATION',
          createdAt: new Date('2026-04-01T12:00:00.000Z'),
        },
      ],
    });
    app = await buildApp();
  });

  afterAll(async () => {
    await prisma.attendanceRecord.deleteMany({ where: { session: { instructorId } } });
    await prisma.attendanceSession.deleteMany({ where: { instructorId } });
    await prisma.class.deleteMany({ where: { ownerId: instructorId } });
    await prisma.user.deleteMany({ where: { id: instructorId } });
    await app?.close();
  });

  it('fills the latest saved name for an exact code in this class', async () => {
    const response = await lookup(classToken, 'SM001');
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toContain('no-store');
    expect(response.headers['x-ratelimit-limit']).toBe('30');
    expectName(response.json(), 'Ana López');
  });

  it('matches the same code with different case and surrounding spaces', async () => {
    const response = await lookup(classToken, ' sm001 ');
    expect(response.statusCode).toBe(200);
    expectName(response.json(), 'Ana López');
  });

  it('returns nothing for a partial, longer, or unknown code', async () => {
    for (const studentCode of ['SM', 'SM00', 'SM0013', 'S', 'NOBODY']) {
      const response = await lookup(classToken, studentCode);
      expect(response.statusCode).toBe(200);
      expectName(response.json(), null);
    }
    const neighbor = await lookup(classToken, 'SM0012');
    expect(neighbor.statusCode).toBe(200);
    expect(neighbor.json()).toEqual({ studentName: 'Beatriz Soto' });
    expect(JSON.stringify(neighbor.json())).not.toContain('Ana López');
  });

  it('does not reveal a student from another class or a standalone session', async () => {
    const other = await lookup(otherClassToken, 'SM001');
    expect(other.statusCode).toBe(200);
    expect(other.json()).toEqual({ studentName: 'Beatriz Rojas' });
    expect(JSON.stringify(other.json())).not.toContain('Ana López');

    const standalone = await lookup(standaloneToken, 'SM001');
    expect(standalone.statusCode).toBe(200);
    expectName(standalone.json(), null);

    const missing = await lookup(otherClassToken, 'SM0012');
    expect(missing.statusCode).toBe(200);
    expectName(missing.json(), null);
  });

  it('rejects a code that could be used as a search pattern', async () => {
    for (const studentCode of ['SM%', 'SM_01', 'SM 001', "SM001' OR '1'='1"]) {
      const response = await lookup(classToken, studentCode);
      expect(response.statusCode).toBe(400);
      expect(JSON.stringify(response.json())).not.toContain('Ana López');
      expect(JSON.stringify(response.json())).not.toContain('Beatriz');
    }
  });

  it('does not reveal names for an unknown attendance link', async () => {
    const response = await lookup('not-a-real-token-value', 'SM001');
    expect(response.statusCode).toBe(404);
    expect(JSON.stringify(response.json())).not.toContain('Ana');
    expect(JSON.stringify(response.json())).not.toContain('Beatriz');
  });

  it('still checks in a new code without location and saves that name for the class', async () => {
    const before = await lookup(laterToken, 'NEW9');
    expect(before.statusCode).toBe(200);
    expectName(before.json(), null);

    const created = await app.inject({
      method: 'POST',
      url: `/api/public/sessions/${laterToken}/attendance`,
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ studentCode: 'new9', studentName: 'Nia Sol' }),
    });
    expect(created.statusCode).toBe(201);
    expect(created.headers['x-ratelimit-limit']).toBe('30');
    expect(created.json()).toMatchObject({ studentCode: 'NEW9', studentName: 'Nia Sol' });

    const saved = await lookup(classToken, 'NEW9');
    expect(saved.statusCode).toBe(200);
    expect(saved.json()).toEqual({ studentName: 'Nia Sol' });
    expect(JSON.stringify(saved.json())).not.toContain('Ana López');
  });
});

describe('public lookup rate limit', () => {
  let limited!: FastifyInstance;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    limited = await buildApp();
  });

  afterAll(async () => {
    await limited?.close();
  });

  it('blocks lookup after the same per-minute cap as check-in', async () => {
    const url = '/api/public/sessions/not-a-real-token-value/student?studentCode=SM001';
    const first = await limited.inject({ method: 'GET', url });
    expect(first.headers['x-ratelimit-limit']).toBe('30');
    expect(first.statusCode).toBe(404);

    const checkIn = await limited.inject({
      method: 'POST',
      url: '/api/public/sessions/not-a-real-token-value/attendance',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ studentCode: 'SM001', studentName: 'Nia Sol' }),
    });
    expect(checkIn.headers['x-ratelimit-limit']).toBe(first.headers['x-ratelimit-limit']);

    let blocked = false;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const next = await limited.inject({ method: 'GET', url });
      if (next.statusCode === 429) {
        expect(next.json()).toMatchObject({ code: 'RATE_LIMITED' });
        expect(JSON.stringify(next.json())).not.toContain('Ana');
        blocked = true;
        break;
      }
      expect(next.statusCode).toBe(404);
    }
    expect(blocked).toBe(true);
  });
});
