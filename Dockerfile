# ── Stage 1: install production dependencies ──────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy manifests first for better layer caching
COPY package.json package-lock.json ./

# Install only production deps
RUN npm ci --omit=dev


# ── Stage 2: final runtime image ──────────────────────────────────────────────
FROM node:20-alpine AS runner

# Add dumb-init so Node receives proper OS signals (graceful shutdown)
RUN apk add --no-cache dumb-init

# Create a non-root user for security
RUN addgroup -S bristo && adduser -S bristo -G bristo

WORKDIR /app

# Copy production node_modules from the deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source (excluding anything in .dockerignore)
COPY . .

# Ensure the non-root user owns the app files
RUN chown -R bristo:bristo /app

USER bristo

# App listens on this port (matches PORT env var default in server.js)
EXPOSE 5000

# Health-check: hit the /api/health endpoint every 30 s
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

# Use dumb-init as PID 1 to handle signals correctly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
