FROM node:22.14.0-alpine AS builder
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV DATABASE_URL=mongodb://127.0.0.1:27017/build NEXT_TELEMETRY_DISABLED=1
RUN npm run prisma:generate && npm run build

FROM node:22.14.0-alpine AS migrator
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node scripts/member-auth-indexes.cjs ./scripts/member-auth-indexes.cjs
USER node
CMD ["node", "scripts/member-auth-indexes.cjs"]

FROM node:22.14.0-alpine AS runtime
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 NEXT_TELEMETRY_DISABLED=1
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=8s --start-period=30s --retries=4 CMD node -e 'fetch("http://127.0.0.1:"+process.env.PORT+"/api/health/ready",{signal:AbortSignal.timeout(7000),redirect:"manual"}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))'
CMD ["node", "server.js"]
