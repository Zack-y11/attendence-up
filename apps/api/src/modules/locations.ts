import {
  createSavedLocationSchema,
  idParamSchema,
  updateSavedLocationSchema,
} from '@attendence-up/shared';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { AppError } from '../lib/errors';
import { presentSavedLocation } from '../lib/presenters';
import { isUniqueConstraintError, prisma } from '../lib/prisma';

async function ownedLocation(id: string, instructorId: string) {
  const item = await prisma.savedLocation.findFirst({
    where: { id, instructorId },
  });
  if (!item) throw new AppError(404, 'Saved location not found.');
  return item;
}

function nameTaken(error: unknown): never {
  if (isUniqueConstraintError(error)) {
    throw new AppError(409, 'A saved location with this name already exists.');
  }
  throw error;
}

export async function locationRoutes(app: FastifyInstance) {
  const api = app.withTypeProvider<ZodTypeProvider>();

  api.get('/locations', async (request) => {
    const locations = await prisma.savedLocation.findMany({
      where: { instructorId: request.instructor.id },
      orderBy: { name: 'asc' },
    });
    return locations.map(presentSavedLocation);
  });

  api.post(
    '/locations',
    { schema: { body: createSavedLocationSchema } },
    async (request, reply) => {
      try {
        const created = await prisma.savedLocation.create({
          data: {
            instructorId: request.instructor.id,
            name: request.body.name,
            latitude: request.body.latitude,
            longitude: request.body.longitude,
            radiusMeters: request.body.radiusMeters,
          },
        });
        return reply.status(201).send(presentSavedLocation(created));
      } catch (error) {
        nameTaken(error);
      }
    },
  );

  api.get('/locations/:id', { schema: { params: idParamSchema } }, async (request) => {
    return presentSavedLocation(await ownedLocation(request.params.id, request.instructor.id));
  });

  api.patch(
    '/locations/:id',
    { schema: { params: idParamSchema, body: updateSavedLocationSchema } },
    async (request) => {
      const item = await ownedLocation(request.params.id, request.instructor.id);
      try {
        const updated = await prisma.savedLocation.update({
          where: { id: item.id },
          data: {
            ...(request.body.name !== undefined ? { name: request.body.name } : {}),
            ...(request.body.latitude !== undefined ? { latitude: request.body.latitude } : {}),
            ...(request.body.longitude !== undefined ? { longitude: request.body.longitude } : {}),
            ...(request.body.radiusMeters !== undefined
              ? { radiusMeters: request.body.radiusMeters }
              : {}),
          },
        });
        return presentSavedLocation(updated);
      } catch (error) {
        nameTaken(error);
      }
    },
  );

  api.delete('/locations/:id', { schema: { params: idParamSchema } }, async (request, reply) => {
    const item = await ownedLocation(request.params.id, request.instructor.id);
    await prisma.savedLocation.delete({ where: { id: item.id } });
    return reply.status(204).send();
  });
}
