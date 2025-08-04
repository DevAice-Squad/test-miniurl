const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

// Rate limiting configuration
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs: windowMs || 15 * 60 * 1000, // 15 minutes default
    max: max || 100, // limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests',
      message: message || 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too many requests',
        message: message || 'Too many requests from this IP, please try again later.',
        retryAfter: Math.round(windowMs / 1000)
      });
    }
  });
};

// Different rate limiters for different endpoints
const authRateLimit = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many authentication attempts, please try again in 15 minutes'
);

const urlShortenRateLimit = createRateLimiter(
  60 * 1000, // 1 minute
  20, // 20 URLs per minute
  'Too many URL shortening requests, please wait a minute'
);

const generalRateLimit = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests
  'Too many requests, please try again later'
);

// CSRF Protection Middleware
const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET requests and API endpoints that use Bearer tokens
  if (req.method === 'GET' || req.headers.authorization) {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({
      error: 'CSRF token validation failed',
      message: 'Invalid or missing CSRF token'
    });
  }

  next();
};

// Input validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Please check your input data',
      details: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

// URL validation rules
const validateUrl = [
  body('original_url')
    .notEmpty()
    .withMessage('URL is required')
    .isURL({ protocols: ['http', 'https'] })
    .withMessage('Please provide a valid HTTP or HTTPS URL')
    .isLength({ max: 2048 })
    .withMessage('URL is too long (maximum 2048 characters)'),
  
  body('title')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Title is too long (maximum 200 characters)')
    .trim(),
    
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description is too long (maximum 500 characters)')
    .trim(),
    
  body('expires_at')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date in ISO 8601 format')
];

// User registration validation rules
const validateUserRegistration = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .trim(),
    
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email is too long'),
    
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

// User login validation rules
const validateUserLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
    
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  next();
};

// IP Address extraction middleware
const extractClientIp = (req, res, next) => {
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  
  req.clientIp = forwarded ? forwarded.split(',')[0].trim() 
    : realIp || req.connection.remoteAddress || req.socket.remoteAddress;
    
  next();
};

// URL parameter validation middleware
const validateShortCode = (req, res, next) => {
  try {
    const { shortCode } = req.params;
    
    // Check if shortCode exists
    if (!shortCode) {
      return res.status(400).json({
        error: 'Invalid URL',
        message: 'Short code is required'
      });
    }
    
    // Validate shortCode format - only allow alphanumeric and safe characters
    const validShortCodeRegex = /^[a-zA-Z0-9_-]{1,20}$/;
    
    if (!validShortCodeRegex.test(shortCode)) {
      return res.status(400).json({
        error: 'Invalid URL',
        message: 'Invalid short code format. Only alphanumeric characters, hyphens, and underscores are allowed.'
      });
    }
    
    // Check for common attack patterns
    const maliciousPatterns = [
      /\.\./,           // Path traversal
      /%[0-9a-f]{2}/i,  // URL encoding
      /[<>'"&]/,        // XSS characters
      /\x00/,           // Null bytes
      /\\/,             // Backslashes
      /\//              // Forward slashes
    ];
    
    for (const pattern of maliciousPatterns) {
      if (pattern.test(shortCode)) {
        console.warn(`Blocked malicious shortCode attempt: ${shortCode} from IP: ${req.clientIp}`);
        return res.status(400).json({
          error: 'Invalid URL',
          message: 'Short code contains invalid characters'
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('ShortCode validation error:', error);
    return res.status(400).json({
      error: 'Invalid URL',
      message: 'Failed to process URL parameter'
    });
  }
};

// Generic parameter sanitization middleware
const sanitizeParams = (req, res, next) => {
  try {
    // Sanitize all URL parameters
    for (const [key, value] of Object.entries(req.params)) {
      if (typeof value === 'string') {
        // Remove null bytes and control characters
        req.params[key] = value.replace(/[\x00-\x1f\x7f-\x9f]/g, '');
        
        // Check for suspicious patterns
        if (value.includes('..') || value.includes('%') || value.length > 100) {
          console.warn(`Blocked suspicious parameter ${key}: ${value} from IP: ${req.clientIp}`);
          return res.status(400).json({
            error: 'Invalid request',
            message: 'Request parameters contain invalid data'
          });
        }
      }
    }
    next();
  } catch (error) {
    console.error('Parameter sanitization error:', error);
    return res.status(400).json({
      error: 'Invalid request',
      message: 'Failed to process request parameters'
    });
  }
};

module.exports = {
  authRateLimit,
  urlShortenRateLimit,
  generalRateLimit,
  csrfProtection,
  handleValidationErrors,
  validateUrl,
  validateUserRegistration,
  validateUserLogin,
  securityHeaders,
  extractClientIp,
  validateShortCode,
  sanitizeParams
}; 