const express = require('express');
const { User, Url, Click } = require('../models');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { 
  validateUserRegistration, 
  handleValidationErrors 
} = require('../middleware/security');

const router = express.Router();

// Apply admin authentication to all routes
router.use(authenticateToken, requireAdmin);

// ===== USER MANAGEMENT =====

// Get all users
router.get('/users',
  async (req, res) => {
    try {
      const { page = 1, limit = 20, search, role, isActive } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let whereClause = {};
      
      if (search) {
        whereClause = {
          ...whereClause,
          [User.sequelize.Sequelize.Op.or]: [
            { username: { [User.sequelize.Sequelize.Op.iLike]: `%${search}%` } },
            { email: { [User.sequelize.Sequelize.Op.iLike]: `%${search}%` } }
          ]
        };
      }
      
      if (role) {
        whereClause.role = role;
      }
      
      if (isActive !== undefined) {
        whereClause.isActive = isActive === 'true';
      }

      const { count, rows: users } = await User.findAndCountAll({
        where: whereClause,
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: offset,
        include: [
          {
            model: Url,
            as: 'urls',
            attributes: []
          }
        ],
        attributes: {
          include: [
            [User.sequelize.Sequelize.fn('COUNT', User.sequelize.Sequelize.col('urls.id')), 'url_count']
          ]
        },
        group: ['User.id'],
        subQuery: false
      });

      res.json({
        data: users.map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          url_count: parseInt(user.dataValues.url_count) || 0,
          created_at: user.created_at,
          updated_at: user.updated_at
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count.length / parseInt(limit)),
          totalCount: count.length,
          limit: parseInt(limit)
        }
      });

    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        error: 'Failed to fetch users',
        message: 'An error occurred while fetching users'
      });
    }
  }
);

// Get single user
router.get('/users/:id',
  async (req, res) => {
    try {
      const { id } = req.params;

      const user = await User.findByPk(id, {
        include: [
          {
            model: Url,
            as: 'urls',
            include: [
              {
                model: Click,
                as: 'clicks',
                attributes: []
              }
            ],
            attributes: {
              include: [
                [Url.sequelize.Sequelize.fn('COUNT', Url.sequelize.Sequelize.col('urls.clicks.id')), 'click_count']
              ]
            },
            group: ['urls.id'],
            subQuery: false
          }
        ]
      });

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'The requested user does not exist'
        });
      }

      res.json({
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          created_at: user.created_at,
          updated_at: user.updated_at,
          urls: user.urls.map(url => ({
            id: url.id,
            original_url: url.original_url,
            short_url: url.short_url,
            title: url.title,
            click_count: parseInt(url.dataValues.click_count) || 0,
            is_active: url.is_active,
            created_at: url.created_at
          }))
        }
      });

    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        error: 'Failed to fetch user',
        message: 'An error occurred while fetching the user'
      });
    }
  }
);

// Create user
router.post('/users',
  validateUserRegistration,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { username, email, password, role = 'user' } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        where: {
          [User.sequelize.Sequelize.Op.or]: [
            { email: email },
            { username: username }
          ]
        }
      });

      if (existingUser) {
        return res.status(409).json({
          error: 'User already exists',
          message: existingUser.email === email 
            ? 'An account with this email already exists'
            : 'This username is already taken'
        });
      }

      // Create new user
      const user = await User.create({
        username,
        email,
        password_hash: password,
        role: ['user', 'admin'].includes(role) ? role : 'user'
      });

      res.status(201).json({
        message: 'User created successfully',
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          created_at: user.created_at
        }
      });

    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({
        error: 'User creation failed',
        message: 'An error occurred while creating the user'
      });
    }
  }
);

