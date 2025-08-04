const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

console.log(`Frontend server starting on port ${PORT}`);
console.log(`Backend database service URL: ${BACKEND_URL}`);

// URL parameter validation middleware
const validateUrlParams = (req, res, next) => {
  try {
    // Check for malicious patterns in the URL path
    const path = req.path || req.url;
    
    // Block obvious path traversal and encoding attacks
    const maliciousPatterns = [
      /\.\./,                    // Path traversal
      /%[cC]0%[aA][fF]/,        // Overlong UTF-8 encoding for /
      /%[eE]0%80%[aA][fF]/,     // Another overlong encoding
      /%252[eE]/,               // Double-encoded dots
      /\x00/,                   // Null bytes
      /%00/                     // URL-encoded null bytes
    ];
    
    for (const pattern of maliciousPatterns) {
      if (pattern.test(path)) {
        console.warn(`Blocked malicious request: ${path} from IP: ${req.ip}`);
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Request contains invalid characters'
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('URL validation error:', error);
    return res.status(400).json({
      error: 'Invalid request',
      message: 'Failed to process request URL'
    });
  }
};

// Apply URL validation to all requests
app.use(validateUrlParams);

// Health check endpoint for ALB
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    service: 'frontend',
    port: PORT,
    backend_url: BACKEND_URL,
    node_env: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Proxy API requests to backend database service
app.use('/api', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  onError: (err, req, res) => {
    console.error('Proxy error:', err.message);
    res.status(502).json({ error: 'Backend service unavailable' });
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[PROXY] ${req.method} ${req.path} → ${BACKEND_URL}${req.path}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`[PROXY] ${req.method} ${req.path} ← ${proxyRes.statusCode}`);
  }
}));

// Proxy auth requests to backend database service
app.use('/auth', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  onError: (err, req, res) => {
    console.error('Auth proxy error:', err.message);
    res.status(502).json({ error: 'Authentication service unavailable' });
  }
}));

// Proxy URL management requests to backend database service
app.use('/urls', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  onError: (err, req, res) => {
    console.error('URLs proxy error:', err.message);
    res.status(502).json({ error: 'URL service unavailable' });
  }
}));

// Proxy admin requests to backend database service
app.use('/admin', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  onError: (err, req, res) => {
    console.error('Admin proxy error:', err.message);
    res.status(502).json({ error: 'Admin service unavailable' });
  }
}));

// Serve React static files in production
if (process.env.NODE_ENV === 'production') {
  console.log('Serving React static files...');
  
  const buildPath = path.join(__dirname, 'frontend/build');
  const indexPath = path.join(__dirname, 'frontend/build/index.html');
  
  console.log(`Frontend build path: ${buildPath}`);
  console.log(`Index.html path: ${indexPath}`);
  
  // Check if build directory exists
  const fs = require('fs');
  if (fs.existsSync(buildPath)) {
    console.log('✅ Build directory exists');
    console.log('Build directory contents:', fs.readdirSync(buildPath));
    
    if (fs.existsSync(indexPath)) {
      console.log('✅ index.html exists');
    } else {
      console.error('❌ index.html NOT found at:', indexPath);
    }
  } else {
    console.error('❌ Build directory NOT found at:', buildPath);
  }
  
  // Serve static files from React build
  app.use(express.static(buildPath));
  
  // Catch-all handler: serve React app for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(indexPath);
  });
} else {
  // Development mode - just proxy everything to backend
  console.log('Development mode - not serving static files');
  app.get('*', (req, res) => {
    res.json({ 
      message: 'Frontend service running in development mode',
      backend: BACKEND_URL 
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Frontend server error:', err);
  
  // Handle URI decoding errors
  if (err instanceof URIError || err.message.includes('Failed to decode param')) {
    console.warn(`URI decoding error from IP ${req.ip}: ${err.message}`);
    return res.status(400).json({ 
      error: 'Invalid URL format',
      message: 'The requested URL contains invalid characters'
    });
  }
  
  // Handle other errors
  res.status(500).json({ error: 'Frontend service error' });
});

// Start the frontend server
app.listen(PORT, () => {
  console.log(`✅ Frontend server running on port ${PORT}`);
  console.log(`🔗 Proxying API requests to backend: ${BACKEND_URL}`);
  console.log(`🏥 Health check available at: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Frontend server shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Frontend server shutting down...');
  process.exit(0);
}); 