#######################
#  Stage 1 – builder  #
#######################
FROM node:20-bullseye AS builder
WORKDIR /app

# 1. install deps with clean, repeatable layer and cache
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps --cache /root/.npm

# 2. copy source & build standalone output
COPY . .
# Use Next.js cache for faster builds
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build          # generates .next, required for SSR

########################
#  Stage 2 – runtime   #
########################
FROM node:20-slim

# Cloud Run sets PORT; default to 8080 for local runs
ENV PORT=8080 NODE_ENV=production
WORKDIR /app

# copy only runtime artefacts → small final image
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 8080
CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "8080"]