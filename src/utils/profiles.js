const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('./logger');

/**
 * Profile Manager for browser session isolation
 */
class ProfileManager {
  constructor() {
    this.profilesDir = path.resolve(config.browser.profilesDir);
    this.ensureProfilesDir();
  }
  
  /**
   * Ensure profiles directory exists
   */
  ensureProfilesDir() {
    if (!fs.existsSync(this.profilesDir)) {
      fs.mkdirSync(this.profilesDir, { recursive: true });
      logger.info(`Created profiles directory: ${this.profilesDir}`);
    }
  }
  
  /**
   * Get profile path for a specific account
   * @param {string} accountId - Unique account identifier
   * @returns {string}
   */
  getProfilePath(accountId) {
    const profilePath = path.join(this.profilesDir, accountId);
    
    if (!fs.existsSync(profilePath)) {
      fs.mkdirSync(profilePath, { recursive: true });
      logger.info(`Created profile for account: ${accountId}`);
    }
    
    return profilePath;
  }
  
  /**
   * Delete a profile
   * @param {string} accountId - Account identifier
   */
  deleteProfile(accountId) {
    const profilePath = path.join(this.profilesDir, accountId);
    
    if (fs.existsSync(profilePath)) {
      fs.rmSync(profilePath, { recursive: true, force: true });
      logger.info(`Deleted profile for account: ${accountId}`);
    }
  }
  
  /**
   * List all profiles
   * @returns {string[]}
   */
  listProfiles() {
    if (!fs.existsSync(this.profilesDir)) {
      return [];
    }
    
    return fs.readdirSync(this.profilesDir)
      .filter(file => {
        const filePath = path.join(this.profilesDir, file);
        return fs.statSync(filePath).isDirectory();
      });
  }
  
  /**
   * Clean up old profiles (older than specified days)
   * @param {number} daysOld - Age threshold in days
   */
  cleanupOldProfiles(daysOld = 30) {
    const profiles = this.listProfiles();
    const now = Date.now();
    const threshold = daysOld * 24 * 60 * 60 * 1000;
    
    let cleaned = 0;
    
    for (const profile of profiles) {
      const profilePath = path.join(this.profilesDir, profile);
      const stats = fs.statSync(profilePath);
      const age = now - stats.mtimeMs;
      
      if (age > threshold) {
        this.deleteProfile(profile);
        cleaned++;
      }
    }
    
    logger.info(`Cleaned up ${cleaned} old profiles`);
    return cleaned;
  }
}

module.exports = new ProfileManager();

