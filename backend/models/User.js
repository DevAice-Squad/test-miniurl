const bcrypt = require('bcryptjs');
const { database } = require('./index');

// User utility methods
const UserMethods = {
  // Hash password before saving
  async hashPassword(password) {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  },

  // Validate password
  async validatePassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  },

  // Create user with hashed password
  async createUser(userData) {
    if (userData.password) {
      userData.password_hash = await this.hashPassword(userData.password);
      delete userData.password;
    }
    return database.createUser(userData);
  },

  // Update user with password hashing if needed
  async updateUser(id, updates) {
    if (updates.password) {
      updates.password_hash = await this.hashPassword(updates.password);
      delete updates.password;
    }
    return database.updateUser(id, updates);
  },

  // Add validatePassword method to user objects
  addUserMethods(user) {
    if (!user) return user;
    
    user.validatePassword = async function(password) {
      return UserMethods.validatePassword(password, this.password_hash);
    };
    
    return user;
  }
};

module.exports = UserMethods; 