// Update user
router.put('/users/:id',
  async (req, res) => {
    try {
      const { id } = req.params;
      const { username, email, role, isActive } = req.body;

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'The requested user does not exist'
        });
      }

      // Check if new username/email is already taken by another user
      if (username || email) {
        const existingUser = await User.findOne({
          where: {
            [User.sequelize.Sequelize.Op.and]: [
              {
                [User.sequelize.Sequelize.Op.or]: [
                  ...(email ? [{ email: email }] : []),
                  ...(username ? [{ username: username }] : [])
                ]
              },
              {
                id: {
                  [User.sequelize.Sequelize.Op.ne]: id
                }
              }
            ]
          }
        });

        if (existingUser) {
          return res.status(409).json({
            error: 'Data conflict',
            message: existingUser.email === email 
              ? 'This email is already in use by another account'
              : 'This username is already taken'
          });
        }
      }

      // Update user
      await user.update({
        username: username || user.username,
        email: email || user.email,
        role: role || user.role,
        isActive: isActive !== undefined ? isActive : user.isActive
      });

      res.json({
        message: 'User updated successfully',
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          updated_at: user.updated_at
        }
      });

    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        error: 'User update failed',
        message: 'An error occurred while updating the user'
      });
    }
  }
);

// Delete user
router.delete('/users/:id',
  async (req, res) => {
    try {
      const { id } = req.params;

      // Prevent admin from deleting themselves
      if (parseInt(id) === req.user.id) {
        return res.status(400).json({
          error: 'Cannot delete yourself',
          message: 'You cannot delete your own account'
        });
      }

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'The requested user does not exist'
        });
      }

      // Delete user's URLs and associated clicks
      const userUrls = await Url.findAll({ where: { user_id: id } });
      for (const url of userUrls) {
        await Click.destroy({ where: { url_id: url.id } });
      }
      await Url.destroy({ where: { user_id: id } });

      // Delete user
      await user.destroy();

      res.json({
        message: 'User deleted successfully'
      });

    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        error: 'User deletion failed',
        message: 'An error occurred while deleting the user'
      });
    }
  }
);

// ===== URL MANAGEMENT =====

// Get all URLs
router.get('/urls',
  async (req, res) => {
    try {
      const { page = 1, limit = 20, search, userId, isActive } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let whereClause = {};
      
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
      
      if (userId) {
        whereClause.user_id = userId;
      }
      
      if (isActive !== undefined) {
        whereClause.is_active = isActive === 'true';
      }

      const { count, rows: urls } = await Url.findAndCountAll({
        where: whereClause,
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: offset,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email']
          },
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
        group: ['Url.id', 'user.id'],
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
          updated_at: url.updated_at,
          user: url.user
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count.length / parseInt(limit)),
          totalCount: count.length,
          limit: parseInt(limit)
        }
      });

    } catch (error) {
      console.error('Get URLs error:', error);
      res.status(500).json({
        error: 'Failed to fetch URLs',
        message: 'An error occurred while fetching URLs'
      });
    }
  }
);

// ===== ANALYTICS & REPORTING =====

