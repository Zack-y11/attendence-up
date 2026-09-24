# Attendence-Up

Attendence-Up is attendance for instructors. An instructor opens a class meeting or a one-off session and shares a public link, or the QR code for that same link. Students check in with a code and a name and do not create accounts. When the session has a classroom location, the page can take one location reading and the server stores the distance for the instructor. Location is a soft signal: it never blocks a check-in.

Live app: [https://attendence-up.vercel.app/](https://attendence-up.vercel.app/)

The data model and the rules behind it are in [docs/architecture.md](docs/architecture.md).

## Shipped through v0.2.1

Checked against the [v0.1.0](https://github.com/Zack-y11/attendence-up/releases/tag/v0.1.0), [v0.2.0](https://github.com/Zack-y11/attendence-up/releases/tag/v0.2.0), and [v0.2.1](https://github.com/Zack-y11/attendence-up/releases/tag/v0.2.1) releases and against the code on `master`.

**v0.1.0** (pre-release) is the instructor app:

- Clerk sign-up and sign-in for instructors. Classes can be active or archived. A session can belong to a class or stand alone.
- Students open `/attendance/{publicToken}`. The internal session id stays private. A duplicate student code on the same session is rejected.
- Optional classroom point and radius on the class (copied onto a new class session) or on the session. The browser asks for location only when a classroom location is set. The server computes distance with the Haversine formula and stores a location status (`WITHIN_RADIUS`, `OUTSIDE_RADIUS`, `LOW_ACCURACY`, `LOCATION_UNAVAILABLE`, or `NO_EXPECTED_LOCATION`). None of those statuses rejects the check-in.
- Excel and PDF export from one column allowlist. Latitude and longitude are off unless the instructor selects those columns.

**v0.2.0** adds the roster, the public page, and search metadata:

- The live session view shows a QR code for the public link, next to copy link. Scanning it opens the same `/attendance/{publicToken}` page.
- A check-in is stored as Present. On the roster, including after the session is closed, the instructor can set Present, Late, Absent, or Excused. That status is separate from location status and is included in the default export.
- A student can say they are not in the classroom and leave an absence note (8 to 500 characters). The check-in stays Present. The note is required only when they say they are away, and it is dropped otherwise. If the location preview is outside the radius, the page suggests that toggle.
- Optional signature on the check-in form: drawn, or written. The roster and the export can show it. Drawn images are omitted from the spreadsheet text cell; a written signature is kept as text.
- Location preview on the public page: while the browser is locating, once a reading is in (with accuracy), or when location is unavailable. Unavailable location can be retried, and the form can still be submitted.
- Branded export preview before download, for both Excel and PDF. The heading uses the instructor's university, faculty, career, print name, and logo (PNG or JPEG), or the Attendence-Up mark when no logo is set. The preview shows the same columns as the file.
- English and Spanish across the instructor app and the public check-in page, with a language switch. The language is read from `?lng=` and kept in the URL.
- Public landing page at `/` for signed-out visitors, with sign-in and sign-up. SEO for that page and the auth pages: title and description, Open Graph, canonical URL, `hreflang` alternates, `robots.txt`, `sitemap.xml`, and the Google Search Console verification file. Private app routes and check-in tokens are `noindex`.

**v0.2.1** closes the check-in window:

- An open session becomes closed once `attendanceClosesAt` has passed, so it does not stay live after students can no longer register. To take attendance again, set a later close time, then reopen.

After the v0.2.1 tag, `master` also adds a contributor section on the landing page (GitHub profile, this repository, X, and LinkedIn) over an animated grid. That section is not part of the v0.2.1 release.

## In progress

Not yet released. Not in v0.1.0, v0.2.0, or v0.2.1, and not on `master`. Both are coming in open pull requests:

- Attendance percentage per student for a class
- Saved classroom locations

## Architecture

pnpm workspace (`pnpm-workspace.yaml`):

- `apps/web` — instructor and public UI
- `apps/api` — HTTP API and Prisma schema
- `packages/shared` — Zod schemas, attendance labels, export columns, and the location and signature helpers both apps use

Stack: React, Vite, and Tailwind on the web; Fastify on the API; Prisma and PostgreSQL for data; Clerk for instructor accounts. The web app also uses TanStack Query. The API validates input with Zod.

Deployment:

- The web app is on Vercel (`vercel.json`: Vite build of `@attendence-up/web`, output `apps/web/dist`).
- `vercel.json` rewrites `/api/*` to the API on Fly, `https://attendence-up-api.fly.dev/api/$1`. Other paths fall through to `index.html`.
- The API image is `Dockerfile`, configured in `fly.toml` (`attendence-up-api`, port 8080). Fly runs `pnpm exec prisma migrate deploy` as the release command.

Locally, Vite proxies `/api` to `http://localhost:3001`.

## Local setup

### Prerequisites

- Node.js 22. `package.json` allows Node.js 20 or newer. CI and the API image use 22.
- Corepack, which ships with Node. The repo pins `pnpm@10.18.0` (`packageManager`). Use `corepack pnpm` so that version is the one that runs. Enable Corepack once if `corepack pnpm` cannot find pnpm: `corepack enable`.
- Docker, with Docker Compose, for PostgreSQL 16. `docker-compose.yml` publishes it on host port **5434**.

There is no database seed script.

### Environment variables

Copy the examples and replace the Clerk placeholders. The names below are the full set in the example files. Do not commit real keys.

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

`apps/api/.env`:

| Name | Role |
| --- | --- |
| `DATABASE_URL` | Postgres URL. The example matches the Compose database on port 5434. |
| `CLERK_SECRET_KEY` | Clerk secret key. The API process refuses to start when this is missing. |
| `WEB_ORIGIN` | Browser origin allowed by CORS, with no trailing slash. Local example origin is the Vite dev server. |
| `PORT` | API port. Leave the example value for local dev. Fly sets its own port. |

`apps/web/.env`:

| Name | Role |
| --- | --- |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key. The secret key must not go in this file. |

Create a Clerk application and allow the local web origin from `WEB_ORIGIN`. Instructor sign-in stays on the "add your Clerk keys" screen until `VITE_CLERK_PUBLISHABLE_KEY` is a real publishable key. The public check-in route does not need one.

### Install, migrate, and run

From the repo root, after the env files exist:

```bash
docker compose up -d
corepack pnpm install
corepack pnpm db:deploy
corepack pnpm dev
```

`db:deploy` applies the Prisma migrations in `apps/api/prisma/migrations`. Nothing seeds demo rows.

The web app is at http://localhost:5173 and the API at http://localhost:3001. The API reads `apps/api/.env`.

### Typecheck and test

```bash
corepack pnpm typecheck
corepack pnpm test
```

Typecheck covers `packages/shared`, `apps/api`, and `apps/web`. Tests cover the API and the web app. Neither command needs Postgres or Clerk keys.
