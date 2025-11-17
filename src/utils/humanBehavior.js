/**
 * Utilities for simulating realistic human-like behavior
 */

/**
 * Generate a random delay within a range
 * @param {number} min - Minimum delay in ms
 * @param {number} max - Maximum delay in ms
 * @returns {number}
 */
function randomDelay(min = 100, max = 300) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Sleep for a specified duration
 * @param {number} ms - Duration in milliseconds
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate realistic mouse movement path using Bezier curves
 * @param {Object} from - Starting position {x, y}
 * @param {Object} to - Ending position {x, y}
 * @param {number} steps - Number of steps in the path
 * @returns {Array<{x: number, y: number}>}
 */
function generateMousePath(from, to, steps = 20) {
  const path = [];
  
  // Add random control points for Bezier curve
  const cp1 = {
    x: from.x + (to.x - from.x) * 0.25 + (Math.random() - 0.5) * 100,
    y: from.y + (to.y - from.y) * 0.25 + (Math.random() - 0.5) * 100,
  };
  
  const cp2 = {
    x: from.x + (to.x - from.x) * 0.75 + (Math.random() - 0.5) * 100,
    y: from.y + (to.y - from.y) * 0.75 + (Math.random() - 0.5) * 100,
  };
  
  // Generate points along cubic Bezier curve
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    
    const x = mt * mt * mt * from.x +
              3 * mt * mt * t * cp1.x +
              3 * mt * t * t * cp2.x +
              t * t * t * to.x;
              
    const y = mt * mt * mt * from.y +
              3 * mt * mt * t * cp1.y +
              3 * mt * t * t * cp2.y +
              t * t * t * to.y;
    
    path.push({ x: Math.round(x), y: Math.round(y) });
  }
  
  return path;
}

/**
 * Move mouse to element in a human-like way
 * @param {Page} page - Playwright page object
 * @param {string} selector - CSS selector
 * @returns {Promise<void>}
 */
async function humanMouseMove(page, selector) {
  try {
    const element = await page.locator(selector).first();
    const box = await element.boundingBox();
    
    if (!box) {
      throw new Error(`Element ${selector} not visible`);
    }
    
    // Get current mouse position (start from a random position if first move)
    const currentPos = await page.evaluate(() => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
    }));
    
    // Target position (random point within element)
    const targetPos = {
      x: box.x + box.width * (0.3 + Math.random() * 0.4),
      y: box.y + box.height * (0.3 + Math.random() * 0.4),
    };
    
    // Generate path
    const path = generateMousePath(currentPos, targetPos, randomDelay(15, 25));
    
    // Move along path
    for (const point of path) {
      await page.mouse.move(point.x, point.y);
      await sleep(randomDelay(10, 20));
    }
  } catch (error) {
    // Fallback to direct move
    await page.locator(selector).first().hover();
  }
}

/**
 * Type text with realistic human timing
 * @param {Page} page - Playwright page object
 * @param {string} selector - CSS selector
 * @param {string} text - Text to type
 * @returns {Promise<void>}
 */
async function humanType(page, selector, text) {
  await page.locator(selector).first().click();
  await sleep(randomDelay(100, 300));
  
  // Type character by character with realistic delays
  for (const char of text) {
    await page.keyboard.type(char);
    
    // Vary typing speed (faster for common keys, slower for special characters)
    let delay;
    if (char === ' ') {
      delay = randomDelay(100, 200);
    } else if (/[a-z0-9]/i.test(char)) {
      delay = randomDelay(50, 150);
    } else {
      delay = randomDelay(150, 300);
    }
    
    await sleep(delay);
    
    // Occasionally pause (simulating thinking)
    if (Math.random() < 0.1) {
      await sleep(randomDelay(300, 800));
    }
  }
  
  await sleep(randomDelay(200, 400));
}

/**
 * Simulate human-like scrolling
 * @param {Page} page - Playwright page object
 * @param {string} direction - 'up' or 'down'
 * @param {number} amount - Scroll amount in pixels
 * @returns {Promise<void>}
 */
async function humanScroll(page, direction = 'down', amount = 300) {
  const scrollSteps = Math.floor(amount / 20);
  const scrollAmount = direction === 'down' ? 20 : -20;
  
  for (let i = 0; i < scrollSteps; i++) {
    await page.mouse.wheel(0, scrollAmount);
    await sleep(randomDelay(20, 50));
  }
  
  await sleep(randomDelay(200, 500));
}

/**
 * Random page interaction before filling form (to seem more human)
 * @param {Page} page - Playwright page object
 * @returns {Promise<void>}
 */
async function randomPageInteraction(page) {
  const actions = [
    async () => {
      // Random scroll
      await humanScroll(page, Math.random() > 0.5 ? 'down' : 'up', randomDelay(100, 300));
    },
    async () => {
      // Move mouse to random position
      await page.mouse.move(
        Math.random() * 800,
        Math.random() * 600
      );
      await sleep(randomDelay(500, 1000));
    },
    async () => {
      // Just wait
      await sleep(randomDelay(1000, 2000));
    },
  ];
  
  // Perform 1-2 random actions
  const numActions = Math.random() > 0.5 ? 1 : 2;
  for (let i = 0; i < numActions; i++) {
    const action = actions[Math.floor(Math.random() * actions.length)];
    await action();
  }
}

/**
 * Generate realistic viewport size
 * @returns {{width: number, height: number}}
 */
function generateViewport() {
  const commonViewports = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1536, height: 864 },
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
  ];
  
  return commonViewports[Math.floor(Math.random() * commonViewports.length)];
}

/**
 * Generate realistic user agent
 * @returns {string}
 */
function generateUserAgent() {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  ];
  
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

/**
 * Generate realistic timezone
 * @returns {string}
 */
function generateTimezone() {
  const timezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
  ];
  
  return timezones[Math.floor(Math.random() * timezones.length)];
}

/**
 * Generate realistic locale
 * @returns {string}
 */
function generateLocale() {
  const locales = [
    'en-US',
    'en-GB',
    'en-CA',
    'de-DE',
    'fr-FR',
    'es-ES',
    'it-IT',
  ];
  
  return locales[Math.floor(Math.random() * locales.length)];
}

module.exports = {
  randomDelay,
  sleep,
  generateMousePath,
  humanMouseMove,
  humanType,
  humanScroll,
  randomPageInteraction,
  generateViewport,
  generateUserAgent,
  generateTimezone,
  generateLocale,
};

