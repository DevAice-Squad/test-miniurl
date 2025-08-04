// Simple in-memory database for development
// This avoids the need for SQLite/PostgreSQL setup

class InMemoryDatabase {
  constructor() {
    this.users = new Map();
    this.urls = new Map();
    this.clicks = new Map();
    this.counters = { users: 1, urls: 1, clicks: 1 };
  }

  async authenticate() {
    console.log('✅ In-memory database ready');
    return Promise.resolve();
  }

  async sync(options = {}) {
    console.log('✅ In-memory database models synchronized');
    return Promise.resolve();
  }

  async close() {
    console.log('📴 In-memory database connection closed');
    return Promise.resolve();
  }

  // User operations
  async createUser(userData) {
    const id = this.counters.users++;
    const user = {
      id,
      username: userData.username,
      email: userData.email,
      password_hash: userData.password_hash,
      role: userData.role || 'user',
      isActive: userData.isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async findUserByEmail(email) {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  async findUserByUsername(username) {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return null;
  }

  async findUserById(id) {
    return this.users.get(id) || null;
  }

  async updateUser(id, updates) {
    const user = this.users.get(id);
    if (!user) return null;
    
    Object.assign(user, updates, { updatedAt: new Date() });
    this.users.set(id, user);
    return user;
  }

  async deleteUser(id) {
    return this.users.delete(id);
  }

  async getAllUsers() {
    return Array.from(this.users.values());
  }

  // URL operations
  async createUrl(urlData) {
    const id = this.counters.urls++;
    const url = {
      id,
      original_url: urlData.original_url,
      short_url: urlData.short_url,
      user_id: urlData.user_id || null,
      title: urlData.title || null,
      description: urlData.description || null,
      is_active: urlData.is_active !== false,
      expires_at: urlData.expires_at || null,
      click_count: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.urls.set(id, url);
    return url;
  }

  async findUrlByShortCode(shortCode) {
    for (const url of this.urls.values()) {
      if (url.short_url === shortCode) {
        return url;
      }
    }
    return null;
  }

  async findUrlById(id) {
    return this.urls.get(id) || null;
  }

  async findUrlsByUserId(userId) {
    return Array.from(this.urls.values()).filter(url => url.user_id === userId);
  }

  async updateUrl(id, updates) {
    const url = this.urls.get(id);
    if (!url) return null;
    
    Object.assign(url, updates, { updatedAt: new Date() });
    this.urls.set(id, url);
    return url;
  }

  async deleteUrl(id) {
    return this.urls.delete(id);
  }

  async getAllUrls() {
    return Array.from(this.urls.values());
  }

  // Click operations
  async createClick(clickData) {
    const id = this.counters.clicks++;
    const click = {
      id,
      url_id: clickData.url_id,
      ip_address: clickData.ip_address,
      user_agent: clickData.user_agent,
      referer: clickData.referer,
      country: clickData.country,
      city: clickData.city,
      browser: clickData.browser,
      os: clickData.os,
      device_type: clickData.device_type,
      createdAt: new Date()
    };
    this.clicks.set(id, click);
    
    // Update click count for URL
    const url = this.urls.get(clickData.url_id);
    if (url) {
      url.click_count = (url.click_count || 0) + 1;
      this.urls.set(clickData.url_id, url);
    }
    
    return click;
  }

  async findClicksByUrlId(urlId) {
    return Array.from(this.clicks.values()).filter(click => click.url_id === urlId);
  }

  async getClicksByPeriod(urlId, period = 'day') {
    const clicks = this.findClicksByUrlId(urlId);
    // Simple mock data for now
    return clicks.length;
  }

  async getTopReferrers(urlId, limit = 10) {
    const clicks = this.findClicksByUrlId(urlId);
    const referrers = {};
    
    clicks.forEach(click => {
      if (click.referer) {
        referrers[click.referer] = (referrers[click.referer] || 0) + 1;
      }
    });
    
    return Object.entries(referrers)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([referer, count]) => ({ referer, count }));
  }
}

// Create singleton instance
const database = new InMemoryDatabase();

module.exports = database; 