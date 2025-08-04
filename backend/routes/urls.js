const express = require('express');
const { Url, Click, User } = require('../models');
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

// Shorten URL
router.post('/shorten',
  urlShortenRateLimit,
  extractClientIp,
  optionalAuth,
  validateUrl,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { original_url, title, description, expires_at, algorithm = 'hash' } = req.body;
      
      // Normalize URL
      const normalizedUrl = UrlService.normalizeUrl(original_url);
      
      // Validate URL
      if (!UrlService.isValidUrl(normalizedUrl)) {
        return res.status(400).json({
          error: 'Invalid URL',
          message: 'Please provide a valid HTTP or HTTPS URL'
        });
      }

      // Generate short code
      const shortCode = await UrlService.generateShortCode(algorithm, normalizedUrl);
      
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
        message: 'URL shortened successfully',
        data: {
          id: url.id,
          original_url: url.original_url,
          short_url: url.short_url,
          full_short_url: `https://${domain}/${url.short_url}`,
          title: url.title,
          description: url.description,
          expires_at: url.expires_at,
          created_at: url.created_at,
          is_active: url.is_active
        }
      });

    } catch (error) {
      console.error('URL shortening error:', error);
      res.status(500).json({
        error: 'URL shortening failed',
        message: 'An error occurred while shortening the URL'
      });
    }
  }
);

// Redirect shortened URL and track analytics
router.get('/:shortCode',
  extractClientIp,
  validateShortCode,
  async (req, res) => {
    try {
      const { shortCode } = req.params;
      
      // Find URL by short code
      const url = await Url.findOne({ where: { short_url: shortCode } });
      
      if (!url) {
        return res.status(404).json({
          error: 'URL not found',
          message: 'The shortened URL you requested does not exist'
        });
      }

      // Check if URL is active
      if (!url.is_active) {
        return res.status(410).json({
          error: 'URL disabled',
          message: 'This shortened URL has been disabled'
        });
      }

      // Check if URL is expired
      if (UrlService.isExpired(url)) {
        return res.status(410).json({
          error: 'URL expired',
          message: 'This shortened URL has expired'
        });
      }

      // Track click analytics
      try {
        const userAgent = req.headers['user-agent'] || '';
        const referer = req.headers.referer || req.headers.referrer || null;
        
        // Basic device detection
        let deviceType = 'other';
        if (userAgent.includes('Mobile')) deviceType = 'mobile';
        else if (userAgent.includes('Tablet')) deviceType = 'tablet';
        else if (userAgent.includes('Desktop') || userAgent.includes('Windows') || userAgent.includes('Mac')) deviceType = 'desktop';

        await Click.create({
          url_id: url.id,
          ip_address: req.clientIp,
          user_agent: userAgent,
          referer: referer,
          device_type: deviceType,
          date_time: new Date()
        });
      } catch (analyticsError) {
        console.error('Analytics tracking error:', analyticsError);
        // Don't fail the redirect if analytics fails
      }

      // Redirect to original URL
      res.redirect(301, url.original_url);

    } catch (error) {
      console.error('URL redirect error:', error);
      res.status(500).json({
        error: 'Redirect failed',
        message: 'An error occurred while processing the redirect'
      });
    }
  }
);

