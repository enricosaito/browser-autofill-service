require('dotenv').config();

module.exports = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  
  browser: {
    headless: process.env.HEADLESS === 'true',
    timeout: parseInt(process.env.BROWSER_TIMEOUT || '30000', 10),
    navigationTimeout: parseInt(process.env.NAVIGATION_TIMEOUT || '30000', 10),
    profilesDir: process.env.PROFILES_DIR || './profiles',
    
    // Anti-detection settings
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  },
  
  proxy: {
    enabled: process.env.USE_PROXY === 'true',
    // Decodo configuration
    // Use subdomain-based routing (e.g., us.decodo.com:10001) OR location suffix format
    decodServer: process.env.DECODO_SERVER || 'gate.decodo.com:7000',
    username: process.env.DECODO_USERNAME || '',
    password: process.env.DECODO_PASSWORD || '',
    // Location targeting (for username-suffix format only, not needed for subdomain routing)
    // Leave empty if using subdomain routing like us.decodo.com
    country: process.env.DECODO_COUNTRY || '',
    state: process.env.DECODO_STATE || '',
    city: process.env.DECODO_CITY || '',
  },
  
  form: {
    targetUrl: process.env.TARGET_URL || 'https://example.com/form',
    submitSelector: process.env.FORM_SUBMIT_SELECTOR || 'button[type="submit"]',
  },
  
  retry: {
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.RETRY_DELAY || '5000', 10),
  },
  
  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '1', 10),
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log',
  },
};

