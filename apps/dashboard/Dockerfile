# ════════════════════════════════════════════════════════════════════════════════
# Stage 1: Build React App
# ════════════════════════════════════════════════════════════════════════════════
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dashboard package files
COPY apps/dashboard/package*.json ./apps/dashboard/

# Install dashboard dependencies
WORKDIR /app/apps/dashboard
RUN npm install

# Copy entire monorepo (needed for tools/ imports)
WORKDIR /app
COPY . .

# Build React app
WORKDIR /app/apps/dashboard
RUN npm run build

# ════════════════════════════════════════════════════════════════════════════════
# Stage 2: Production Runtime
# ════════════════════════════════════════════════════════════════════════════════
FROM node:20-alpine

WORKDIR /app

# Copy root package.json (for tools/ dependencies)
COPY --from=builder /app/package*.json ./

# Install root dependencies (needed by tools/)
RUN npm install --omit=dev

# Copy dashboard package files
COPY --from=builder /app/apps/dashboard/package*.json ./apps/dashboard/

# Install dashboard dependencies
WORKDIR /app/apps/dashboard
RUN npm install --omit=dev

# Copy built React app
COPY --from=builder /app/apps/dashboard/dist ./dist

# Copy server and tools
COPY --from=builder /app/apps/dashboard/server.js ./
COPY --from=builder /app/tools /app/tools
COPY --from=builder /app/.claude /app/.claude

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "server.js"]
