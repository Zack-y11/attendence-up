import '../config';
import { Prisma, PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
