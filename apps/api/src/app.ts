import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyRequest } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { config } from './config';
import { AppError } from './lib/errors';
import { prisma } from './lib/prisma';
import { classRoutes } from './modules/classes';
import { exportRoutes } from './modules/exports';
import { locationRoutes } from './modules/locations';
import { meRoutes } from './modules/me';
import { publicAttendanceRoutes } from './modules/public-attendance';
import { sessionRoutes } from './modules/sessions';
import { requireInstructor, type InstructorContext } from './plugins/auth';

function isValidationError(error: unknown): error is { validation: unknown } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'validation' in error &&
    Boolean((error as { validation?: unknown }).validation)
  );
}

const instructors = new WeakMap<FastifyRequest, InstructorContext>();

export async function buildApp() {
  const app = Fastify({
    // Vercel proxies /api to this process and sets X-Forwarded-For.
    trustProxy: true,
    logger: {
      redact: ['req.headers.authorization'],
    },
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.decorateRequest('instructor', {
    getter() {
      const instructor = instructors.get(this);
      if (!instructor) {
        throw new AppError(401, 'Sign in required.', 'UNAUTHENTICATED');
      }
      return instructor;
    },
    setter(value) {
      instructors.set(this, value);
    },
  });

  await app.register(cors, {
    origin: config.webOrigin,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: '1 minute',
  });

  app.setErrorHandler((error: unknown, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.message,
        code: error.code,
        details: error.details,
      });
    }
    if (isValidationError(error)) {
      return reply.status(400).send({
        error: 'Validation failed.',
        details: error.validation,
      });
    }
    request.log.error(error);
    return reply.status(500).send({ error: 'Internal server error.' });
  });

  await app.register(
    async (privateApp) => {
      privateApp.addHook('preHandler', requireInstructor);
      await privateApp.register(meRoutes);
      await privateApp.register(classRoutes);
      await privateApp.register(sessionRoutes);
      await privateApp.register(locationRoutes);
      await privateApp.register(exportRoutes);
    },
    { prefix: '/api' },
  );

  await app.register(publicAttendanceRoutes, { prefix: '/api/public' });

  app.get('/health', async () => ({ ok: true }));

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });

  return app;
}
