# Multi-stage build for MiniURL application
# Stage 1: Build React frontend
FROM node:18-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --silent
COPY frontend/ ./
RUN npm run build

# Stage 2: Setup backend with frontend assets
FROM node:18-alpine AS production

# Install SQLite and other dependencies
RUN apk add --no-cache sqlite curl wget

# Create app directory
WORKDIR /app

# Copy backend dependencies and install
COPY backend/package*.json ./
RUN npm ci --only=production --silent

# Copy backend source code
COPY backend/ ./

# Copy frontend build to backend's static files location
COPY --from=frontend-build /app/frontend/build ./frontend/build

# Create directories for data persistence
RUN mkdir -p /app/data /app/logs

# Set environment variables for production
ENV NODE_ENV=production
ENV FRONTEND_PORT=3000
ENV BACKEND_PORT=5000
ENV DB_PATH=/app/data/database.sqlite

# Architecture: 
# - Frontend Node.js app on port 3000 (exposed to ALB)
# - Backend database service on port 5000 (internal only)
# ALB will connect to port 3000 for frontend access

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Change ownership of the app directory to non-root user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user (security best practice)
USER nodejs

# IMPORTANT: Only expose frontend port (3000) for ALB access
# - Port 3000: Frontend Node.js application (exposed to ALB)
# - Port 5000: Backend database service (internal only, not exposed)
EXPOSE 3000

# Create startup script for multi-service architecture
COPY --chown=nodejs:nodejs <<EOF /app/start.sh
#!/bin/sh
echo "Starting multi-service application..."

# Start backend database service on port 5000 (internal only)
echo "Starting backend database service on port 5000..."
PORT=5000 node server.js &
BACKEND_PID=\$!

# Wait for backend to be ready
echo "Waiting for backend to start..."
sleep 5

# Start frontend application on port 3000 (exposed to ALB)
echo "Starting frontend application on port 3000..."
PORT=3000 BACKEND_URL=http://localhost:5000 node frontend-server.js &
FRONTEND_PID=\$!

# Wait for any process to exit
wait \$BACKEND_PID \$FRONTEND_PID
EOF

RUN chmod +x /app/start.sh

# Health check for ALB target group (check frontend service)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start both services
CMD ["/app/start.sh"] 