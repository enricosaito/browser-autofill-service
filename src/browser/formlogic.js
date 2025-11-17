const logger = require('../utils/logger');
const { humanType, humanMouseMove, humanScroll, randomPageInteraction, sleep, randomDelay } = require('../utils/humanBehavior');

/**
 * Form Logic - Intelligent form detection and filling
 */
class FormLogic {
  /**
   * Detect and fill form with provided data
   * @param {Page} page - Playwright page object
   * @param {Object} formData - Form data to fill
   * @param {Object} options - Additional options
   * @returns {Promise<Object>}
   */
  async fillForm(page, formData, options = {}) {
    try {
      logger.info('Starting form fill process');
      
      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {
        logger.warn('Network idle timeout, proceeding anyway');
      });
      
      // Random pre-fill interaction
      if (options.simulateHuman !== false) {
        await randomPageInteraction(page);
      }
      
      // Detect all form fields
      const fields = await this.detectFormFields(page);
      logger.info(`Detected ${fields.length} form fields`);
      
      // Fill each field
      const results = {
        filled: [],
        failed: [],
        skipped: [],
      };
      
      for (const field of fields) {
        try {
          const value = this.getValueForField(field, formData);
          
          if (value === null || value === undefined) {
            results.skipped.push({ field: field.name || field.selector, reason: 'No matching data' });
            continue;
          }
          
          await this.fillField(page, field, value, options.simulateHuman !== false);
          results.filled.push({ field: field.name || field.selector, type: field.type });
          
          logger.info(`Filled field: ${field.name || field.selector}`);
        } catch (error) {
          logger.error(`Failed to fill field ${field.name || field.selector}:`, error);
          results.failed.push({ field: field.name || field.selector, error: error.message });
        }
      }
      
      logger.info(`Form fill complete. Filled: ${results.filled.length}, Failed: ${results.failed.length}, Skipped: ${results.skipped.length}`);
      
      return results;
    } catch (error) {
      logger.error('Form fill process failed:', error);
      throw error;
    }
  }
  
  /**
   * Detect all fillable form fields on the page
   * @param {Page} page
   * @returns {Promise<Array>}
   */
  async detectFormFields(page) {
    return await page.evaluate(() => {
      const fields = [];
      
      // Find all input, textarea, and select elements
      const elements = document.querySelectorAll('input, textarea, select');
      
      elements.forEach((element, index) => {
        // Skip hidden and disabled fields
        if (element.type === 'hidden' || element.disabled) {
          return;
        }
        
        // Skip submit buttons
        if (element.type === 'submit' || element.type === 'button') {
          return;
        }
        
        const field = {
          tagName: element.tagName.toLowerCase(),
          type: element.type || element.tagName.toLowerCase(),
          name: element.name,
          id: element.id,
          placeholder: element.placeholder,
          required: element.required,
          value: element.value,
        };
        
        // Generate a unique selector
        if (element.id) {
          field.selector = `#${element.id}`;
        } else if (element.name) {
          field.selector = `[name="${element.name}"]`;
        } else {
          field.selector = `${element.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
        }
        
        // Try to infer field purpose from attributes
        field.purpose = this.inferFieldPurpose(element);
        
        fields.push(field);
      });
      
      return fields;
    });
  }
  
  /**
   * Infer field purpose from element attributes
   * This is injected into page context
   */
  static inferFieldPurpose(element) {
    const attrs = [
      element.name,
      element.id,
      element.placeholder,
      element.className,
      element.getAttribute('aria-label'),
      element.getAttribute('autocomplete'),
    ].filter(Boolean).join(' ').toLowerCase();
    
    // Email
    if (attrs.includes('email') || element.type === 'email') {
      return 'email';
    }
    
    // Name fields
    if (attrs.includes('firstname') || attrs.includes('first-name') || attrs.includes('fname')) {
      return 'firstName';
    }
    if (attrs.includes('lastname') || attrs.includes('last-name') || attrs.includes('lname')) {
      return 'lastName';
    }
    if (attrs.includes('name') && !attrs.includes('user')) {
      return 'fullName';
    }
    
    // Phone
    if (attrs.includes('phone') || attrs.includes('tel') || element.type === 'tel') {
      return 'phone';
    }
    
    // Address
    if (attrs.includes('address')) {
      return 'address';
    }
    if (attrs.includes('city')) {
      return 'city';
    }
    if (attrs.includes('state') || attrs.includes('province')) {
      return 'state';
    }
    if (attrs.includes('zip') || attrs.includes('postal')) {
      return 'zip';
    }
    if (attrs.includes('country')) {
      return 'country';
    }
    
    // Date
    if (element.type === 'date' || attrs.includes('date') || attrs.includes('dob')) {
      return 'date';
    }
    
    // URL
    if (element.type === 'url' || attrs.includes('website') || attrs.includes('url')) {
      return 'url';
    }
    
    // Generic text
    if (attrs.includes('message') || attrs.includes('comment') || element.tagName === 'TEXTAREA') {
      return 'message';
    }
    
    return 'text';
  }
  
  /**
   * Get value for a field from form data
   * @param {Object} field
   * @param {Object} formData
   * @returns {*}
   */
  getValueForField(field, formData) {
    // Try exact match first
    if (field.name && formData[field.name] !== undefined) {
      return formData[field.name];
    }
    
    if (field.id && formData[field.id] !== undefined) {
      return formData[field.id];
    }
    
    // Try purpose-based match
    if (field.purpose && formData[field.purpose] !== undefined) {
      return formData[field.purpose];
    }
    
    // Try fuzzy matching
    const fieldKey = field.name || field.id || '';
    for (const [key, value] of Object.entries(formData)) {
      if (fieldKey.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }
    
    return null;
  }
  
  /**
   * Fill a single form field
   * @param {Page} page
   * @param {Object} field
   * @param {*} value
   * @param {boolean} simulateHuman
   */
  async fillField(page, field, value, simulateHuman = true) {
    const selector = field.selector;
    
    // Wait for field to be visible and enabled
    await page.waitForSelector(selector, { state: 'visible', timeout: 10000 });
    
    // Scroll field into view if needed
    await page.locator(selector).first().scrollIntoViewIfNeeded();
    await sleep(randomDelay(200, 400));
    
    if (field.type === 'select' || field.tagName === 'select') {
      // Handle select dropdown
      await page.locator(selector).first().selectOption(String(value));
      await sleep(randomDelay(300, 600));
    } else if (field.type === 'checkbox') {
      // Handle checkbox
      const isChecked = await page.locator(selector).first().isChecked();
      if ((value && !isChecked) || (!value && isChecked)) {
        if (simulateHuman) {
          await humanMouseMove(page, selector);
        }
        await page.locator(selector).first().click();
        await sleep(randomDelay(200, 400));
      }
    } else if (field.type === 'radio') {
      // Handle radio button
      if (value) {
        if (simulateHuman) {
          await humanMouseMove(page, selector);
        }
        await page.locator(selector).first().click();
        await sleep(randomDelay(200, 400));
      }
    } else {
      // Handle text inputs
      // Clear existing value
      await page.locator(selector).first().click();
      await page.locator(selector).first().fill(''); // Clear first
      await sleep(randomDelay(100, 200));
      
      // Type with human-like behavior
      if (simulateHuman) {
        await humanType(page, selector, String(value));
      } else {
        await page.locator(selector).first().fill(String(value));
        await sleep(randomDelay(200, 400));
      }
    }
  }
  
  /**
   * Submit the form
   * @param {Page} page
   * @param {string} submitSelector - CSS selector for submit button
   * @returns {Promise<boolean>}
   */
  async submitForm(page, submitSelector) {
    try {
      logger.info('Attempting to submit form');
      
      // Wait for submit button
      await page.waitForSelector(submitSelector, { state: 'visible', timeout: 10000 });
      
      // Scroll to submit button
      await page.locator(submitSelector).first().scrollIntoViewIfNeeded();
      await sleep(randomDelay(500, 1000));
      
      // Move mouse to button and click
      await humanMouseMove(page, submitSelector);
      await sleep(randomDelay(300, 600));
      
      // Click submit
      await page.locator(submitSelector).first().click();
      
      logger.info('Form submitted');
      return true;
    } catch (error) {
      logger.error('Failed to submit form:', error);
      throw error;
    }
  }
  
  /**
   * Detect if CAPTCHA is present
   * @param {Page} page
   * @returns {Promise<boolean>}
   */
  async detectCaptcha(page) {
    const captchaIndicators = [
      'iframe[src*="recaptcha"]',
      'iframe[src*="hcaptcha"]',
      '.g-recaptcha',
      '.h-captcha',
      '#captcha',
      '[class*="captcha"]',
    ];
    
    for (const selector of captchaIndicators) {
      const element = await page.locator(selector).count();
      if (element > 0) {
        logger.warn('CAPTCHA detected on page');
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Verify form submission success
   * @param {Page} page
   * @param {Object} successIndicators - Success indicators to look for
   * @returns {Promise<Object>}
   */
  async verifySubmission(page, successIndicators = {}) {
    try {
      await sleep(2000); // Wait for redirect/message
      
      const result = {
        success: false,
        method: null,
        message: null,
      };
      
      // Check URL change
      if (successIndicators.successUrl) {
        const currentUrl = page.url();
        if (currentUrl.includes(successIndicators.successUrl)) {
          result.success = true;
          result.method = 'url';
          result.message = `URL changed to ${currentUrl}`;
          return result;
        }
      }
      
      // Check for success message
      if (successIndicators.successMessage) {
        const content = await page.content();
        if (content.includes(successIndicators.successMessage)) {
          result.success = true;
          result.method = 'message';
          result.message = 'Success message found';
          return result;
        }
      }
      
      // Check for success element
      if (successIndicators.successSelector) {
        const element = await page.locator(successIndicators.successSelector).count();
        if (element > 0) {
          result.success = true;
          result.method = 'element';
          result.message = 'Success element found';
          return result;
        }
      }
      
      // Generic success detection
      const successKeywords = ['success', 'thank you', 'submitted', 'received', 'complete'];
      const content = await page.content().then(c => c.toLowerCase());
      
      for (const keyword of successKeywords) {
        if (content.includes(keyword)) {
          result.success = true;
          result.method = 'keyword';
          result.message = `Found keyword: ${keyword}`;
          return result;
        }
      }
      
      // Check for error messages
      const errorKeywords = ['error', 'invalid', 'required', 'failed', 'incorrect'];
      for (const keyword of errorKeywords) {
        if (content.includes(keyword)) {
          result.success = false;
          result.method = 'error';
          result.message = `Found error keyword: ${keyword}`;
          return result;
        }
      }
      
      result.message = 'Unable to determine submission status';
      return result;
    } catch (error) {
      logger.error('Error verifying submission:', error);
      return {
        success: false,
        method: 'error',
        message: error.message,
      };
    }
  }
}

module.exports = new FormLogic();

