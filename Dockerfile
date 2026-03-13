# ════════════════════════════════════════════════════════════════════════════════
# Emiralia Multi-Service Dockerfile
# Construye dashboard o website según el ARG SERVICE
# ════════════════════════════════════════════════════════════════════════════════

ARG SERVICE=dashboard

# ═══ DASHBOARD BUILD ═══════════════════════════════════════════════════════════
FROM node:20-alpine AS dashboard-builder

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

# ═══ DASHBOARD RUNTIME ═════════════════════════════════════════════════════════
FROM node:20-alpine AS dashboard

WORKDIR /app

# Copy root package.json (for tools/ dependencies)
COPY --from=dashboard-builder /app/package*.json ./

# Install root dependencies (needed by tools/)
RUN npm install --omit=dev

# Copy dashboard package files
COPY --from=dashboard-builder /app/apps/dashboard/package*.json ./apps/dashboard/

# Install dashboard dependencies
WORKDIR /app/apps/dashboard
RUN npm install --omit=dev

# Copy built React app
COPY --from=dashboard-builder /app/apps/dashboard/dist ./dist

# Copy server and tools
COPY --from=dashboard-builder /app/apps/dashboard/server.js ./
COPY --from=dashboard-builder /app/tools /app/tools

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "server.js"]

# ═══ WEBSITE BUILD ═════════════════════════════════════════════════════════════
FROM node:20-alpine AS website-builder

WORKDIR /app

# Copy website package files
COPY apps/website/package*.json ./

# Install dependencies
RUN npm install

# Copy website source
COPY apps/website/ ./

# Build website
RUN npm run build

# ═══ WEBSITE RUNTIME ═══════════════════════════════════════════════════════════
FROM nginx:alpine AS website

# Copy built files
COPY --from=website-builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY apps/website/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# ═══ TELEGRAM BOT ════════════════════════════════════════════════════════════
FROM node:20-alpine AS telegram-bot

WORKDIR /app

# Copy root package files (bot dependencies are in root package.json)
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy bot and tools
COPY tools/ ./tools/

ENV NODE_ENV=production

CMD ["node", "tools/telegram/bot.js"]

# ═══ FINAL STAGE (select based on ARG) ════════════════════════════════════════
FROM ${SERVICE} AS final
