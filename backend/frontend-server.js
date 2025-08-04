const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

console.log(`Frontend server starting on port ${PORT}`);
console.log(`Backend database service URL: ${BACKEND_URL}`);

// Health check endpoint for ALB
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    service: 'frontend',
    port: PORT,
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
    console.log(`Proxying ${req.method} ${req.path} to ${BACKEND_URL}`);
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
  
  // Serve static files from React build
  app.use(express.static(path.join(__dirname, 'frontend/build')));
  
  // Catch-all handler: serve React app for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/build/index.html'));
  });
} else {
  // Development mode - just proxy everything to backend
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