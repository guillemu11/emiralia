FROM node:20-alpine

WORKDIR /app

COPY ./apps/api/package*.json ./apps/api/
RUN cd apps/api && npm install

COPY . .

WORKDIR /app/apps/api

EXPOSE 3001

CMD ["npm", "run", "dev"]
