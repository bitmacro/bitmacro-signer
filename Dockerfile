# Intenção: imagem de produção com `next build` + `output: "standalone"` — multi-stage para imagem pequena.
# Requer `package-lock.json` (gerar com `npm install` no repositório) para `npm ci` reprodutível.

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat wget
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner
ARG BITMACRO_SIGNER_VERSION=0.0.0
ARG SIGNER_GIT_COMMIT=
LABEL org.opencontainers.image.title="bitmacro-signer-web" \
      org.opencontainers.image.description="BitMacro Signer Next.js (signer-web)" \
      org.opencontainers.image.version="${BITMACRO_SIGNER_VERSION}"
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Runtime: exposed in /api/build-info and UI (optional; pass at build: --build-arg SIGNER_GIT_COMMIT=$(git rev-parse HEAD))
ENV SIGNER_GIT_COMMIT=${SIGNER_GIT_COMMIT}
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