// Get user's URLs
router.get('/user/urls',
  authenticateToken,
  async (req, res) => {
    try {
      const { page = 1, limit = 20, search, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let whereClause = { user_id: req.user.id };
      
      if (search) {
        whereClause = {
          ...whereClause,
          [Url.sequelize.Sequelize.Op.or]: [
            { original_url: { [Url.sequelize.Sequelize.Op.iLike]: `%${search}%` } },
            { title: { [Url.sequelize.Sequelize.Op.iLike]: `%${search}%` } },
            { short_url: { [Url.sequelize.Sequelize.Op.iLike]: `%${search}%` } }
          ]
        };
      }

      const { count, rows: urls } = await Url.findAndCountAll({
        where: whereClause,
        order: [[sortBy, sortOrder.toUpperCase()]],
        limit: parseInt(limit),
        offset: offset,
        include: [
          {
            model: Click,
            as: 'clicks',
            attributes: []
          }
        ],
        attributes: {
          include: [
            [Url.sequelize.Sequelize.fn('COUNT', Url.sequelize.Sequelize.col('clicks.id')), 'click_count']
          ]
        },
        group: ['Url.id'],
        subQuery: false
      });

      const domain = process.env.APP_DOMAIN || 'mini.cloudrakshak.com';

      res.json({
        data: urls.map(url => ({
          id: url.id,
          original_url: url.original_url,
          short_url: url.short_url,
          full_short_url: `https://${domain}/${url.short_url}`,
          title: url.title,
          description: url.description,
          click_count: parseInt(url.dataValues.click_count) || 0,
          is_active: url.is_active,
          expires_at: url.expires_at,
          created_at: url.created_at,
          updated_at: url.updated_at
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count.length / parseInt(limit)),
          totalCount: count.length,
          limit: parseInt(limit)
        }
      });

    } catch (error) {
      console.error('Get user URLs error:', error);
      res.status(500).json({
        error: 'Failed to fetch URLs',
        message: 'An error occurred while fetching your URLs'
      });
    }
  }
);

// Get URL analytics
router.get('/analytics/:id',
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { period = 'month' } = req.query;

      // Find URL and verify ownership
      const url = await Url.findOne({
        where: { 
          id: id,
          [Url.sequelize.Sequelize.Op.or]: [
            { user_id: req.user.id },
            ...(req.user.role === 'admin' ? [{}] : [])
          ]
        }
      });

      if (!url) {
        return res.status(404).json({
          error: 'URL not found',
          message: 'URL not found or you do not have access to it'
        });
      }

      // Get analytics data
      const totalClicks = await Click.count({ where: { url_id: id } });
      const clicksInPeriod = await Click.getClicksByPeriod(id, period);
      const topReferrers = await Click.getTopReferrers(id, 10);

      // Get clicks by date for chart
      const dateFormat = period === 'day' ? '%Y-%m-%d %H:00:00' : '%Y-%m-%d';
      const clicksByDate = await Click.findAll({
        attributes: [
          [Click.sequelize.Sequelize.fn('DATE_TRUNC', period === 'day' ? 'hour' : 'day', Click.sequelize.Sequelize.col('date_time')), 'date'],
          [Click.sequelize.Sequelize.fn('COUNT', Click.sequelize.Sequelize.col('id')), 'count']
        ],
        where: { url_id: id },
        group: [Click.sequelize.Sequelize.fn('DATE_TRUNC', period === 'day' ? 'hour' : 'day', Click.sequelize.Sequelize.col('date_time'))],
        order: [[Click.sequelize.Sequelize.fn('DATE_TRUNC', period === 'day' ? 'hour' : 'day', Click.sequelize.Sequelize.col('date_time')), 'ASC']],
        raw: true
      });

      // Get device type breakdown
      const deviceStats = await Click.findAll({
        attributes: [
          'device_type',
          [Click.sequelize.Sequelize.fn('COUNT', Click.sequelize.Sequelize.col('id')), 'count']
        ],
        where: { url_id: id },
        group: ['device_type'],
        raw: true
      });

      res.json({
        url: {
          id: url.id,
          original_url: url.original_url,
          short_url: url.short_url,
          title: url.title,
          created_at: url.created_at
        },
        analytics: {
          total_clicks: totalClicks,
          clicks_in_period: clicksInPeriod,
          period: period,
          top_referrers: topReferrers,
          clicks_by_date: clicksByDate,
          device_stats: deviceStats
        }
      });

    } catch (error) {
      console.error('Analytics fetch error:', error);
      res.status(500).json({
        error: 'Failed to fetch analytics',
        message: 'An error occurred while fetching analytics data'
      });
    }
  }
);

// Update URL
router.put('/:id',
  authenticateToken,
  validateUrl,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { original_url, title, description, expires_at, is_active } = req.body;

      // Find URL and verify ownership
      const url = await Url.findOne({
        where: { 
          id: id,
          [Url.sequelize.Sequelize.Op.or]: [
            { user_id: req.user.id },
            ...(req.user.role === 'admin' ? [{}] : [])
          ]
        }
      });

      if (!url) {
        return res.status(404).json({
          error: 'URL not found',
          message: 'URL not found or you do not have permission to edit it'
        });
      }

      // Update URL
      const normalizedUrl = original_url ? UrlService.normalizeUrl(original_url) : url.original_url;
      
      await url.update({
        original_url: normalizedUrl,
        title: title !== undefined ? title : url.title,
        description: description !== undefined ? description : url.description,
        expires_at: expires_at !== undefined ? (expires_at ? new Date(expires_at) : null) : url.expires_at,
        is_active: is_active !== undefined ? is_active : url.is_active
      });

      res.json({
        message: 'URL updated successfully',
        data: {
          id: url.id,
          original_url: url.original_url,
          short_url: url.short_url,
          title: url.title,
          description: url.description,
          is_active: url.is_active,
          expires_at: url.expires_at,
          updated_at: url.updated_at
        }
      });

    } catch (error) {
      console.error('URL update error:', error);
      res.status(500).json({
        error: 'URL update failed',
        message: 'An error occurred while updating the URL'
      });
    }
  }
);

// Delete URL
router.delete('/:id',
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Find URL and verify ownership
      const url = await Url.findOne({
        where: { 
          id: id,
          [Url.sequelize.Sequelize.Op.or]: [
            { user_id: req.user.id },
            ...(req.user.role === 'admin' ? [{}] : [])
          ]
        }
      });

      if (!url) {
        return res.status(404).json({
          error: 'URL not found',
          message: 'URL not found or you do not have permission to delete it'
        });
      }

      // Delete associated clicks first
      await Click.destroy({ where: { url_id: id } });
      
      // Delete URL
      await url.destroy();

      res.json({
        message: 'URL deleted successfully'
      });

    } catch (error) {
      console.error('URL deletion error:', error);
      res.status(500).json({
        error: 'URL deletion failed',
        message: 'An error occurred while deleting the URL'
      });
    }
  }
);

module.exports = router; 