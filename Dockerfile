FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && corepack prepare pnpm@10.18.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/api/prisma apps/api/prisma
COPY packages/shared/package.json packages/shared/package.json

# `prisma generate` reads DATABASE_URL from the schema. It does not connect.
# Fly secrets replace this value at runtime.
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build"

RUN pnpm install --frozen-lockfile --filter @attendence-up/api...

COPY apps/api/src apps/api/src
COPY apps/api/tsconfig.json apps/api/tsconfig.json
COPY packages/shared/src packages/shared/src
COPY packages/shared/tsconfig.json packages/shared/tsconfig.json

WORKDIR /app/apps/api

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["pnpm", "start"]
