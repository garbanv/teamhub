# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.19.0 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time placeholders only. Runtime values are injected by Docker Compose.
# All application routes are dynamic; the build never connects to a database.
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ENV BETTER_AUTH_SECRET=build-only-placeholder-secret-not-for-production
ENV BETTER_AUTH_URL=http://localhost:3000

RUN pnpm build

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/db ./db
COPY --from=builder --chown=node:node /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=builder --chown=node:node /app/scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
  && mkdir -p /app/.next/cache \
  && chown -R node:node /app

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
