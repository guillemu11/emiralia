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

# Copy dashboard package files
COPY --from=builder /app/apps/dashboard/package*.json ./apps/dashboard/

# Install production dependencies only
WORKDIR /app/apps/dashboard
RUN npm install --omit=dev

# Copy built React app
COPY --from=builder /app/apps/dashboard/dist ./dist

# Copy server and tools
COPY --from=builder /app/apps/dashboard/server.js ./
COPY --from=builder /app/tools /app/tools

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "server.js"]
