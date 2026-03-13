FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY ./apps/api/package*.json ./apps/api/
RUN cd apps/api && npm ci --omit=dev

# Copy application code
COPY ./apps/api/src ./apps/api/src

# Copy SQL files for auto-init
COPY ./tools/db/schema.sql ./tools/db/schema.sql
COPY ./tools/db/seed.sql ./tools/db/seed.sql

WORKDIR /app/apps/api

ENV NODE_ENV=production
EXPOSE 3001

CMD ["npm", "start"]
