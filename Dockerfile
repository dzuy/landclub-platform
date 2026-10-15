FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS build
ARG NEXT_PUBLIC_MAPBOX_TOKEN
ENV NEXT_PUBLIC_MAPBOX_TOKEN=$NEXT_PUBLIC_MAPBOX_TOKEN
COPY . .
RUN npm test && npm run build
RUN node node_modules/typescript/bin/tsc scripts/document-worker.ts --outDir .scanner --module commonjs --target ES2022 --moduleResolution node --esModuleInterop --skipLibCheck

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
ENV NODE_EXTRA_CA_CERTS=/app/certificates/supabase-ca.crt
RUN apt-get update && apt-get install -y --no-install-recommends clamav clamav-freshclam ca-certificates && rm -rf /var/lib/apt/lists/*
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs
ENV LAND_CLUB_CLAMSCAN_PATH=/usr/bin/clamscan
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.scanner ./.scanner
COPY --from=build --chown=nextjs:nodejs /app/deployment/freshclam.conf ./deployment/freshclam.conf
RUN mkdir -p /var/lib/clamav && chown nextjs:nodejs /var/lib/clamav
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=build --chown=nextjs:nodejs /app/migrations ./migrations
COPY --from=build --chown=nextjs:nodejs /app/certificates ./certificates
COPY --from=build --chown=nextjs:nodejs /app/src/lib/seed-properties.json ./src/lib/seed-properties.json
USER nextjs
# Seed a signature snapshot at build time; runtime refreshes it every six hours.
RUN freshclam --config-file=/app/deployment/freshclam.conf --stdout
RUN node .scanner/scripts/document-worker.js --probe
EXPOSE 3000
CMD ["node", "scripts/start-services.mjs"]
