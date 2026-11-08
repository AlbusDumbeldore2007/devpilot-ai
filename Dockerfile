# Dockerfile for DevPilot AI Backend
# ---------------------------------
# Node.js Express server with MongoDB, PostgreSQL, and AI integration.
# ---------------------------------

FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY server/server.js ./
COPY server/config/ ./config/
COPY server/models/ ./models/
COPY server/routes/ ./routes/
COPY server/services/ ./services/
COPY server/middleware/ ./middleware/
COPY server/utils/ ./utils/
COPY server/uploads/ ./uploads/
COPY client/ ./client/

# Build the client
RUN npm run build --prefix client

# Development stage
FROM node:20-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy built assets from builder
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Copy source code
COPY --from=builder /app/server/server.js ./server/server.js
COPY --from=builder /app/server/config/ ./server/config/
COPY --from=builder /app/server/models/ ./server/models/
COPY --from=builder /app/server/routes/ ./server/routes/
COPY --from=builder /app/server/services/ ./server/services/
COPY --from=builder /app/server/middleware/ ./server/middleware/
COPY --from=builder /app/server/utils/ ./server/utils/
COPY --from=builder /app/server/uploads/ ./server/uploads/

# Set permissions
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 5000

ENV NODE_ENV=production

# Start the server
CMD ["node", "server/server.js"]