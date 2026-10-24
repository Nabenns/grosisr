# ---- build stage ----
FROM node:22-slim AS builder
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.34.8 --activate

WORKDIR /app

# Install deps first (better layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Prisma client needs the schema
COPY prisma ./prisma
RUN pnpm exec prisma generate

# Build the app
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ---- runtime stage ----
FROM node:22-slim AS runner
ENV NODE_ENV=production \
  NEXT_TELEMETRY_DISABLED=1 \
  PORT=3000
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable && corepack prepare pnpm@10.34.8 --activate \
  && useradd -m -u 10001 grosir

WORKDIR /app
COPY --from=builder --chown=grosir:grosir /app/node_modules ./node_modules
COPY --from=builder --chown=grosir:grosir /app/.next ./.next
COPY --from=builder --chown=grosir:grosir /app/package.json ./package.json
COPY --from=builder --chown=grosir:grosir /app/prisma ./prisma
COPY --from=builder --chown=grosir:grosir /app/next.config.mjs ./next.config.mjs
COPY --chown=grosir:grosir docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER grosir
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/auth/session').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["pnpm", "start"]
