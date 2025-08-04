const database = require('../config/database');

// Export the database instance and model adapters
module.exports = {
  sequelize: database, // For compatibility with existing code
  database,
  
  // Model adapters
  User: {
    create: (userData) => database.createUser(userData),
    findOne: async (options) => {
      if (options.where) {
        if (options.where.email) {
          return database.findUserByEmail(options.where.email);
        }
        if (options.where.username) {
          return database.findUserByUsername(options.where.username);
        }
        if (options.where.id) {
          return database.findUserById(options.where.id);
        }
      }
      return null;
    },
    findByPk: (id) => database.findUserById(id),
    update: (updates, options) => {
      if (options.where && options.where.id) {
        return database.updateUser(options.where.id, updates);
      }
      return null;
    },
    destroy: (options) => {
      if (options.where && options.where.id) {
        return database.deleteUser(options.where.id);
      }
      return false;
    },
    findAll: () => database.getAllUsers()
  },
  
  Url: {
    create: (urlData) => database.createUrl(urlData),
    findOne: async (options) => {
      if (options.where) {
        if (options.where.short_url) {
          return database.findUrlByShortCode(options.where.short_url);
        }
        if (options.where.id) {
          return database.findUrlById(options.where.id);
        }
      }
      return null;
    },
    findByPk: (id) => database.findUrlById(id),
    findAll: (options) => {
      if (options && options.where && options.where.user_id) {
        return database.findUrlsByUserId(options.where.user_id);
      }
      return database.getAllUrls();
    },
    update: (updates, options) => {
      if (options.where && options.where.id) {
        return database.updateUrl(options.where.id, updates);
      }
      return null;
    },
    destroy: (options) => {
      if (options.where && options.where.id) {
        return database.deleteUrl(options.where.id);
      }
      return false;
    }
  },
  
  Click: {
    create: (clickData) => database.createClick(clickData),
    findAll: (options) => {
      if (options && options.where && options.where.url_id) {
        return database.findClicksByUrlId(options.where.url_id);
      }
      return Array.from(database.clicks.values());
    },
    getClicksByPeriod: (urlId, period) => database.getClicksByPeriod(urlId, period),
    getTopReferrers: (urlId, limit) => database.getTopReferrers(urlId, limit)
  }
}; 