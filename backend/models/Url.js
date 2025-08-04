const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Url = sequelize.define('Url', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  original_url: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      isUrl: true,
      notEmpty: true
    }
  },
  short_url: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [6, 8],
      notEmpty: true
    }
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // Allow anonymous URL creation
    references: {
      model: 'users',
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'urls',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['short_url']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['created_at']
    }
  ]
});

// Instance methods
Url.prototype.isExpired = function() {
  if (!this.expires_at) return false;
  return new Date() > this.expires_at;
};

Url.prototype.getFullShortUrl = function() {
  const domain = process.env.APP_DOMAIN || 'mini.cloudrakshak.com';
  return `https://${domain}/${this.short_url}`;
};

module.exports = Url; 