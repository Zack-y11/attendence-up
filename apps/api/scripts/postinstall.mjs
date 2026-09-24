import { spawnSync } from 'node:child_process';

// Vercel only builds the web app. The API and database run on Fly, which
// generates the Prisma client during its own image build.
if (process.env.VERCEL) {
  console.log('Skipping prisma generate on Vercel; the API runs on Fly.');
  process.exit(0);
}

const result = spawnSync('prisma', ['generate'], { stdio: 'inherit', shell: true });
process.exit(result.status ?? 1);
