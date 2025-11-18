const logger = require('../utils/logger');
const { sleep } = require('../utils/humanBehavior');

/**
 * CartPanda-specific checkout logic and handling
 * 
 * CartPanda checkouts often have:
 * - Dynamic loading of shipping/tax calculations
 * - Multi-step checkout flows
 * - Dynamic payment method selection
 * - Real-time form validation
 */
class CartPandaLogic {
  
  /**
   * Wait for CartPanda checkout page to fully load
   * @param {Page} page - Playwright page
   * @returns {Promise<boolean>}
   */
  async waitForCheckoutReady(page) {
    try {
      logger.info('Waiting for CartPanda checkout to load...');
      
      // Wait for common CartPanda elements
      await page.waitForSelector('input, select, textarea', { timeout: 15000 });
      
      // Wait for any loading overlays to disappear
      await page.waitForFunction(() => {
        const spinners = document.querySelectorAll(
          '[class*="spinner"], [class*="loading"], [class*="loader"], .loading'
        );
        const overlays = document.querySelectorAll('[class*="overlay"]');
        return spinners.length === 0 && overlays.length === 0;
      }, { timeout: 10000 }).catch(() => {
        logger.warn('Loading indicators still present, continuing anyway...');
      });
      
      // Give extra time for JavaScript to initialize
      await sleep(1500);
      
      logger.info('CartPanda checkout loaded successfully');
      return true;
    } catch (error) {
      logger.warn('CartPanda checkout load timeout:', error.message);
      return false;
    }
  }
  
  /**
   * Detect if we're on a CartPanda checkout page
   * @param {Page} page
   * @returns {Promise<boolean>}
   */
  async isCartPandaCheckout(page) {
    try {
      const url = page.url();
      if (url.includes('cartpanda.com') || url.includes('checkout.cartpanda')) {
        return true;
      }
      
      // Check for CartPanda-specific elements
      const cartPandaIndicators = await page.evaluate(() => {
        const hasCartPandaScript = !!document.querySelector('script[src*="cartpanda"]');
        const hasCartPandaClass = !!document.querySelector('[class*="cartpanda"]');
        return hasCartPandaScript || hasCartPandaClass;
      });
      
      return cartPandaIndicators;
    } catch (error) {
      logger.warn('Error detecting CartPanda:', error.message);
      return false;
    }
  }
  
  /**
   * Handle dynamic price/shipping calculations
   * CartPanda often recalculates shipping after address is entered
   * @param {Page} page
   */
  async handleDynamicCalculations(page) {
    try {
      logger.info('Waiting for CartPanda price calculations...');
      
      // Wait a bit for calculations to trigger
      await sleep(2000);
      
      // Look for "Calculate Shipping" or similar buttons
      const calculateButton = await page.$('button:has-text("Calculate"), button:has-text("Update")').catch(() => null);
      if (calculateButton) {
        logger.info('Found calculate button, clicking...');
        await calculateButton.click();
        await sleep(2000);
      }
      
      // Wait for any price updates to complete
      await page.waitForFunction(() => {
        const priceElements = document.querySelectorAll('[class*="price"], [class*="total"]');
        return priceElements.length > 0;
      }, { timeout: 5000 }).catch(() => {});
      
      logger.info('Price calculations completed');
    } catch (error) {
      logger.warn('Error handling dynamic calculations:', error.message);
    }
  }
  
  /**
   * Select payment method if needed
   * @param {Page} page
   * @param {string} method - Payment method (e.g., 'credit_card', 'paypal')
   */
  async selectPaymentMethod(page, method = 'credit_card') {
    try {
      logger.info(`Selecting payment method: ${method}`);
      
      // Look for payment method radio buttons or selectors
      const paymentSelectors = [
        'input[name*="payment"][value*="credit"]',
        'input[name*="payment"][value*="card"]',
        'input[type="radio"][name*="payment"]',
        '.payment-method input[type="radio"]',
      ];
      
      for (const selector of paymentSelectors) {
        const element = await page.$(selector).catch(() => null);
        if (element) {
          const isVisible = await element.isVisible();
          if (isVisible) {
            await element.click();
            await sleep(500);
            logger.info('Payment method selected');
            return true;
          }
        }
      }
      
      logger.info('No payment method selection needed');
      return false;
    } catch (error) {
      logger.warn('Error selecting payment method:', error.message);
      return false;
    }
  }
  
