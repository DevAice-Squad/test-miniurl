const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { Url } = require('../models');

class UrlService {
  /**
   * Generate a unique short URL code
   * @param {string} algorithm - The algorithm to use ('hash', 'uuid', 'custom')
   * @param {string} originalUrl - The original URL to shorten
   * @returns {Promise<string>} - The generated short code
   */
  static async generateShortCode(algorithm = 'hash', originalUrl = '') {
    let shortCode;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      switch (algorithm.toLowerCase()) {
        case 'hash':
          shortCode = this.generateHashCode(originalUrl);
          break;
        case 'uuid':
          shortCode = this.generateUuidCode();
          break;
        case 'custom':
          shortCode = this.generateCustomCode();
          break;
        default:
          shortCode = this.generateHashCode(originalUrl);
      }

      // Check if the code is unique
      const existingUrl = await Url.findOne({ where: { short_url: shortCode } });
      if (!existingUrl) {
        return shortCode;
      }
      
      attempts++;
    }

    throw new Error('Unable to generate unique short code after maximum attempts');
  }

  /**
   * Generate hash-based short code
   * @param {string} originalUrl - The original URL
   * @returns {string} - 6-8 character hash code
   */
  static generateHashCode(originalUrl) {
    const timestamp = Date.now().toString();
    const combined = originalUrl + timestamp + Math.random().toString();
    
    return crypto
      .createHash('md5')
      .update(combined)
      .digest('base64')
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 6);
  }

  /**
   * Generate UUID-based short code
   * @returns {string} - 8 character UUID-based code
   */
  static generateUuidCode() {
    return uuidv4()
      .replace(/-/g, '')
      .substring(0, 8);
  }

  /**
   * Generate custom algorithm short code
   * @returns {string} - 7 character custom code
   */
  static generateCustomCode() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    const timestamp = Date.now();
    
    // Use timestamp to ensure uniqueness
    const base = timestamp % 1000000; // Get last 6 digits
    
    for (let i = 0; i < 7; i++) {
      const index = (base + Math.floor(Math.random() * chars.length)) % chars.length;
      result += chars.charAt(index);
    }
    
    return result;
  }

  /**
   * Validate URL format
   * @param {string} url - URL to validate
   * @returns {boolean} - Whether URL is valid
   */
  static isValidUrl(url) {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch (error) {
      return false;
    }
  }

  /**
   * Normalize URL (add protocol if missing)
   * @param {string} url - URL to normalize
   * @returns {string} - Normalized URL
   */
  static normalizeUrl(url) {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return 'https://' + url;
    }
    return url;
  }

  /**
   * Extract domain from URL for analytics
   * @param {string} url - URL to extract domain from
   * @returns {string|null} - Extracted domain
   */
  static extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if URL is expired
   * @param {Object} urlRecord - URL database record
   * @returns {boolean} - Whether URL is expired
   */
  static isExpired(urlRecord) {
    if (!urlRecord.expires_at) return false;
    return new Date() > new Date(urlRecord.expires_at);
  }

  /**
   * Custom shortening algorithm interface for developers
   * @param {Object} options - Algorithm options
   * @returns {string} - Generated short code
   */
  static customAlgorithm(options = {}) {
    const {
      length = 7,
      includeNumbers = true,
      includeUppercase = true,
      includeLowercase = true,
      excludeSimilar = true
    } = options;

    let chars = '';
    if (includeLowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (includeUppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (includeNumbers) chars += '0123456789';
    
    if (excludeSimilar) {
      // Remove similar looking characters
      chars = chars.replace(/[0oO1lI]/g, '');
    }

    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }
}

module.exports = UrlService; 