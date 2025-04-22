FROM node:18-alpine AS base

# Install dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++ gcc

# Setup pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package.json files
COPY package.json ./

# Install dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Create the data directory
RUN mkdir -p data

# Build the project
RUN pnpm run build

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built files
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./

# Fix permissions for the data directory
RUN mkdir -p data && chown -R nextjs:nodejs data

# Switch to non-root user
USER nextjs

# Expose the port the app will run on
EXPOSE 3000

# Database setup and startup command
CMD ["sh", "-c", "node scripts/setup.js && node server.js"] 