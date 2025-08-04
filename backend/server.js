const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Import models and database
const { sequelize } = require('./models');

// Import middleware
const { 
  generalRateLimit, 
  securityHeaders, 
  extractClientIp 
} = require('./middleware/security');

// Import routes
const authRoutes = require('./routes/auth');
const urlRoutes = require('./routes/urls');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// ===== MIDDLEWARE SETUP =====

// Security headers
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  }
}));

// Custom security headers
app.use(securityHeaders);

// CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:3001',
      'https://mini.cloudrakshak.com'
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-ID']
}));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Client IP extraction
app.use(extractClientIp);

// General rate limiting
app.use(generalRateLimit);

// Trust proxy (for getting real IP addresses)
app.set('trust proxy', 1);

// ===== ROUTES =====

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    database: 'SQLite Connected'
  });
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    name: 'MinURL API Documentation',
    version: '1.0.0',
    description: 'URL Shortener API with custom algorithms and developer features',
    base_url: `${req.protocol}://${req.get('host')}`,
    status: 'Active',
    database: 'SQLite',
    endpoints: {
      authentication: {
        'POST /auth/register': 'Register a new user account',
        'POST /auth/login': 'Login and get access token',
        'GET /auth/profile': 'Get current user profile',
        'PUT /auth/profile': 'Update user profile',
        'PUT /auth/change-password': 'Change user password'
      },
      urls: {
        'POST /urls/shorten': 'Shorten a URL',
        'GET /urls/:shortCode': 'Redirect to original URL',
        'GET /urls/user/urls': 'Get user\'s URLs (requires auth)',
        'GET /urls/analytics/:id': 'Get URL analytics (requires auth)',
        'PUT /urls/:id': 'Update URL (requires auth)',
        'DELETE /urls/:id': 'Delete URL (requires auth)'
      },
      admin: {
        'GET /admin/users': 'Get all users (admin only)',
        'POST /admin/users': 'Create user (admin only)',
        'PUT /admin/users/:id': 'Update user (admin only)',
        'DELETE /admin/users/:id': 'Delete user (admin only)',
        'GET /admin/urls': 'Get all URLs (admin only)',
        'GET /admin/analytics/dashboard': 'Get dashboard analytics (admin only)',
        'GET /admin/analytics/user-activity': 'Get user activity logs (admin only)'
      },
      api_v1: {
        'POST /api/v1/shorten': 'Shorten URL with custom algorithms',
        'POST /api/v1/shorten/bulk': 'Bulk URL shortening',
        'GET /api/v1/url/:shortCode': 'Get URL information',
        'POST /api/v1/validate': 'Validate URL format',
        'GET /api/v1/algorithms': 'Get available algorithms',
        'GET /api/v1/health': 'API health check',
        'GET /api/v1/stats': 'Get API usage statistics (requires auth)'
      }
    },
    authentication: {
      type: 'Bearer Token (JWT)',
      header: 'Authorization: Bearer <token>',
      description: 'Include JWT token in Authorization header for authenticated endpoints'
    },
    rate_limits: {
      general: '100 requests per 15 minutes',
      authentication: '5 attempts per 15 minutes',
      url_shortening: '20 URLs per minute'
    },
    custom_algorithms: {
      hash: 'MD5 hash-based (6 chars)',
      uuid: 'UUID-based (8 chars)',
      custom: 'Customizable with options'
    }
  });
});

// Mount route handlers
app.use('/auth', authRoutes);
app.use('/urls', urlRoutes);
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);

// BACKEND DATABASE SERVICE CONFIGURATION
// This service runs on port 5000 (internal only) and handles database operations
// Frontend service (port 3000) will proxy requests to this backend service
console.log('Backend database service starting...');
console.log(`Port: ${PORT}`);
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Database: ${process.env.DB_PATH}`);

// ===== ERROR HANDLING =====

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    available_endpoints: [
      '/health',
      '/api/docs',
      '/auth/*',
      '/urls/*',
      '/admin/*',
      '/api/*'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);

  // CORS error
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS Error',
      message: 'Origin not allowed by CORS policy'
    });
  }

  // JSON parsing error
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      error: 'Invalid JSON',
      message: 'Request body contains invalid JSON'
    });
  }

  // Default error response
  res.status(error.status || 500).json({
    error: error.name || 'Internal Server Error',
    message: error.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// ===== DATABASE CONNECTION & SERVER STARTUP =====

const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ SQLite database connection established successfully');

    // Sync models (create tables if they don't exist)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Database models synchronized');
    } else {
      await sequelize.sync();
      console.log('✅ Database models loaded');
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 MinURL Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/health`);
      console.log(`📖 API docs: http://localhost:${PORT}/api/docs`);
      console.log(`🏠 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log(`🔗 Short URL domain: ${process.env.APP_DOMAIN || 'mini.cloudrakshak.com'}`);
      console.log(`💾 Database: SQLite (${process.env.DB_PATH || './database.sqlite'})`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📴 SIGTERM received. Shutting down gracefully...');
  await sequelize.close();
  console.log('📴 Database connection closed');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📴 SIGINT received. Shutting down gracefully...');
  await sequelize.close();
  console.log('📴 Database connection closed');
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in production
  if (process.env.NODE_ENV === 'development') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
startServer();

module.exports = app; 