import type { SavedLocationDto, SessionDto } from '@attendence-up/shared';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

type ApiResult = {
  statusCode: number;
  json: <T>() => T;
};

vi.mock('../plugins/auth', async () => {
  const { AppError } = await import('../lib/errors');
  return {
    requireInstructor: async (request: {
      headers: Record<string, string | string[] | undefined>;
      instructor: { id: string; email: string; displayName: string; role: 'INSTRUCTOR' };
    }) => {
      const header = request.headers['x-test-instructor'];
      const id = Array.isArray(header) ? header[0] : header;
      if (!id) throw new AppError(401, 'Sign in required.', 'UNAUTHENTICATED');
      request.instructor = {
        id,
        email: `${id}@example.test`,
        displayName: id,
        role: 'INSTRUCTOR',
      };
    },
  };
});

const { buildApp } = await import('../app');
const { prisma } = await import('../lib/prisma');

const instructorA = `instructor-a-${crypto.randomUUID()}`;
const instructorB = `instructor-b-${crypto.randomUUID()}`;
const room = { name: 'Room 204', latitude: 13.75, longitude: -89.5, radiusMeters: 300 };

let app!: FastifyInstance;

function call(
  userId: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  body?: unknown,
): Promise<ApiResult> {
  return app.inject({
    method,
    url,
    headers: {
      'x-test-instructor': userId,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    payload: body === undefined ? undefined : JSON.stringify(body),
  }) as Promise<ApiResult>;
}

describe('saved locations', () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    await prisma.user.createMany({
      data: [
        { id: instructorA, email: `${instructorA}@example.test`, displayName: 'Instructor A' },
        { id: instructorB, email: `${instructorB}@example.test`, displayName: 'Instructor B' },
      ],
    });
    app = await buildApp();
  });

  afterAll(async () => {
    await prisma.attendanceSession.deleteMany({
      where: { instructorId: { in: [instructorA, instructorB] } },
    });
    await prisma.savedLocation.deleteMany({
      where: { instructorId: { in: [instructorA, instructorB] } },
    });
    await prisma.user.deleteMany({ where: { id: { in: [instructorA, instructorB] } } });
    await app?.close();
  });

  it('copies a saved location onto a session and keeps that copy private to the owner', async () => {
    const created = await call(instructorA, 'POST', '/api/locations', room);
    expect(created.statusCode).toBe(201);
    const saved = created.json<SavedLocationDto>();
    expect(saved).toMatchObject(room);

    const fromSaved = await call(instructorA, 'POST', '/api/sessions', {
      name: 'Week 1',
      savedLocationId: saved.id,
    });
    expect(fromSaved.statusCode).toBe(201);
    const fromSavedBody = fromSaved.json<SessionDto>();
    expect(fromSavedBody.location).toEqual({
      latitude: room.latitude,
      longitude: room.longitude,
      radiusMeters: room.radiusMeters,
    });

    const fromForm = await call(instructorA, 'POST', '/api/sessions', {
      name: 'Week 1 form',
      location: {
        latitude: saved.latitude,
        longitude: saved.longitude,
        radiusMeters: saved.radiusMeters,
      },
    });
    expect(fromForm.statusCode).toBe(201);
    const fromFormBody = fromForm.json<SessionDto>();
    expect(fromFormBody.location).toEqual(fromSavedBody.location);

    const edited = await call(instructorA, 'PATCH', `/api/locations/${saved.id}`, {
      name: 'Room 210',
      latitude: 14,
      longitude: -89,
      radiusMeters: 500,
    });
    expect(edited.statusCode).toBe(200);
    expect(edited.json<SavedLocationDto>()).toMatchObject({
      name: 'Room 210',
      latitude: 14,
      longitude: -89,
      radiusMeters: 500,
    });

    const afterEdit = await call(instructorA, 'GET', `/api/sessions/${fromSavedBody.id}`);
    expect(afterEdit.json<SessionDto>().location).toEqual(fromSavedBody.location);
    const formAfterEdit = await call(instructorA, 'GET', `/api/sessions/${fromFormBody.id}`);
    expect(formAfterEdit.json<SessionDto>().location).toEqual(fromFormBody.location);

    const stored = await prisma.attendanceSession.findUniqueOrThrow({
      where: { id: fromSavedBody.id },
    });
    expect(stored.locationLatitude).toBe(room.latitude);
    expect(stored.locationLongitude).toBe(room.longitude);
    expect(stored.locationRadiusMeters).toBe(room.radiusMeters);
    expect(Object.hasOwn(stored, 'savedLocationId')).toBe(false);

    const unknownId = crypto.randomUUID();
    expect((await call(instructorA, 'GET', `/api/locations/${unknownId}`)).statusCode).toBe(404);
    expect(
      (await call(instructorA, 'PATCH', `/api/locations/${unknownId}`, { name: 'Nope' }))
        .statusCode,
    ).toBe(404);
    expect((await call(instructorA, 'DELETE', `/api/locations/${unknownId}`)).statusCode).toBe(404);

    const foreignRead = await call(instructorB, 'GET', `/api/locations/${saved.id}`);
    expect(foreignRead.statusCode).toBe(404);
    expect(foreignRead.json<{ latitude?: number }>().latitude).toBeUndefined();
    expect(
      (await call(instructorB, 'PATCH', `/api/locations/${saved.id}`, { name: 'Stolen' }))
        .statusCode,
    ).toBe(404);
    expect((await call(instructorB, 'DELETE', `/api/locations/${saved.id}`)).statusCode).toBe(404);

    const foreignList = await call(instructorB, 'GET', '/api/locations');
    expect(foreignList.statusCode).toBe(200);
    expect(foreignList.json<SavedLocationDto[]>().some((item) => item.id === saved.id)).toBe(false);

    const foreignUse = await call(instructorB, 'POST', '/api/sessions', {
      name: 'Borrowed room',
      savedLocationId: saved.id,
    });
    expect(foreignUse.statusCode).toBe(404);
    expect(
      await prisma.attendanceSession.count({
        where: { instructorId: instructorB, name: 'Borrowed room' },
      }),
    ).toBe(0);

    const stillOwned = await call(instructorA, 'GET', `/api/locations/${saved.id}`);
    expect(stillOwned.json<SavedLocationDto>().name).toBe('Room 210');

    expect((await call(instructorA, 'DELETE', `/api/locations/${saved.id}`)).statusCode).toBe(204);
    const afterDelete = await call(instructorA, 'GET', `/api/sessions/${fromSavedBody.id}`);
    expect(afterDelete.json<SessionDto>().location).toEqual(fromSavedBody.location);
    const formAfterDelete = await call(instructorA, 'GET', `/api/sessions/${fromFormBody.id}`);
    expect(formAfterDelete.json<SessionDto>().location).toEqual(fromFormBody.location);
  });

  it('uses the session form coordinate limits and keeps names unique per instructor', async () => {
    const accepted = await call(instructorA, 'POST', '/api/locations', {
      name: 'Boundary room',
      latitude: 90,
      longitude: 180,
      radiusMeters: 100_000,
    });
    expect(accepted.statusCode).toBe(201);

    const rejected = [
      { latitude: 90.1 },
      { latitude: -90.1 },
      { longitude: 180.1 },
      { longitude: -180.1 },
      { radiusMeters: 0 },
      { radiusMeters: 100_001 },
      { radiusMeters: 1.5 },
      { name: '   ' },
    ];
    for (const override of rejected) {
      const response = await call(instructorA, 'POST', '/api/locations', {
        name: 'Boundary room',
        latitude: -90,
        longitude: -180,
        radiusMeters: 1,
        ...override,
      });
      expect(response.statusCode).toBe(400);
    }

    const duplicate = await call(instructorA, 'POST', '/api/locations', {
      name: 'Boundary room',
      latitude: 1,
      longitude: 2,
      radiusMeters: 200,
    });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json<{ error: string }>().error).toBe(
      'A saved location with this name already exists.',
    );

    const otherOwner = await call(instructorB, 'POST', '/api/locations', {
      name: 'Boundary room',
      latitude: 1,
      longitude: 2,
      radiusMeters: 200,
    });
    expect(otherOwner.statusCode).toBe(201);

    const second = await call(instructorB, 'POST', '/api/locations', {
      name: 'Lab B',
      latitude: 3,
      longitude: 4,
      radiusMeters: 200,
    });
    expect(second.statusCode).toBe(201);
    const rename = await call(
      instructorB,
      'PATCH',
      `/api/locations/${second.json<SavedLocationDto>().id}`,
      {
        name: 'Boundary room',
      },
    );
    expect(rename.statusCode).toBe(409);
  });
});
