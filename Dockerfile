FROM node:18-slim AS base

# Install system dependencies for better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    gcc \
    sqlite3 \
    libsqlite3-dev \
    pkg-config \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# ── 1) Builder: Build the application ──────────────────────────────────────
FROM base AS builder
WORKDIR /app

# Copy source
COPY . .

# Create public directory if it doesn't exist
RUN mkdir -p public

# Install all dependencies and rebuild better-sqlite3 from source
RUN npm ci || npm install
RUN npm rebuild better-sqlite3 --build-from-source

# Create data directory if needed
RUN mkdir -p data

# Build the application
RUN npm run build

# ── 2) Runner: Production image ────────────────────────────────────────────
FROM node:18-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3500

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    sqlite3 \
    libsqlite3-dev \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN groupadd --gid 1001 nodejs \
    && useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home nextjs

# Create directories
RUN mkdir -p public .next/static

# Copy built files
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts 
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./
COPY --from=builder --chown=nextjs:nodejs /app/server.js ./

# Copy node_modules with native modules
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
# Copy other node_modules
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Prepare data directory and fix ownership
RUN mkdir -p data && chown -R nextjs:nodejs data public .next

# Switch away from root
USER nextjs

EXPOSE 3500
CMD ["sh","-c","node scripts/setup.js && node server.js"]
