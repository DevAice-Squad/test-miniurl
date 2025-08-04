const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Click = sequelize.define('Click', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  url_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'urls',
      key: 'id'
    }
  },
  ip_address: {
    type: DataTypes.INET,
    allowNull: false
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  referer: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  country: {
    type: DataTypes.STRING,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  browser: {
    type: DataTypes.STRING,
    allowNull: true
  },
  os: {
    type: DataTypes.STRING,
    allowNull: true
  },
  device_type: {
    type: DataTypes.ENUM('desktop', 'mobile', 'tablet', 'other'),
    defaultValue: 'other'
  },
  date_time: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  }
}, {
  tableName: 'clicks',
  timestamps: false,
  indexes: [
    {
      fields: ['url_id']
    },
    {
      fields: ['date_time']
    },
    {
      fields: ['ip_address']
    },
    {
      fields: ['url_id', 'date_time']
    }
  ]
});

// Static methods for analytics
Click.getClicksByPeriod = async function(urlId, period = 'day') {
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
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  return await this.count({
    where: {
      url_id: urlId,
      date_time: {
        [sequelize.Sequelize.Op.gte]: startDate
      }
    }
  });
};

Click.getTopReferrers = async function(urlId, limit = 10) {
  return await this.findAll({
    attributes: [
      'referer',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    where: {
      url_id: urlId,
      referer: {
        [sequelize.Sequelize.Op.ne]: null
      }
    },
    group: ['referer'],
    order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
    limit: limit,
    raw: true
  });
};

module.exports = Click; 