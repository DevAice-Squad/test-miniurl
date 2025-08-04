# Simplified single-stage build for MiniURL application
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache sqlite curl wget

# Set working directory
WORKDIR /app

# Copy all package.json files first
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install backend dependencies (including http-proxy-middleware)
WORKDIR /app/backend
RUN echo "Installing backend dependencies..." && \
    npm install --only=production --silent --no-audit --no-fund && \
    echo "Backend dependencies installed successfully"

# Install frontend dependencies  
WORKDIR /app/frontend
RUN echo "Installing frontend dependencies..." && \
    npm install --silent --no-audit --no-fund && \
    echo "Frontend dependencies installed successfully"

# Copy and build frontend
COPY frontend/ ./

# Set production environment for React build (enables relative API URLs)
ENV NODE_ENV=production
ENV REACT_APP_API_BASE_URL=""

RUN echo "Building React frontend for production..." && \
    npm run build && \
    echo "React frontend built successfully"

# Switch back to backend directory and copy backend source
WORKDIR /app/backend
COPY backend/ ./

# Copy built frontend to backend directory for serving
RUN mkdir -p ./frontend/build && \
    cp -r ../frontend/build/* ./frontend/build/ && \
    echo "Verifying frontend files copied correctly..." && \
    ls -la ./frontend/build/ && \
    test -f ./frontend/build/index.html && \
    echo "✅ Frontend build files copied successfully"

# Set environment variables for production
ENV NODE_ENV=production
ENV FRONTEND_PORT=3000
ENV BACKEND_PORT=5000
ENV DB_PATH=/app/data/database.sqlite

# Create directories for data persistence
RUN mkdir -p /app/data /app/logs

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Only expose frontend port (3000) for ALB access
EXPOSE 3000

# Create simple startup script (as root before switching user)
COPY <<EOF /app/start.sh
#!/bin/sh
echo "Starting MiniURL multi-service application..."

# Start backend database service on port 5000 (internal only)
echo "Starting backend database service on port 5000..."
cd /app/backend
PORT=5000 node server.js &
BACKEND_PID=\$!

# Wait for backend to be ready
echo "Waiting for backend to start..."
sleep 5

# Start frontend application on port 3000 (exposed to ALB)
echo "Starting frontend application on port 3000..."
PORT=3000 BACKEND_URL=http://localhost:5000 node frontend-server.js &
FRONTEND_PID=\$!

# Function to cleanup on exit
cleanup() {
    echo "Shutting down services..."
    kill \$BACKEND_PID \$FRONTEND_PID 2>/dev/null
    wait
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Wait for any process to exit
wait \$BACKEND_PID \$FRONTEND_PID
EOF

# Set permissions and ownership before switching to nodejs user
RUN chmod +x /app/start.sh && \
    chown -R nodejs:nodejs /app

# Switch to non-root user (security best practice)
USER nodejs

# Health check for ALB target group (check frontend service)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start both services
CMD ["/app/start.sh"] 