import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      CLERK_SECRET_KEY: 'sk_test_saved_locations',
    },
  },
});
