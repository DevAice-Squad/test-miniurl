const express = require('express');
const { Url, Click } = require('../models');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { 
  validateUrl, 
  handleValidationErrors,
  urlShortenRateLimit,
  extractClientIp,
  validateShortCode,
  sanitizeParams
} = require('../middleware/security');
const UrlService = require('../services/urlService');

const router = express.Router();

// API Version 1 routes
const v1Router = express.Router();

// ===== DEVELOPER API ENDPOINTS =====

// Custom URL shortening with algorithm selection
v1Router.post('/shorten',
  urlShortenRateLimit,
  extractClientIp,
  optionalAuth,
  validateUrl,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { 
        original_url, 
        title, 
        description, 
        expires_at, 
        algorithm = 'hash',
        custom_options = {}
      } = req.body;
      
      // Normalize URL
      const normalizedUrl = UrlService.normalizeUrl(original_url);
      
      // Validate URL
      if (!UrlService.isValidUrl(normalizedUrl)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_URL',
            message: 'Please provide a valid HTTP or HTTPS URL'
          }
        });
      }

      let shortCode;
      
      // Generate short code based on algorithm
      if (algorithm === 'custom' && Object.keys(custom_options).length > 0) {
        // Use custom algorithm with developer-specified options
        shortCode = UrlService.customAlgorithm(custom_options);
        
        // Ensure uniqueness
        let attempts = 0;
        while (attempts < 10) {
          const existingUrl = await Url.findOne({ where: { short_url: shortCode } });
          if (!existingUrl) break;
          
          shortCode = UrlService.customAlgorithm(custom_options);
          attempts++;
        }
        
        if (attempts >= 10) {
          throw new Error('Unable to generate unique short code with custom options');
        }
      } else {
        shortCode = await UrlService.generateShortCode(algorithm, normalizedUrl);
      }
      
      // Create URL record
      const urlData = {
        original_url: normalizedUrl,
        short_url: shortCode,
        title: title || null,
        description: description || null,
        expires_at: expires_at ? new Date(expires_at) : null,
        user_id: req.user ? req.user.id : null
      };

      const url = await Url.create(urlData);
      const domain = process.env.APP_DOMAIN || 'mini.cloudrakshak.com';

      res.status(201).json({
        success: true,
        data: {
          id: url.id,
          original_url: url.original_url,
          short_url: url.short_url,
          full_short_url: `https://${domain}/${url.short_url}`,
          title: url.title,
          description: url.description,
          expires_at: url.expires_at,
          created_at: url.created_at,
          is_active: url.is_active,
          algorithm_used: algorithm
        },
        metadata: {
          request_id: req.headers['x-request-id'] || null,
          timestamp: new Date().toISOString(),
          rate_limit_remaining: res.getHeader('X-RateLimit-Remaining')
        }
      });

    } catch (error) {
      console.error('API URL shortening error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while shortening the URL',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      });
    }
  }
);

// Bulk URL shortening
v1Router.post('/shorten/bulk',
  urlShortenRateLimit,
  extractClientIp,
  optionalAuth,
  async (req, res) => {
    try {
      const { urls, algorithm = 'hash', custom_options = {} } = req.body;
      
      if (!Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Please provide an array of URLs to shorten'
          }
        });
      }

      if (urls.length > 50) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'BATCH_SIZE_EXCEEDED',
            message: 'Maximum 50 URLs allowed per batch request'
          }
        });
      }

      const results = [];
      const domain = process.env.APP_DOMAIN || 'mini.cloudrakshak.com';

      for (const urlData of urls) {
        try {
          const { original_url, title, description, expires_at } = urlData;
          
          // Validate required field
          if (!original_url) {
            results.push({
              original_url: original_url,
              success: false,
              error: {
                code: 'MISSING_URL',
                message: 'original_url is required'
              }
            });
            continue;
          }

          // Normalize and validate URL
          const normalizedUrl = UrlService.normalizeUrl(original_url);
          if (!UrlService.isValidUrl(normalizedUrl)) {
            results.push({
              original_url: original_url,
              success: false,
              error: {
                code: 'INVALID_URL',
                message: 'Invalid URL format'
              }
            });
            continue;
          }

          // Generate short code
          let shortCode;
          if (algorithm === 'custom' && Object.keys(custom_options).length > 0) {
            shortCode = UrlService.customAlgorithm(custom_options);
            
            // Ensure uniqueness
            let attempts = 0;
            while (attempts < 5) {
              const existingUrl = await Url.findOne({ where: { short_url: shortCode } });
              if (!existingUrl) break;
              
              shortCode = UrlService.customAlgorithm(custom_options);
              attempts++;
            }
            
            if (attempts >= 5) {
              results.push({
                original_url: original_url,
                success: false,
                error: {
                  code: 'GENERATION_FAILED',
                  message: 'Unable to generate unique short code'
                }
              });
              continue;
            }
          } else {
            shortCode = await UrlService.generateShortCode(algorithm, normalizedUrl);
          }

          // Create URL record
          const url = await Url.create({
            original_url: normalizedUrl,
            short_url: shortCode,
            title: title || null,
            description: description || null,
            expires_at: expires_at ? new Date(expires_at) : null,
            user_id: req.user ? req.user.id : null
          });

          results.push({
            original_url: original_url,
            success: true,
            data: {
              id: url.id,
              original_url: url.original_url,
              short_url: url.short_url,
              full_short_url: `https://${domain}/${url.short_url}`,
              title: url.title,
              created_at: url.created_at
            }
          });

        } catch (error) {
          results.push({
            original_url: urlData.original_url || 'unknown',
            success: false,
            error: {
              code: 'PROCESSING_ERROR',
              message: 'Error processing this URL'
            }
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      res.json({
        success: true,
        data: {
          results: results,
          summary: {
            total: results.length,
            successful: successCount,
            failed: failureCount
          }
        },
        metadata: {
          timestamp: new Date().toISOString(),
          algorithm_used: algorithm
        }
      });

    } catch (error) {
      console.error('Bulk shortening error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during bulk processing'
        }
      });
    }
  }
);