// Get dashboard analytics
router.get('/analytics/dashboard',
  async (req, res) => {
    try {
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

      // Get overall statistics
      const totalUsers = await User.count();
      const totalUrls = await Url.count();
      const totalClicks = await Click.count();
      const activeUrls = await Url.count({ where: { is_active: true } });

      // Get new registrations in period
      const newUsers = await User.count({
        where: {
          created_at: {
            [User.sequelize.Sequelize.Op.gte]: startDate
          }
        }
      });

      // Get new URLs in period
      const newUrls = await Url.count({
        where: {
          created_at: {
            [User.sequelize.Sequelize.Op.gte]: startDate
          }
        }
      });

      // Get clicks in period
      const clicksInPeriod = await Click.count({
        where: {
          date_time: {
            [Click.sequelize.Sequelize.Op.gte]: startDate
          }
        }
      });

      // Get top URLs by clicks
      const topUrls = await Url.findAll({
        include: [
          {
            model: Click,
            as: 'clicks',
            attributes: []
          },
          {
            model: User,
            as: 'user',
            attributes: ['username']
          }
        ],
        attributes: {
          include: [
            [Url.sequelize.Sequelize.fn('COUNT', Url.sequelize.Sequelize.col('clicks.id')), 'click_count']
          ]
        },
        group: ['Url.id', 'user.id'],
        order: [[Url.sequelize.Sequelize.fn('COUNT', Url.sequelize.Sequelize.col('clicks.id')), 'DESC']],
        limit: 10,
        subQuery: false
      });

      // Get clicks by date for chart
      const clicksByDate = await Click.findAll({
        attributes: [
          [Click.sequelize.Sequelize.fn('DATE_TRUNC', 'day', Click.sequelize.Sequelize.col('date_time')), 'date'],
          [Click.sequelize.Sequelize.fn('COUNT', Click.sequelize.Sequelize.col('id')), 'count']
        ],
        where: {
          date_time: {
            [Click.sequelize.Sequelize.Op.gte]: startDate
          }
        },
        group: [Click.sequelize.Sequelize.fn('DATE_TRUNC', 'day', Click.sequelize.Sequelize.col('date_time'))],
        order: [[Click.sequelize.Sequelize.fn('DATE_TRUNC', 'day', Click.sequelize.Sequelize.col('date_time')), 'ASC']],
        raw: true
      });

      // Get top referrers
      const topReferrers = await Click.findAll({
        attributes: [
          'referer',
          [Click.sequelize.Sequelize.fn('COUNT', Click.sequelize.Sequelize.col('id')), 'count']
        ],
        where: {
          referer: {
            [Click.sequelize.Sequelize.Op.ne]: null
          },
          date_time: {
            [Click.sequelize.Sequelize.Op.gte]: startDate
          }
        },
        group: ['referer'],
        order: [[Click.sequelize.Sequelize.fn('COUNT', Click.sequelize.Sequelize.col('id')), 'DESC']],
        limit: 10,
        raw: true
      });

      res.json({
        summary: {
          total_users: totalUsers,
          total_urls: totalUrls,
          total_clicks: totalClicks,
          active_urls: activeUrls,
          new_users: newUsers,
          new_urls: newUrls,
          clicks_in_period: clicksInPeriod,
          period: period
        },
        top_urls: topUrls.map(url => ({
          id: url.id,
          original_url: url.original_url,
          short_url: url.short_url,
          title: url.title,
          click_count: parseInt(url.dataValues.click_count) || 0,
          user: url.user
        })),
        clicks_by_date: clicksByDate,
        top_referrers: topReferrers
      });

    } catch (error) {
      console.error('Dashboard analytics error:', error);
      res.status(500).json({
        error: 'Failed to fetch analytics',
        message: 'An error occurred while fetching dashboard analytics'
      });
    }
  }
);

// Get user activity logs
router.get('/analytics/user-activity',
  async (req, res) => {
    try {
      const { page = 1, limit = 50, userId, startDate, endDate } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let whereClause = {};
      
      if (userId) {
        whereClause.user_id = userId;
      }
      
      if (startDate || endDate) {
        whereClause.created_at = {};
        if (startDate) {
          whereClause.created_at[Url.sequelize.Sequelize.Op.gte] = new Date(startDate);
        }
        if (endDate) {
          whereClause.created_at[Url.sequelize.Sequelize.Op.lte] = new Date(endDate);
        }
      }

      const { count, rows: activities } = await Url.findAndCountAll({
        where: whereClause,
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: offset,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email']
          }
        ]
      });

      res.json({
        data: activities.map(url => ({
          id: url.id,
          action: 'URL_CREATED',
          original_url: url.original_url,
          short_url: url.short_url,
          title: url.title,
          created_at: url.created_at,
          user: url.user
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
          totalCount: count,
          limit: parseInt(limit)
        }
      });

    } catch (error) {
      console.error('User activity logs error:', error);
      res.status(500).json({
        error: 'Failed to fetch user activity',
        message: 'An error occurred while fetching user activity logs'
      });
    }
  }
);

module.exports = router; 