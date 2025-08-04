#!/bin/bash

echo "🔍 Docker Build Debug Script"
echo "============================="

# Check Docker version
echo "📋 Docker version:"
docker --version
echo ""

# Check current directory and files
echo "📁 Current directory structure:"
ls -la
echo ""

echo "📦 Frontend package.json:"
if [ -f "frontend/package.json" ]; then
    echo "✅ frontend/package.json exists"
    echo "Dependencies count: $(cat frontend/package.json | grep -c '\".*\":.*\".*\"')"
else
    echo "❌ frontend/package.json missing"
fi
echo ""

echo "📦 Backend package.json:"
if [ -f "backend/package.json" ]; then
    echo "✅ backend/package.json exists"
    echo "Dependencies count: $(cat backend/package.json | grep -c '\".*\":.*\".*\"')"
    echo "http-proxy-middleware: $(grep -q 'http-proxy-middleware' backend/package.json && echo '✅ Found' || echo '❌ Missing')"
else
    echo "❌ backend/package.json missing"
fi
echo ""

echo "📋 Package-lock.json files:"
find . -name "package-lock.json" -type f | while read file; do
    echo "  📄 $file ($(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null || echo "unknown") bytes)"
done
echo ""

# Check frontend public directory
echo "🌐 Frontend public directory:"
if [ -d "frontend/public" ]; then
    echo "✅ frontend/public exists"
    ls -la frontend/public/
else
    echo "❌ frontend/public missing"
fi
echo ""

echo "🐳 Attempting Docker build with verbose output..."
echo "================================================"

# Try building just the frontend stage first
echo "🔧 Testing frontend build stage only..."
docker build --target frontend-build -t miniurl-frontend-test . 2>&1 | tee docker-build-debug.log

if [ $? -eq 0 ]; then
    echo "✅ Frontend stage built successfully"
    
    echo ""
    echo "🔧 Testing full build..."
    docker build -t miniurl-debug . 2>&1 | tee -a docker-build-debug.log
    
    if [ $? -eq 0 ]; then
        echo "✅ Full build successful!"
        
        echo ""
        echo "🧪 Testing container startup..."
        docker run --rm -d --name miniurl-test -p 3000:3000 miniurl-debug
        sleep 5
        
        echo "🏥 Testing health endpoints..."
        curl -f http://localhost:3000/health || echo "❌ Health check failed"
        
        echo ""
        echo "🛑 Stopping test container..."
        docker stop miniurl-test
        
    else
        echo "❌ Full build failed"
    fi
else
    echo "❌ Frontend stage failed"
fi

echo ""
echo "📊 Build log saved to: docker-build-debug.log"
echo "💡 Common solutions:"
echo "  1. Delete package-lock.json files and rebuild"
echo "  2. Clear Docker build cache: docker builder prune"
echo "  3. Update Node.js version in Dockerfile"
echo "  4. Check for dependency conflicts in package.json" 