// Get URL information
v1Router.get('/url/:shortCode',
  extractClientIp,
  validateShortCode,
  async (req, res) => {
    try {
      const { shortCode } = req.params;
      const { include_analytics = false } = req.query;
      
      const url = await Url.findOne({ 
        where: { short_url: shortCode },
        include: include_analytics === 'true' ? [
          {
            model: Click,
            as: 'clicks',
            attributes: []
          }
        ] : []
      });
      
      if (!url) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'URL_NOT_FOUND',
            message: 'The requested shortened URL does not exist'
          }
        });
      }

      let analytics = null;
      if (include_analytics === 'true') {
        const totalClicks = await Click.count({ where: { url_id: url.id } });
        const clicksToday = await Click.getClicksByPeriod(url.id, 'day');
        const clicksThisWeek = await Click.getClicksByPeriod(url.id, 'week');
        const clicksThisMonth = await Click.getClicksByPeriod(url.id, 'month');

        analytics = {
          total_clicks: totalClicks,
          clicks_today: clicksToday,
          clicks_this_week: clicksThisWeek,
          clicks_this_month: clicksThisMonth
        };
      }

      const domain = process.env.APP_DOMAIN || 'mini.cloudrakshak.com';

      res.json({
        success: true,
        data: {
          id: url.id,
          original_url: url.original_url,
          short_url: url.short_url,
          full_short_url: `https://${domain}/${url.short_url}`,
          title: url.title,
          description: url.description,
          is_active: url.is_active,
          expires_at: url.expires_at,
          created_at: url.created_at,
          updated_at: url.updated_at,
          analytics: analytics
        }
      });

    } catch (error) {
      console.error('Get URL info error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching URL information'
        }
      });
    }
  }
);

// URL validation endpoint
v1Router.post('/validate',
  async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_URL',
            message: 'URL parameter is required'
          }
        });
      }

      const normalizedUrl = UrlService.normalizeUrl(url);
      const isValid = UrlService.isValidUrl(normalizedUrl);
      const domain = isValid ? UrlService.extractDomain(normalizedUrl) : null;

      res.json({
        success: true,
        data: {
          original_url: url,
          normalized_url: normalizedUrl,
          is_valid: isValid,
          domain: domain,
          validation_details: {
            has_protocol: url.startsWith('http://') || url.startsWith('https://'),
            is_reachable: null // Could be enhanced with actual reachability check
          }
        }
      });

    } catch (error) {
      console.error('URL validation error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'An error occurred during URL validation'
        }
      });
    }
  }
);

// Get available algorithms
v1Router.get('/algorithms',
  (req, res) => {
    res.json({
      success: true,
      data: {
        algorithms: [
          {
            name: 'hash',
            description: 'MD5 hash-based algorithm with timestamp',
            default_length: 6,
            supports_custom_options: false
          },
          {
            name: 'uuid',
            description: 'UUID-based algorithm',
            default_length: 8,
            supports_custom_options: false
          },
          {
            name: 'custom',
            description: 'Customizable algorithm with developer options',
            default_length: 7,
            supports_custom_options: true,
            options: {
              length: 'Code length (4-12 characters)',
              includeNumbers: 'Include numbers (true/false)',
              includeUppercase: 'Include uppercase letters (true/false)',
              includeLowercase: 'Include lowercase letters (true/false)',
              excludeSimilar: 'Exclude similar looking characters (true/false)'
            }
          }
        ]
      }
    });
  }
);

// Health check endpoint
v1Router.get('/health',
  (req, res) => {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
      }
    });
  }
);

// API usage statistics (for authenticated users)
v1Router.get('/stats',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { period = 'month' } = req.query;

      // Calculate date range
      const now = new Date();
      let startDate;
      
      switch (period) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const totalUrls = await Url.count({ where: { user_id: userId } });
      const urlsInPeriod = await Url.count({
        where: {
          user_id: userId,
          created_at: {
            [Url.sequelize.Sequelize.Op.gte]: startDate
          }
        }
      });

      const totalClicks = await Click.count({
        include: [{
          model: Url,
          as: 'url',
          where: { user_id: userId },
          attributes: []
        }]
      });

      res.json({
        success: true,
        data: {
          user_id: userId,
          period: period,
          statistics: {
            total_urls_created: totalUrls,
            urls_created_in_period: urlsInPeriod,
            total_clicks_received: totalClicks
          },
          limits: {
            urls_per_minute: 20,
            urls_per_day: 1000,
            bulk_size_limit: 50
          }
        }
      });

    } catch (error) {
      console.error('API stats error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching API statistics'
        }
      });
    }
  }
);

// Mount v1 router
router.use('/v1', v1Router);

// Default API info
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'MinURL API',
      description: 'URL Shortener API with custom algorithms and developer features',
      version: '1.0.0',
      available_versions: ['v1'],
      documentation_url: '/api/docs',
      base_domain: process.env.APP_DOMAIN || 'mini.cloudrakshak.com',
      authentication: {
        type: 'Bearer Token (JWT)',
        required: false,
        description: 'Authentication is optional for basic shortening, required for advanced features'
      }
    }
  });
});

module.exports = router; 