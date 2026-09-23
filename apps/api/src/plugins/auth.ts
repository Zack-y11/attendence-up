import { createClerkClient, verifyToken } from '@clerk/backend';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../config';
import { AppError } from '../lib/errors';
import { isUniqueConstraintError, prisma } from '../lib/prisma';

const clerk = createClerkClient({ secretKey: config.clerkSecretKey });

export type InstructorContext = {
  id: string;
  email: string;
  displayName: string;
  role: 'INSTRUCTOR';
};

declare module 'fastify' {
  interface FastifyRequest {
    instructor: InstructorContext;
  }
}

function displayNameFromClerk(user: {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  emailAddresses: { emailAddress: string }[];
}): { email: string; displayName: string } {
  const email = user.emailAddresses[0]?.emailAddress ?? '';
  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
    user.username ||
    email ||
    'Instructor';
  return { email, displayName };
}

export async function syncInstructor(userId: string): Promise<InstructorContext> {
  const clerkUser = await clerk.users.getUser(userId);
  const primary =
    clerkUser.emailAddresses.find((item) => item.id === clerkUser.primaryEmailAddressId) ??
    clerkUser.emailAddresses[0];
  const profile = displayNameFromClerk({
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    username: clerkUser.username,
    emailAddresses: primary ? [{ emailAddress: primary.emailAddress }] : [],
  });

  try {
    const user = await prisma.user.upsert({
      where: { id: userId },
      create: { id: userId, email: profile.email, displayName: profile.displayName, role: 'INSTRUCTOR' },
      update: { email: profile.email, displayName: profile.displayName },
    });
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: 'INSTRUCTOR',
    };
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    const existing = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return {
      id: existing.id,
      email: existing.email,
      displayName: existing.displayName,
      role: 'INSTRUCTOR',
    };
  }
}

function failureDetails(error: unknown): { reason: string; message: string } {
  const reason =
    error && typeof error === 'object' && 'reason' in error ? String(error.reason) : 'token-rejected';
  const message = error instanceof Error ? error.message : 'Rejected Clerk session token';
  return { reason, message };
}

function authorizedParties(request: FastifyRequest): string[] {
  const parties = new Set<string>([config.webOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173']);
  const origin = request.headers.origin;
  if (typeof origin === 'string' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    parties.add(origin);
  }
  return [...parties];
}

async function readUserId(request: FastifyRequest): Promise<string> {
  const header = request.headers.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
    request.log.warn('Rejected API request with no Clerk session token');
    throw new AppError(401, 'Sign in required.', 'UNAUTHENTICATED');
  }
  const token = header.slice('Bearer '.length).trim();
  const options = {
    secretKey: config.clerkSecretKey,
    authorizedParties: authorizedParties(request),
  };
  try {
    const claims = await verifyToken(token, options);
    return claims.sub;
  } catch (error) {
    const failure = failureDetails(error);
    if (failure.reason === 'token-invalid-authorized-parties') {
      try {
        const claims = await verifyToken(token, { secretKey: config.clerkSecretKey });
        request.log.warn(failure, 'Clerk session origin did not match WEB_ORIGIN; accepted the signed token');
        return claims.sub;
      } catch (retryError) {
        request.log.warn(failureDetails(retryError), 'Rejected Clerk session token');
        throw new AppError(401, 'Sign in required.', 'UNAUTHENTICATED');
      }
    }
    request.log.warn(failure, 'Rejected Clerk session token');
    throw new AppError(401, 'Sign in required.', 'UNAUTHENTICATED');
  }
}

export async function requireInstructor(request: FastifyRequest, _reply: FastifyReply) {
  const userId = await readUserId(request);
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (existing) {
    request.instructor = {
      id: existing.id,
      email: existing.email,
      displayName: existing.displayName,
      role: 'INSTRUCTOR',
    };
    return;
  }
  request.instructor = await syncInstructor(userId);
}
