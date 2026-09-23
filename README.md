# Attendence-Up

Instructors open attendance for a class meeting or a one-off event. Students do not need accounts. They open a public link, enter a code and name, and optionally share a single location reading. Distance is calculated on the server and shown to the instructor. It never rejects a registration by itself.

## Stack

- Web: React, Vite, Tailwind, TanStack Query, Clerk
- API: Fastify, Zod, Prisma
- Database: PostgreSQL

See [docs/architecture.md](docs/architecture.md) for the data model and the decisions behind it.

## Run it

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and start it.
2. Create a Clerk application and allow `http://localhost:5173`.
3. Copy the environment files and paste your keys:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

4. Start Postgres, install dependencies, and apply the migration:

```bash
docker compose up -d
corepack pnpm install
corepack pnpm db:deploy
corepack pnpm dev
```

The API reads `apps/api/.env`. Postgres is published on port **5434** so it does not collide with a Postgres install that is already using 5432. The web app is at http://localhost:5173 and the API at http://localhost:3001.

`pnpm` is available through Node's Corepack (`corepack pnpm`) if it is not on your PATH.

If install prints that Prisma's build scripts were ignored, approve them once with `corepack pnpm approve-builds`, then run `corepack pnpm install` again. Prisma needs those scripts to download its database engine.

## What to try

1. Sign up as an instructor.
2. Create a class, then a session. Optionally set a classroom location and a radius of 200, 300, or 500 meters.
3. Open attendance. The live session shows a QR code of the public link. The code changes every 30 seconds, and Copy link matches the code on screen.
4. Scan or open that link, then submit a student code and name. Allow or deny location. Both are accepted. An expired QR fails and asks you to scan the screen again.
5. Watch the session page update, then close attendance.
6. Download Excel or PDF. Latitude and longitude are off unless you select those columns.
7. Repeat with a standalone session from Sessions, which is not attached to a class.

## Tests

```bash
corepack pnpm test
```
