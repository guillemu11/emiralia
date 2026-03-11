FROM node:20-alpine

WORKDIR /app

COPY ./apps/dashboard/package*.json ./apps/dashboard/
RUN cd apps/dashboard && npm install

COPY . .

WORKDIR /app/apps/dashboard

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
