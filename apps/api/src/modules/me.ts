import type { FastifyInstance } from 'fastify';
import { presentInstructor } from '../lib/presenters';
import { syncInstructor } from '../plugins/auth';

export async function meRoutes(app: FastifyInstance) {
  app.get('/me', async (request) => {
    const user = await syncInstructor(request.instructor.id);
    return presentInstructor({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: 'INSTRUCTOR',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });
}
