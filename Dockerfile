# irlwork.ai Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY api/package*.json ./
RUN npm ci --only=production

# Copy source
COPY api/ ./
COPY backend/ ./backend/

# Debug: List what was copied
RUN echo "=== Checking /app structure ===" && \
    ls -la /app/ && \
    echo "=== Checking /app/backend ===" && \
    ls -la /app/backend/ 2>&1 || echo "backend dir not found" && \
    echo "=== Checking /app/backend/services ===" && \
    ls -la /app/backend/services/ 2>&1 || echo "services dir not found"

# Environment variables (set in Railway, not here)
# EXPOSE 3002

CMD ["node", "server.js"]
