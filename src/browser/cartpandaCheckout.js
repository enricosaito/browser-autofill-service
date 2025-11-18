const logger = require('../utils/logger');
const { sleep, typeHumanLike, smoothScrollTo } = require('../utils/humanBehavior');

/**
 * CartPanda Checkout Handler
 * Specialized for CartPanda pages with Stripe payment integration
 */
class CartPandaCheckout {
  
  /**
   * Check if page is blocked
   * @param {Page} page
   * @returns {Promise<boolean>}
   */
  async checkIfBlocked(page) {
    try {
      logger.info('Checking for block/CAPTCHA...');
      
      const blockMessages = [
        'Sorry, you have been blocked',
        'Access Denied',
        'Blocked',
        'captcha',
      ];
      
      const pageText = await page.textContent('body').catch(() => '');
      
      for (const msg of blockMessages) {
        if (pageText.includes(msg)) {
          logger.warn(`Page blocked detected: "${msg}"`);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      logger.warn('Error checking block status:', error.message);
      return false;
    }
  }
  
  /**
   * Fill CartPanda checkout form
   * @param {Page} page
   * @param {Object} formData
   * @returns {Promise<Object>}
   */
  async fillCheckoutForm(page, formData) {
    try {
      logger.info('Starting CartPanda checkout form fill...');
      
      const results = {
        filled: [],
        failed: [],
        skipped: [],
      };
      
      // Wait for page to be ready
      await sleep(5000);
      
      // Check if blocked
      const isBlocked = await this.checkIfBlocked(page);
      if (isBlocked) {
        throw new Error('Page is blocked - possible CAPTCHA or IP ban');
      }
      
      // === SECTION 1: Basic Information ===
      logger.info('Filling basic information...');
      
      // Email
      if (formData.email) {
        await this.fillField(page, '#email', formData.email, 'email');
        results.filled.push({ field: 'email', selector: '#email' });
      }
      
      // Full Name
      if (formData.fullName || formData.nome || formData.name) {
        const name = formData.fullName || formData.nome || formData.name;
        await this.fillField(page, '#full-name', name, 'full name');
        results.filled.push({ field: 'fullName', selector: '#full-name' });
      }
      
      // Phone Number
      if (formData.phone || formData.telefone) {
        const phone = formData.phone || formData.telefone;
        await this.fillField(page, '#phone-number', phone, 'phone');
        results.filled.push({ field: 'phone', selector: '#phone-number' });
      }
      
      // Click checkout left section (advance to payment)
      logger.info('Advancing to payment section...');
      await page.click('.check-out-left').catch(() => {
        logger.warn('Could not click .check-out-left, continuing...');
      });
      await sleep(1000);
      
      // Scroll to payment section
      await smoothScrollTo(page, 200);
      await sleep(500);
      
      // === SECTION 2: Payment Information ===
      logger.info('Filling payment information...');
      
      // Card Number
      if (formData.cardNumber || formData.cartao) {
        const cardNumber = formData.cardNumber || formData.cartao;
        await this.fillField(page, '#cardNumbercartpanda_stripe', cardNumber, 'card number');
        results.filled.push({ field: 'cardNumber', selector: '#cardNumbercartpanda_stripe' });
      }
      
      // Cardholder Name (use full name if not provided)
      const cardholderName = formData.cardholderName || formData.fullName || formData.nome || formData.name;
      if (cardholderName) {
        await this.fillField(page, '#cardholderNamecartpanda_stripe', cardholderName, 'cardholder name');
        results.filled.push({ field: 'cardholderName', selector: '#cardholderNamecartpanda_stripe' });
      }
      
      // Card Expiry Date (MM/YY format)
      if (formData.cardExpiry || formData.validade) {
        const expiry = formData.cardExpiry || formData.validade;
        await this.fillField(page, '#cardExpiryDatecartpanda_stripe', expiry, 'card expiry');
        results.filled.push({ field: 'cardExpiry', selector: '#cardExpiryDatecartpanda_stripe' });
      }
      
      // Security Code (CVC)
      if (formData.cvc || formData.cvv || formData.securityCode) {
        const cvc = formData.cvc || formData.cvv || formData.securityCode;
        await this.fillField(page, '#securityCodecartpanda_stripe', cvc, 'CVC');
        results.filled.push({ field: 'cvc', selector: '#securityCodecartpanda_stripe' });
      }
      
      // Click outside to trigger validation
      await page.click('.check-out-row-outr').catch(() => {
        logger.warn('Could not click .check-out-row-outr');
      });
      await sleep(500);
      
      // Scroll to submit button
      await smoothScrollTo(page, 700);
      await sleep(1000);
      
      logger.info(`Form filling completed. Filled ${results.filled.length} fields`);
      return results;
      
    } catch (error) {
      logger.error('Error filling CartPanda checkout form:', error);
      throw error;
    }
  }
  
  /**
   * Fill a single field with human-like behavior
   * @param {Page} page
   * @param {string} selector
   * @param {string} value
   * @param {string} fieldName
   */
  async fillField(page, selector, value, fieldName) {
    try {
      logger.debug(`Filling ${fieldName} (${selector})...`);
      
      // Wait for field to be available
      await page.waitForSelector(selector, { timeout: 10000 });
      
      // Click to focus
      await page.click(selector);
      await sleep(300);
      
      // Clear existing content
      await page.fill(selector, '');
      await sleep(200);
      
      // Type with human-like behavior
      await typeHumanLike(page, selector, value);
      
      logger.debug(`Successfully filled ${fieldName}`);
    } catch (error) {
      logger.error(`Failed to fill ${fieldName} (${selector}):`, error.message);
      throw error;
    }
  }
  
  /**
   * Submit the checkout form
   * @param {Page} page
   */
  async submitCheckout(page) {
    try {
      logger.info('Submitting CartPanda checkout...');
      
      // Find and click submit button
      const submitSelector = '.cd-checkout-btn .complete-payment-checkout';
      
      await page.waitForSelector(submitSelector, { timeout: 10000 });
      await page.click(submitSelector);
      
      logger.info('Checkout submitted, waiting for payment processing...');
      
      // Wait for payment processing (CartPanda/Stripe can take time)
      await sleep(10000); // Initial 10 second wait
      
      return true;
    } catch (error) {
      logger.error('Error submitting checkout:', error);
      throw error;
    }
  }
  
  /**
   * Verify checkout success
   * @param {Page} page
   * @returns {Promise<Object>}
   */
  async verifyCheckoutSuccess(page) {
    try {
      logger.info('Verifying CartPanda checkout success...');
      
      // Wait up to 90 seconds for success indicators
      const maxWaitTime = 90000;
      const startTime = Date.now();
      
      while (Date.now() - startTime < maxWaitTime) {
        const url = page.url();
        const pageText = await page.textContent('body').catch(() => '');
        
        // Success indicators
        const successIndicators = [
          url.includes('/thank-you'),
          url.includes('/success'),
          url.includes('/confirmation'),
          url.includes('/order-complete'),
          pageText.includes('Obrigado'),
          pageText.includes('Thank you'),
          pageText.includes('Pedido confirmado'),
          pageText.includes('Order confirmed'),
          pageText.includes('Compra realizada'),
          pageText.includes('Purchase complete'),
        ];
        
        if (successIndicators.some(indicator => indicator)) {
          logger.info('✅ Checkout SUCCESS detected!');
          
          // Try to extract order number
          const orderNumber = await this.extractOrderNumber(page);
          
          return {
            success: true,
            method: 'cartpanda_success_detection',
            message: 'Checkout completed successfully',
            url: url,
            orderNumber,
          };
        }
        
        // Check for errors
        const errorIndicators = [
          pageText.includes('declined'),
          pageText.includes('recusado'),
          pageText.includes('error'),
          pageText.includes('erro'),
          pageText.includes('failed'),
          pageText.includes('falhou'),
        ];
        
        if (errorIndicators.some(indicator => indicator)) {
          logger.warn('❌ Payment error detected');
          return {
            success: false,
            method: 'cartpanda_error_detection',
            message: 'Payment was declined or failed',
            url: url,
          };
        }
        
        // Wait before checking again
        await sleep(3000);
      }
      
      // Timeout - unclear status
      logger.warn('⚠️ Checkout verification timeout - status unclear');
      return {
        success: false,
        method: 'timeout',
        message: 'Could not verify checkout success within 90 seconds',
        url: page.url(),
      };
      
    } catch (error) {
      logger.error('Error verifying checkout:', error);
      return {
        success: false,
        method: 'error',
        message: error.message,
      };
    }
  }
  
  /**
   * Extract order number from success page
   * @param {Page} page
   * @returns {Promise<string|null>}
   */
  async extractOrderNumber(page) {
    try {
      const pageText = await page.textContent('body');
      
      // Common order number patterns
      const patterns = [
        /pedido[#\s:]*([A-Z0-9-]+)/i,
        /order[#\s:]*([A-Z0-9-]+)/i,
        /número[#\s:]*([A-Z0-9-]+)/i,
        /number[#\s:]*([A-Z0-9-]+)/i,
      ];
      
      for (const pattern of patterns) {
        const match = pageText.match(pattern);
        if (match) {
          logger.info(`Order number found: ${match[1]}`);
          return match[1];
        }
      }
      
      return null;
    } catch (error) {
      logger.warn('Could not extract order number:', error.message);
      return null;
    }
  }
}

module.exports = new CartPandaCheckout();

