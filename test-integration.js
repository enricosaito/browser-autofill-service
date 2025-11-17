#!/usr/bin/env node

/**
 * Integration Test Script
 * Tests the full flow: API → Queue → Worker → Browser → Form Fill
 * 
 * Usage: node test-integration.js
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3000';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testIntegration() {
  log('cyan', '\n===========================================');
  log('cyan', '   Integration Test - Full Flow');
  log('cyan', '===========================================\n');

  try {
    // Step 1: Health Check
    log('blue', '1. Testing API health...');
    const health = await axios.get(`${API_URL}/health`);
    log('green', `✓ API is healthy (uptime: ${health.data.uptime.toFixed(2)}s)\n`);

    // Step 2: Queue Stats
    log('blue', '2. Checking queue status...');
    const stats = await axios.get(`${API_URL}/api/queue/stats`);
    log('green', `✓ Queue Stats:`);
    console.log(`   - Waiting: ${stats.data.data.waiting}`);
    console.log(`   - Active: ${stats.data.data.active}`);
    console.log(`   - Completed: ${stats.data.data.completed}`);
    console.log(`   - Failed: ${stats.data.data.failed}\n`);

    // Step 3: Submit Test Task
    log('blue', '3. Submitting test form-filling task...');
    
    const testData = {
      sessionId: `test-session-${Date.now()}`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      formData: {
        fullName: 'John Doe',
        email: 'john.doe@example.com',
        companyId: '12345678',
        phone: '555-1234',
        message: 'This is a test submission from the integration test.',
      },
      targetUrl: process.env.TARGET_URL || 'https://example.com',
      submitSelector: 'button[type="submit"]',
      options: {
        simulateHuman: true,
        takeScreenshots: true, // Enable to see what's happening
      },
    };

    log('yellow', `   Session ID: ${testData.sessionId}`);
    log('yellow', `   Target: ${testData.targetUrl}`);
    log('yellow', `   Proxy: ${process.env.USE_PROXY === 'true' ? 'Enabled (Decodo with sticky session)' : 'Disabled'}\n`);

    const submitResponse = await axios.post(`${API_URL}/api/tasks/submit`, {
      accountId: testData.sessionId,
      formData: testData.formData,
      targetUrl: testData.targetUrl,
      submitSelector: testData.submitSelector,
      options: {
        ...testData.options,
        userAgent: testData.userAgent,
      },
    });

    const jobId = submitResponse.data.data.jobId;
    log('green', `✓ Task submitted successfully!`);
    log('cyan', `   Job ID: ${jobId}\n`);

    // Step 4: Monitor Job Progress
    log('blue', '4. Monitoring job progress...\n');

    let completed = false;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max

    while (!completed && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      attempts++;

      try {
        const statusResponse = await axios.get(`${API_URL}/api/tasks/${jobId}`);
        const status = statusResponse.data.data;

        const statusEmoji = {
          waiting: '⏳',
          active: '🔄',
          completed: '✅',
          failed: '❌',
          delayed: '⏸️',
        };

        const emoji = statusEmoji[status.status] || '❓';
        
        process.stdout.write(`\r   ${emoji} Status: ${status.status.padEnd(12)} | Progress: ${(status.progress || 0).toString().padStart(3)}% | Time: ${attempts * 5}s`);

        if (status.status === 'completed') {
          console.log('\n');
          log('green', '✓ Job completed successfully!\n');
          
          log('cyan', 'Results:');
          console.log('   Success:', status.result.success);
          console.log('   Duration:', `${(status.result.duration / 1000).toFixed(2)}s`);
          console.log('   Fields Filled:', status.result.fillResults.filled.length);
          console.log('   Fields Failed:', status.result.fillResults.failed.length);
          console.log('   Verification:', status.result.verification.method, '-', status.result.verification.message);
          
          if (testData.options.takeScreenshots) {
            log('yellow', '\n   📸 Screenshots saved to: profiles/screenshots/');
          }
          
          completed = true;
        } else if (status.status === 'failed') {
          console.log('\n');
          log('red', '✗ Job failed!');
          log('red', `   Error: ${status.error}\n`);
          completed = true;
        }
      } catch (error) {
        console.log('\n');
        log('red', `✗ Error checking status: ${error.message}\n`);
        break;
      }
    }

    if (attempts >= maxAttempts) {
      log('red', '\n✗ Timeout waiting for job completion\n');
    }

    // Step 5: Final Queue Stats
    log('blue', '\n5. Final queue stats...');
    const finalStats = await axios.get(`${API_URL}/api/queue/stats`);
    log('green', `✓ Queue Stats:`);
    console.log(`   - Waiting: ${finalStats.data.data.waiting}`);
    console.log(`   - Active: ${finalStats.data.data.active}`);
    console.log(`   - Completed: ${finalStats.data.data.completed}`);
    console.log(`   - Failed: ${finalStats.data.data.failed}\n`);

    log('cyan', '===========================================');
    log('green', '   ✓ Integration Test Complete!');
    log('cyan', '===========================================\n');

  } catch (error) {
    log('red', `\n✗ Test failed: ${error.message}`);
    if (error.response) {
      log('red', `   Status: ${error.response.status}`);
      log('red', `   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    log('red', '\nMake sure:');
    log('yellow', '  1. Redis is running: redis-cli ping');
    log('yellow', '  2. API server is running: npm run dev:api');
    log('yellow', '  3. Worker is running: npm run dev:worker\n');
    process.exit(1);
  }
}

// Run test
testIntegration();

