# Stage 1: Build dependencies
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Runtime
FROM node:20-alpine
WORKDIR /app

# Copy dependencies from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy bot code
COPY tools/telegram/ ./tools/telegram/
COPY tools/db/ ./tools/db/
COPY tools/pm-agent/ ./tools/pm-agent/
COPY package*.json ./

# Health check (polling bot no tiene HTTP endpoint, verificar proceso)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD pgrep -f "node.*bot.js" || exit 1

# Graceful shutdown
STOPSIGNAL SIGTERM

# Run bot
CMD ["node", "tools/telegram/bot.js"]
