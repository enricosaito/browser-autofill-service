const { Worker } = require('bullmq');
const config = require('../config');
const logger = require('../utils/logger');
const browserManager = require('../browser/browsermanager');
const formLogic = require('../browser/formlogic');
const cartpandaCheckout = require('../browser/cartpandaCheckout');
const { sleep } = require('../utils/humanBehavior');

/**
 * Worker Process - Processes form filling tasks
 */
class FormFillingWorker {
  constructor() {
    this.connection = {
      host: config.redis.host,
      port: config.redis.port,
      ...(config.redis.password && { password: config.redis.password }),
    };
    
    this.worker = null;
    this.isShuttingDown = false;
  }
  
  /**
   * Start the worker
   */
  start() {
    logger.info('Starting form filling worker');
    
    this.worker = new Worker(
      'form-filling',
      async (job) => this.processJob(job),
      {
        connection: this.connection,
        concurrency: config.worker.concurrency,
        limiter: {
          max: 10,
          duration: 60000, // 10 jobs per minute max
        },
      }
    );
    
    // Worker event listeners
    this.worker.on('completed', (job, result) => {
      logger.info(`Job ${job.id} completed successfully`, { result });
    });
    
    this.worker.on('failed', (job, error) => {
      logger.error(`Job ${job.id} failed:`, { error: error.message, accountId: job.data.accountId });
    });
    
    this.worker.on('error', (error) => {
      logger.error('Worker error:', error);
    });
    
    this.worker.on('stalled', (jobId) => {
      logger.warn(`Job ${jobId} stalled`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
    
    logger.info('Worker started successfully');
  }
  
  /**
   * Process a form filling job
   * @param {Job} job - BullMQ job
   * @returns {Promise<Object>}
   */
  async processJob(job) {
    const { accountId, sessionId, formData, targetUrl, submitSelector, successIndicators, options } = job.data;
    
    logger.info(`Processing job ${job.id} for account ${accountId}`);
    logger.info(`Unique Session ID: ${sessionId} (proxy + profile isolation)`);
    
    let browser, context, page;
    const startTime = Date.now();
    
    try {
      // Update progress
      await job.updateProgress(10);
      
      // Launch browser with UNIQUE SESSION ID for complete isolation
      // Each checkout gets its own proxy session, cookies, and fingerprint
      logger.info(`Launching isolated browser for session ${sessionId}`);
      const browserOptions = {
        userAgent: options.userAgent || undefined,
        ...(options.browserOptions || {}),
      };
      ({ browser, context, page } = await browserManager.launchBrowser(sessionId, browserOptions));
      
      await job.updateProgress(20);
      
      // Navigate to target URL
      logger.info(`Navigating to ${targetUrl}`);
      await page.goto(targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: config.browser.navigationTimeout,
      });
      
      await job.updateProgress(30);
      
      // Wait for page to stabilize
      await sleep(2000);
      
      // Take initial screenshot
      if (options.takeScreenshots) {
        await browserManager.takeScreenshot(page, sessionId, 'initial');
      }
      
      // Detect if this is a CartPanda checkout page
      const isCartPanda = targetUrl.includes('cartpanda') || 
                         await page.$('#cardNumbercartpanda_stripe').then(() => true).catch(() => false);
      
      let fillResults, verification;
      
      if (isCartPanda) {
        logger.info('🛒 CartPanda checkout detected - using specialized handler');
        
        // Check for blocking
        const isBlocked = await cartpandaCheckout.checkIfBlocked(page);
        if (isBlocked) {
          if (options.takeScreenshots) {
            await browserManager.takeScreenshot(page, sessionId, 'blocked');
          }
          throw new Error('Page is blocked - possible CAPTCHA or IP ban');
        }
        
        await job.updateProgress(40);
        
        // Fill CartPanda form
        logger.info(`Filling CartPanda checkout for session ${sessionId}`);
        fillResults = await cartpandaCheckout.fillCheckoutForm(page, formData);
        
        await job.updateProgress(70);
        
        // Take screenshot before submit
        if (options.takeScreenshots) {
          await browserManager.takeScreenshot(page, sessionId, 'before-submit');
        }
        
        // Submit CartPanda checkout
        await cartpandaCheckout.submitCheckout(page);
        
        await job.updateProgress(85);
        
        // Verify CartPanda checkout (waits up to 90 seconds)
        logger.info(`Verifying CartPanda checkout for session ${sessionId}`);
        verification = await cartpandaCheckout.verifyCheckoutSuccess(page);
        
      } else {
        logger.info('📝 Generic form detected - using standard handler');
        
        // Check for CAPTCHA
        const hasCaptcha = await formLogic.detectCaptcha(page);
        if (hasCaptcha) {
          logger.warn(`CAPTCHA detected for session ${sessionId}`);
          
          if (options.takeScreenshots) {
            await browserManager.takeScreenshot(page, sessionId, 'captcha');
          }
          
          throw new Error('CAPTCHA detected - manual intervention required');
        }
        
        await job.updateProgress(40);
        
        // Fill form (generic)
        logger.info(`Filling form for session ${sessionId}`);
        fillResults = await formLogic.fillForm(page, formData, {
          simulateHuman: options.simulateHuman !== false,
        });
        
        await job.updateProgress(70);
        
        // Take screenshot before submit
        if (options.takeScreenshots) {
          await browserManager.takeScreenshot(page, sessionId, 'before-submit');
        }
        
        // Submit form
        logger.info(`Submitting form for session ${sessionId}`);
        await formLogic.submitForm(page, submitSelector);
        
        await job.updateProgress(85);
        
        // Wait for submission to process
        await sleep(3000);
        
        // Verify submission
        logger.info(`Verifying submission for session ${sessionId}`);
        verification = await formLogic.verifySubmission(page, successIndicators);
      }
      
      await job.updateProgress(95);
      
      // Take final screenshot
      if (options.takeScreenshots) {
        await browserManager.takeScreenshot(page, sessionId, 'after-submit');
      }
      
      const duration = Date.now() - startTime;
      
      const result = {
        success: verification.success,
        accountId,
        sessionId,
        fillResults,
        verification,
        duration,
        timestamp: new Date().toISOString(),
      };
      
      logger.info(`Job ${job.id} completed for session ${sessionId}`, { success: verification.success, duration });
      
      await job.updateProgress(100);
      
      // Auto-delete session profile after completion (cleanup for fresh start)
      logger.info(`Auto-deleting session profile for ${sessionId}`);
      const profileManager = require('../utils/profiles');
      profileManager.deleteProfile(sessionId);
      logger.info(`Session profile deleted for ${sessionId}`);
      
      return result;
      
    } catch (error) {
      logger.error(`Job ${job.id} failed for session ${sessionId}:`, error);
      
      // Take error screenshot
      if (page) {
        try {
          await browserManager.takeScreenshot(page, sessionId, 'error');
        } catch (screenshotError) {
          logger.error('Failed to take error screenshot:', screenshotError);
        }
      }
      
      throw error;
      
    } finally {
      // Always close browser using sessionId
      if (sessionId) {
        await browserManager.closeBrowser(sessionId);
      }
      
      // Delete session profile even on failure (fresh start for retry)
      if (sessionId) {
        try {
          const profileManager = require('../utils/profiles');
          profileManager.deleteProfile(sessionId);
          logger.info(`Session profile cleaned up for ${sessionId}`);
        } catch (cleanupError) {
          logger.warn(`Failed to cleanup profile for ${sessionId}:`, cleanupError);
        }
      }
      
      logger.info(`Cleaned up browser for session ${sessionId}`);
    }
  }
  
  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (this.isShuttingDown) {
      return;
    }
    
    this.isShuttingDown = true;
    logger.info('Shutting down worker gracefully...');
    
    try {
      // Close worker (will finish current jobs)
      if (this.worker) {
        await this.worker.close();
      }
      
      // Close all browsers
      await browserManager.closeAll();
      
      logger.info('Worker shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// If running directly, start the worker
if (require.main === module) {
  const worker = new FormFillingWorker();
  worker.start();
}

module.exports = FormFillingWorker;

