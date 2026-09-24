import { updatePrintSettingsSchema } from '@attendence-up/shared';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { presentInstructor } from '../lib/presenters';
import { prisma } from '../lib/prisma';
import { syncInstructor } from '../plugins/auth';

export async function meRoutes(app: FastifyInstance) {
  const api = app.withTypeProvider<ZodTypeProvider>();

  api.get('/me', async (request) => {
    await syncInstructor(request.instructor.id);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.instructor.id } });
    return presentInstructor(user);
  });

  api.patch('/me', { schema: { body: updatePrintSettingsSchema } }, async (request) => {
    const body = request.body;
    const user = await prisma.user.update({
      where: { id: request.instructor.id },
      data: {
        ...(body.university !== undefined ? { university: body.university ?? '' } : {}),
        ...(body.faculty !== undefined ? { faculty: body.faculty ?? '' } : {}),
        ...(body.career !== undefined ? { career: body.career ?? '' } : {}),
        ...(body.printName !== undefined ? { printName: body.printName ?? '' } : {}),
        ...(body.logo !== undefined ? { logo: body.logo ? body.logo : null } : {}),
      },
    });
    return presentInstructor(user);
  });
}
