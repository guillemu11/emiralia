# ════════════════════════════════════════════════════════════════════════════════
# Stage 1: Build React App
# ════════════════════════════════════════════════════════════════════════════════
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files for all dependencies
COPY package*.json ./
COPY apps/dashboard/package*.json ./apps/dashboard/

# Install dependencies
RUN npm install --workspace=apps/dashboard

# Copy entire monorepo (needed for tools/ imports)
COPY . .

# Build React app
WORKDIR /app/apps/dashboard
RUN npm run build

# ════════════════════════════════════════════════════════════════════════════════
# Stage 2: Production Runtime
# ════════════════════════════════════════════════════════════════════════════════
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/apps/dashboard/package*.json ./apps/dashboard/

# Install production dependencies only
RUN npm install --workspace=apps/dashboard --omit=dev

# Copy built React app
COPY --from=builder /app/apps/dashboard/dist ./apps/dashboard/dist

# Copy server and tools
COPY --from=builder /app/apps/dashboard/server.js ./apps/dashboard/
COPY --from=builder /app/tools ./tools

WORKDIR /app/apps/dashboard

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "server.js"]
