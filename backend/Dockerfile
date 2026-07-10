# Multi-stage Dockerfile for backend production
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
ENV PORT=3000
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/server.js"]
