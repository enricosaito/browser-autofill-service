/**
 * CartPanda Checkout Test Script
 * 
 * This script tests the CartPanda automation by submitting a test checkout
 * and monitoring its progress.
 * 
 * Usage:
 *   node test-cartpanda.js
 */

const axios = require('axios');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || 'your-api-key-here';

// Test data - REPLACE WITH YOUR TEST DATA
const testCheckout = {
  accountId: `test-${Date.now()}`,
  formData: {
    // Basic info
    email: 'test@example.com',
    fullName: 'João Silva',  // or use "nome"
    phone: '11999999999',     // or use "telefone"
    
    // Payment info
    cardNumber: '4111111111111111',  // Test card (Stripe test mode)
    cardExpiry: '12/25',             // MM/YY format
    cvc: '123',
    
    // Optional: cardholder name (uses fullName if not provided)
    // cardholderName: 'João Silva',
  },
  // The TARGET_URL from your .env will be used if you don't specify this
  // targetUrl: 'https://your-cartpanda-url-here',
};

// API client
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  },
});

async function submitCheckout() {
  try {
    console.log('🚀 Submitting CartPanda checkout test...\n');
    console.log('📋 Test Data:');
    console.log('   Email:', testCheckout.formData.email);
    console.log('   Name:', testCheckout.formData.fullName);
    console.log('   Phone:', testCheckout.formData.phone);
    console.log('   Card:', testCheckout.formData.cardNumber.slice(0, 4) + '****');
    console.log('');
    
    const { data } = await api.post('/api/tasks/submit', testCheckout);
    
    if (!data.success) {
      console.error('❌ Failed to submit:', data.error);
      return null;
    }
    
    console.log('✅ Checkout submitted successfully!');
    console.log('📝 Job ID:', data.data.jobId);
    console.log('');
    
    return data.data.jobId;
  } catch (error) {
    console.error('❌ Error submitting checkout:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
    return null;
  }
}

async function checkStatus(jobId) {
  try {
    const { data } = await api.get(`/api/tasks/${jobId}`);
    return data.data;
  } catch (error) {
    console.error('❌ Error checking status:', error.message);
    return null;
  }
}

async function monitorJob(jobId) {
  console.log('👀 Monitoring job progress...\n');
  
  let lastProgress = 0;
  
  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      const status = await checkStatus(jobId);
      
      if (!status) {
        clearInterval(interval);
        resolve({ success: false, error: 'Could not check status' });
        return;
      }
      
      // Show progress updates
      if (status.progress !== lastProgress) {
        console.log(`📊 Progress: ${status.progress}% - Status: ${status.status}`);
        lastProgress = status.progress;
      }
      
      // Check if completed
      if (status.status === 'completed') {
        clearInterval(interval);
        console.log('\n✅ CHECKOUT COMPLETED SUCCESSFULLY! 🎉\n');
        console.log('📦 Result:');
        console.log(JSON.stringify(status.result, null, 2));
        
        if (status.result.orderNumber) {
          console.log('\n🎫 Order Number:', status.result.orderNumber);
        }
        
        resolve({ success: true, result: status.result });
      }
      
      // Check if failed
      if (status.status === 'failed') {
        clearInterval(interval);
        console.log('\n❌ CHECKOUT FAILED\n');
        console.log('Error:', status.error);
        
        if (status.result) {
          console.log('Details:', JSON.stringify(status.result, null, 2));
        }
        
        resolve({ success: false, error: status.error });
      }
    }, 3000); // Check every 3 seconds
  });
}

// Main execution
async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('    CartPanda Checkout Automation Test');
  console.log('═══════════════════════════════════════════════\n');
  
  // Check API connectivity
  try {
    const { data } = await api.get('/health');
    console.log('✅ API Server: Connected');
    console.log('   Status:', data.status);
    console.log('   Uptime:', Math.floor(data.uptime), 'seconds\n');
  } catch (error) {
    console.error('❌ Cannot connect to API server at:', API_URL);
    console.error('   Make sure the server is running and API_KEY is correct\n');
    process.exit(1);
  }
  
  // Submit checkout
  const jobId = await submitCheckout();
  
  if (!jobId) {
    console.error('\n❌ Test failed - could not submit checkout\n');
    process.exit(1);
  }
  
  // Monitor progress
  const result = await monitorJob(jobId);
  
  // Final summary
  console.log('\n═══════════════════════════════════════════════');
  console.log('                TEST SUMMARY');
  console.log('═══════════════════════════════════════════════\n');
  
  if (result.success) {
    console.log('✅ Status: SUCCESS');
    console.log('🎉 The CartPanda automation is working perfectly!');
  } else {
    console.log('❌ Status: FAILED');
    console.log('⚠️  Check the logs for details:');
    console.log('   pm2 logs autofill-worker');
  }
  
  console.log('\n═══════════════════════════════════════════════\n');
}

// Run the test
main().catch(error => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});

