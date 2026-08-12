# Stage 1: Build/Test environment
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

COPY . .

# Stage 2: Production release
FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy application source code
COPY --from=builder /usr/src/app/src ./src

# Create logs and uploads directories, setting ownership to the node user
RUN mkdir -p logs uploads && chown -R node:node /usr/src/app

# Run as non-root user for security
USER node

EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

CMD ["node", "src/server.js"]
