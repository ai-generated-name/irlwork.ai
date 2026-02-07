# irlwork.ai Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY api/package*.json ./
RUN npm ci --only=production

# Copy source
COPY api/ ./
COPY backend/ ./backend/

# Environment variables (set in Railway, not here)
# EXPOSE 3002

CMD ["node", "server.js"]
