import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      CLERK_SECRET_KEY: 'sk_test_unit_not_a_real_key',
      DATABASE_URL: 'postgresql://attendence:attendence@localhost:5434/attendence?schema=public',
    },
  },
});
