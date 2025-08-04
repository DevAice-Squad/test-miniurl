const express = require('express');
const { User } = require('../models');
const UserMethods = require('../models/User');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { 
  validateUserRegistration, 
  validateUserLogin, 
  handleValidationErrors,
  authRateLimit
} = require('../middleware/security');

const router = express.Router();

// User Registration
router.post('/register', 
  authRateLimit,
  validateUserRegistration,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { username, email, password } = req.body;

      // Check if user already exists
      const existingUserByEmail = await User.findOne({ where: { email } });
      const existingUserByUsername = await User.findOne({ where: { username } });

      if (existingUserByEmail) {
        return res.status(409).json({
          error: 'User already exists',
          message: 'An account with this email already exists'
        });
      }

      if (existingUserByUsername) {
        return res.status(409).json({
          error: 'User already exists',
          message: 'This username is already taken'
        });
      }

      // Create new user
      const user = await UserMethods.createUser({
        username,
        email,
        password // Will be hashed by UserMethods
      });

      // Generate JWT token
      const token = generateToken(user);

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          created_at: user.created_at
        },
        token
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        error: 'Registration failed',
        message: 'An error occurred during registration'
      });
    }
  }
);

// User Login
router.post('/login',
  authRateLimit,
  validateUserLogin,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user by email
      const foundUser = await User.findOne({ where: { email } });
      if (!foundUser) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Invalid email or password'
        });
      }

      // Add user methods
      const user = UserMethods.addUserMethods(foundUser);

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          error: 'Account disabled',
          message: 'Your account has been disabled. Please contact support.'
        });
      }

      // Validate password
      const isValidPassword = await user.validatePassword(password);
      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Invalid email or password'
        });
      }

      // Generate JWT token
      const token = generateToken(user);

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          created_at: user.created_at
        },
        token
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Login failed',
        message: 'An error occurred during login'
      });
    }
  }
);

// Get Current User Profile
router.get('/profile',
  authenticateToken,
  async (req, res) => {
    try {
      res.json({
        user: {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          role: req.user.role,
          created_at: req.user.created_at,
          updated_at: req.user.updated_at
        }
      });
    } catch (error) {
      console.error('Profile fetch error:', error);
      res.status(500).json({
        error: 'Failed to fetch profile',
        message: 'An error occurred while fetching your profile'
      });
    }
  }
);

// Update User Profile
router.put('/profile',
  authenticateToken,
  [
    validateUserRegistration[0], // username validation
    validateUserRegistration[1]  // email validation
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { username, email } = req.body;
      const userId = req.user.id;

      // Check if new username/email is already taken by another user
      const existingUser = await User.findOne({
        where: {
          [User.sequelize.Sequelize.Op.and]: [
            {
              [User.sequelize.Sequelize.Op.or]: [
                { email: email },
                { username: username }
              ]
            },
            {
              id: {
                [User.sequelize.Sequelize.Op.ne]: userId
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

      // Update user
      await req.user.update({ username, email });

      res.json({
        message: 'Profile updated successfully',
        user: {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          role: req.user.role,
          updated_at: req.user.updated_at
        }
      });

    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({
        error: 'Profile update failed',
        message: 'An error occurred while updating your profile'
      });
    }
  }
);

// Change Password
router.put('/change-password',
  authenticateToken,
  [
    validateUserRegistration[2] // password validation
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      // Validate current password
      const isValidPassword = await req.user.validatePassword(currentPassword);
      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Invalid password',
          message: 'Current password is incorrect'
        });
      }

      // Update password
      await req.user.update({ password_hash: newPassword });

      res.json({
        message: 'Password changed successfully'
      });

    } catch (error) {
      console.error('Password change error:', error);
      res.status(500).json({
        error: 'Password change failed',
        message: 'An error occurred while changing your password'
      });
    }
  }
);

module.exports = router; 