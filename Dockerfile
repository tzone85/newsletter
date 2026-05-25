# syntax=docker/dockerfile:1.7

############################
# Stage 1 — install deps
############################
FROM node:20-alpine AS deps
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

############################
# Stage 2 — runtime
############################
FROM node:20-alpine AS runtime

RUN addgroup -S app && adduser -S app -G app

WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    NPM_CONFIG_LOGLEVEL=warn

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY views ./views
COPY public ./public

USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --spider http://127.0.0.1:3000/health || exit 1

CMD ["node", "src/server.js"]
