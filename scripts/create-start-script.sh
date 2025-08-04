#!/bin/bash

echo "Creating startup script for MiniURL multi-service container..."

cat > start.sh << 'EOF'
#!/bin/sh
echo "Starting MiniURL multi-service application..."

# Start backend database service on port 5000 (internal only)
echo "Starting backend database service on port 5000..."
cd /app/backend
PORT=5000 node server.js &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for backend to start..."
sleep 5

# Start frontend application on port 3000 (exposed to ALB)
echo "Starting frontend application on port 3000..."
PORT=3000 BACKEND_URL=http://localhost:5000 node frontend-server.js &
FRONTEND_PID=$!

# Function to cleanup on exit
cleanup() {
    echo "Shutting down services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    wait
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Wait for any process to exit
wait $BACKEND_PID $FRONTEND_PID
EOF

chmod +x start.sh
echo "✅ Startup script created successfully: start.sh"
echo "📋 To use in Dockerfile: COPY start.sh /app/start.sh" 