  /**
   * Handle multi-step checkout navigation
   * @param {Page} page
   * @param {string} step - Current step (e.g., 'shipping', 'payment', 'review')
   */
  async navigateToNextStep(page, step = 'next') {
    try {
      logger.info(`Navigating to next checkout step: ${step}`);
      
      // Common "Next" or "Continue" button selectors
      const nextButtonSelectors = [
        'button:has-text("Continue")',
        'button:has-text("Next")',
        'button:has-text("Proceed")',
        'button[type="submit"]:not([disabled])',
        '.checkout-next',
        '.continue-button',
      ];
      
      for (const selector of nextButtonSelectors) {
        const button = await page.$(selector).catch(() => null);
        if (button) {
          const isVisible = await button.isVisible();
          if (isVisible) {
            await button.click();
            await sleep(2000);
            logger.info('Navigated to next step');
            return true;
          }
        }
      }
      
      logger.warn('Could not find next step button');
      return false;
    } catch (error) {
      logger.warn('Error navigating to next step:', error.message);
      return false;
    }
  }
  
  /**
   * Check for and handle CartPanda-specific error messages
   * @param {Page} page
   * @returns {Promise<Object>}
   */
  async checkForErrors(page) {
    try {
      const errors = await page.evaluate(() => {
        const errorElements = document.querySelectorAll(
          '.error, .error-message, [class*="error"], .alert-danger, .validation-error'
        );
        
        const errorMessages = [];
        errorElements.forEach(el => {
          if (el.offsetParent !== null) { // Check if visible
            errorMessages.push(el.textContent.trim());
          }
        });
        
        return errorMessages;
      });
      
      if (errors.length > 0) {
        logger.warn('CartPanda errors detected:', errors);
        return {
          hasErrors: true,
          errors,
        };
      }
      
      return {
        hasErrors: false,
        errors: [],
      };
    } catch (error) {
      logger.warn('Error checking for CartPanda errors:', error.message);
      return {
        hasErrors: false,
        errors: [],
      };
    }
  }
  
  /**
   * Verify CartPanda checkout completion
   * @param {Page} page
   * @returns {Promise<Object>}
   */
  async verifyCheckoutSuccess(page) {
    try {
      const url = page.url();
      const content = await page.content();
      
      // Common success indicators for CartPanda
      const successIndicators = [
        url.includes('/thank-you'),
        url.includes('/success'),
        url.includes('/confirmation'),
        url.includes('/order-complete'),
        content.includes('Order Confirmation'),
        content.includes('Thank you for your order'),
        content.includes('Your order has been placed'),
        content.includes('Order Number'),
        content.includes('order-confirmation'),
      ];
      
      const isSuccess = successIndicators.some(indicator => indicator);
      
      if (isSuccess) {
        logger.info('CartPanda checkout SUCCESS detected');
        
        // Try to extract order number
        const orderNumber = await page.evaluate(() => {
          const orderRegex = /order[#\s:]?\s*([A-Z0-9-]+)/i;
          const match = document.body.textContent.match(orderRegex);
          return match ? match[1] : null;
        });
        
        return {
          success: true,
          method: 'cartpanda_detection',
          message: 'CartPanda checkout completed successfully',
          orderNumber,
        };
      }
      
      return {
        success: false,
        method: 'cartpanda_detection',
        message: 'Checkout not yet complete',
      };
    } catch (error) {
      logger.warn('Error verifying CartPanda success:', error.message);
      return {
        success: false,
        method: 'cartpanda_detection',
        message: error.message,
      };
    }
  }
}

module.exports = new CartPandaLogic();

