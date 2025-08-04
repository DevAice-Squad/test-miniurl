# Docker Build Fix Guide - npm ci Error

## 🚨 **Error:**
```
process "/bin/sh -c npm ci --silent" did not complete successfully: exit code: 1
```

## ✅ **Quick Solutions (Try in order):**

### **Solution 1: Use Simplified Dockerfile**
The quickest fix is to use the simplified Dockerfile:

```bash
# Backup original Dockerfile
mv Dockerfile Dockerfile.backup

# Use simplified version
mv Dockerfile.simple Dockerfile

# Build again
docker build -t miniurl .
```

### **Solution 2: Clear Docker Cache**
```bash
# Clear Docker build cache
docker builder prune -f

# Remove any existing images
docker rmi miniurl miniurl-frontend-test 2>/dev/null

# Try building again
docker build -t miniurl .
```

### **Solution 3: Fix npm Dependencies**
```bash
# Remove all package-lock.json files
rm frontend/package-lock.json backend/package-lock.json

# Rebuild Docker image
docker build --no-cache -t miniurl .
```

### **Solution 4: Use Debug Script**
```bash
# Make debug script executable
chmod +x scripts/debug-docker-build.sh

# Run debug script to identify exact issue
./scripts/debug-docker-build.sh
```

### **Solution 5: Manual Dependency Fix**
If the issue is with specific dependencies:

```bash
# Test frontend dependencies locally
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
cd ..

# Test backend dependencies locally  
cd backend
rm -rf node_modules package-lock.json
npm install
cd ..

# If both work locally, try Docker build again
docker build -t miniurl .
```

## 🔧 **Root Causes & Fixes:**

### **Common Cause 1: package-lock.json Conflicts**
- **Problem**: package-lock.json files from different environments
- **Fix**: Delete package-lock.json files and use npm install instead of npm ci

### **Common Cause 2: Node Version Mismatch**
- **Problem**: package-lock.json created with different Node version
- **Fix**: Use consistent Node 18 version (already in Dockerfile)

### **Common Cause 3: Missing Dependencies**
- **Problem**: http-proxy-middleware or other deps not properly declared
- **Fix**: Verify dependencies in backend/package.json

### **Common Cause 4: Docker Layer Caching**
- **Problem**: Docker using cached layer with old dependencies
- **Fix**: Use `--no-cache` flag when building

## 📋 **Verification Steps:**

After fixing, verify the build works:

```bash
# 1. Build successfully
docker build -t miniurl .

# 2. Test container startup
docker run -d --name miniurl-test -p 3000:3000 miniurl

# 3. Test health endpoints
curl http://localhost:3000/health
curl http://localhost:3000/api/health

# 4. Check logs
docker logs miniurl-test

# 5. Clean up
docker stop miniurl-test && docker rm miniurl-test
```

## 🚀 **Best Practices Going Forward:**

1. **Always use Dockerfile.simple for production** - More reliable
2. **Test builds locally** before pushing to CI/CD
3. **Keep package-lock.json in sync** across environments
4. **Use specific dependency versions** to avoid conflicts

## 📞 **If Issues Persist:**

1. Check the debug log: `docker-build-debug.log`
2. Verify all required files exist:
   - `frontend/public/index.html`
   - `frontend/package.json`
   - `backend/package.json`
   - `backend/frontend-server.js`
3. Try building on different machine/environment
4. Use Docker's verbose output: `docker build --progress=plain -t miniurl .`

**Recommended: Use Solution 1 (Dockerfile.simple) for immediate resolution!** 🎯 