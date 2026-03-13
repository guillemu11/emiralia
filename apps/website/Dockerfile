# ════════════════════════════════════════════════════════════════════════════════
# Stage 1: Build Website
# ════════════════════════════════════════════════════════════════════════════════
FROM node:20-alpine AS builder

WORKDIR /app

# Copy website package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy website source
COPY . ./

# Build website
RUN npm run build

# ════════════════════════════════════════════════════════════════════════════════
# Stage 2: Serve with Nginx
# ════════════════════════════════════════════════════════════════════════════════
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose default port (Railway overrides with $PORT)
EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
