import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function parseEnvValue(raw: string): string {
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2)
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadLocalEnv() {
  const path = resolve(process.cwd(), '.env');
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return;
  }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = parseEnvValue(trimmed.slice(separator + 1));
    const current = process.env[key];
    const missing = current === undefined || current === '';
    const placeholder = Boolean(current?.includes('replace_me')) && !value.includes('replace_me');
    if ((missing || placeholder) && value) {
      process.env[key] = value;
    }
  }
}

loadLocalEnv();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  clerkSecretKey: required('CLERK_SECRET_KEY'),
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
};
