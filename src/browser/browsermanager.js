const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const logger = require('../utils/logger');
const profileManager = require('../utils/profiles');
const {
  generateViewport,
  generateUserAgent,
  generateTimezone,
  generateLocale,
} = require('../utils/humanBehavior');

/**
 * Browser Manager - Handles browser lifecycle and stealth configuration
 */
class BrowserManager {
  constructor() {
    this.browsers = new Map(); // accountId -> browser instance
    this.contexts = new Map(); // accountId -> context instance
  }
  
  /**
   * Launch a new browser instance with stealth settings
   * @param {string} accountId - Unique account identifier (used as sessionId for sticky proxy)
   * @param {Object} options - Additional options
   * @returns {Promise<{browser: Browser, context: BrowserContext, page: Page}>}
   */
  async launchBrowser(accountId, options = {}) {
    try {
      logger.info(`Launching browser for account: ${accountId}`);
      
      // Get profile path for isolation
      const userDataDir = profileManager.getProfilePath(accountId);
      
      // Use provided user agent or generate one
      const userAgent = options.userAgent || generateUserAgent();
      const viewport = options.viewport || generateViewport();
      const timezone = options.timezone || generateTimezone();
      const locale = options.locale || generateLocale();
      
      // Build proxy configuration with Decodo sticky session
      let proxyServer = null;
      let proxyUsername = null;
      let proxyPassword = null;
      
      if (config.proxy.enabled) {
        proxyServer = `http://${config.proxy.decodServer}`;
        // Use raw password for httpCredentials (no encoding needed)
        proxyPassword = config.proxy.password;
        
        // Detect proxy format:
        // - Subdomain routing: us.decodo.com, br.decodo.com (use plain username)
        // - Username-suffix: gate.decodo.com (add location + session to username)
        const isSubdomainRouting = /^[a-z]{2}\.decodo\.com/i.test(config.proxy.decodServer);
        
        if (isSubdomainRouting) {
          // Subdomain routing: use plain username (no location/session suffix)
          proxyUsername = config.proxy.username;
          const subdomain = config.proxy.decodServer.split('.')[0].toUpperCase();
          logger.info(`Using Decodo proxy: ${subdomain} subdomain - Session: ${accountId}`);
        } else {
          // Username-suffix format: add location + session to username
          // Format: username-country-{country}-state-{state}-city-{city}-session-{sessionId}
          let locationPart = '';
          
          if (config.proxy.country) {
            locationPart += `-country-${config.proxy.country}`;
          }
          
          if (config.proxy.state) {
            locationPart += `-state-${config.proxy.state}`;
          }
          
          if (config.proxy.city) {
            locationPart += `-city-${config.proxy.city}`;
          }
          
          proxyUsername = `${config.proxy.username}${locationPart}-session-${accountId}`;
          
          const location = config.proxy.state 
            ? `${config.proxy.country.toUpperCase()}/${config.proxy.state}` 
            : config.proxy.country.toUpperCase();
          
          logger.info(`Using Decodo proxy: ${location} - Session: ${accountId}`);
        }
      }
      
      // Browser launch args
      const args = [
        ...config.browser.args,
        `--window-size=${viewport.width},${viewport.height}`,
      ];
      
      // Add proxy if configured
      if (proxyServer) {
        args.push(`--proxy-server=${proxyServer}`);
      }
      
      // Launch browser
      const browser = await chromium.launch({
        headless: config.browser.headless,
        args,
        ...(options.executablePath && { executablePath: options.executablePath }),
      });
      
      // Create context with stealth settings
      const context = await browser.newContext({
        userDataDir,
        viewport,
        userAgent,
        locale,
        timezoneId: timezone,
        
        // Proxy authentication (Decodo with sticky session)
        ...(proxyUsername && proxyPassword && {
          httpCredentials: {
            username: proxyUsername,
            password: proxyPassword,
          },
        }),
        
        // Permissions
        permissions: [],
        
        // Additional fingerprinting resistance
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        
        // Geolocation (randomized based on timezone)
        ...(this.getGeolocationForTimezone(timezone)),
      });
      
      // Inject stealth scripts
      await this.injectStealthScripts(context);
      
      // Create page
      const page = await context.newPage();
      
      // Set default timeouts
      page.setDefaultTimeout(config.browser.timeout);
      page.setDefaultNavigationTimeout(config.browser.navigationTimeout);
      
      // Add page error listeners
      page.on('pageerror', error => {
        logger.error(`Page error for ${accountId}:`, error);
      });
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          logger.warn(`Console error for ${accountId}:`, msg.text());
        }
      });
      
      // Store references
      this.browsers.set(accountId, browser);
      this.contexts.set(accountId, context);
      
      logger.info(`Browser launched successfully for ${accountId}`);
      logger.debug(`Viewport: ${viewport.width}x${viewport.height}, UA: ${userAgent.substring(0, 50)}...`);
      
      return { browser, context, page };
    } catch (error) {
      logger.error(`Failed to launch browser for ${accountId}:`, error);
      throw error;
    }
  }
  
  /**
   * Inject stealth scripts to avoid detection
   * @param {BrowserContext} context
   */
  async injectStealthScripts(context) {
    // Add init script to mask automation
    await context.addInitScript(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
      
      // Mock permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: 'denied' }) :
          originalQuery(parameters)
      );
      
      // Mock plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          {
            0: { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format', enabledPlugin: Plugin },
            description: 'Portable Document Format',
            filename: 'internal-pdf-viewer',
            length: 1,
            name: 'Chrome PDF Plugin',
          },
          {
            0: { type: 'application/pdf', suffixes: 'pdf', description: '', enabledPlugin: Plugin },
            description: '',
            filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
            length: 1,
            name: 'Chrome PDF Viewer',
          },
          {
            0: { type: 'application/x-nacl', suffixes: '', description: 'Native Client Executable', enabledPlugin: Plugin },
            1: { type: 'application/x-pnacl', suffixes: '', description: 'Portable Native Client Executable', enabledPlugin: Plugin },
            description: '',
            filename: 'internal-nacl-plugin',
            length: 2,
            name: 'Native Client',
          },
        ],
      });
      
      // Mock languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
      
      // Mock chrome object
      if (!window.chrome) {
        window.chrome = {};
      }
      
      window.chrome.runtime = {
        connect: () => {},
        sendMessage: () => {},
      };
      
      // Mask headless
      Object.defineProperty(navigator, 'platform', {
        get: () => 'Win32',
      });
      
      // Add realistic browser features
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 8,
      });
      
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => 8,
      });
    });
  }
  
  /**
   * Get geolocation based on timezone
   * @param {string} timezone
   * @returns {Object}
   */
  getGeolocationForTimezone(timezone) {
    const locations = {
      'America/New_York': { latitude: 40.7128, longitude: -74.0060 },
      'America/Chicago': { latitude: 41.8781, longitude: -87.6298 },
      'America/Denver': { latitude: 39.7392, longitude: -104.9903 },
      'America/Los_Angeles': { latitude: 34.0522, longitude: -118.2437 },
      'Europe/London': { latitude: 51.5074, longitude: -0.1278 },
      'Europe/Paris': { latitude: 48.8566, longitude: 2.3522 },
      'Europe/Berlin': { latitude: 52.5200, longitude: 13.4050 },
      'Asia/Tokyo': { latitude: 35.6762, longitude: 139.6503 },
    };
    
    return { geolocation: locations[timezone] || locations['America/New_York'] };
  }
  
  /**
   * Take screenshot for debugging
   * @param {Page} page
   * @param {string} accountId
   * @param {string} name
   */
  async takeScreenshot(page, accountId, name = 'debug') {
    try {
      const screenshotsDir = path.join(config.browser.profilesDir, 'screenshots');
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${accountId}_${name}_${timestamp}.png`;
      const filepath = path.join(screenshotsDir, filename);
      
      await page.screenshot({ path: filepath, fullPage: true });
      logger.info(`Screenshot saved: ${filepath}`);
      
      return filepath;
    } catch (error) {
      logger.error('Failed to take screenshot:', error);
    }
  }
  
  /**
   * Close browser instance
   * @param {string} accountId
   */
  async closeBrowser(accountId) {
    try {
      const browser = this.browsers.get(accountId);
      const context = this.contexts.get(accountId);
      
      if (context) {
        await context.close();
        this.contexts.delete(accountId);
      }
      
      if (browser) {
        await browser.close();
        this.browsers.delete(accountId);
      }
      
      logger.info(`Browser closed for account: ${accountId}`);
    } catch (error) {
      logger.error(`Error closing browser for ${accountId}:`, error);
    }
  }
  
  /**
   * Close all browsers
   */
  async closeAll() {
    const accountIds = Array.from(this.browsers.keys());
    
    for (const accountId of accountIds) {
      await this.closeBrowser(accountId);
    }
    
    logger.info('All browsers closed');
  }
}

module.exports = new BrowserManager();

