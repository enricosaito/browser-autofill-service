/**
 * Simple example of submitting a form-filling task
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000';

async function submitTask() {
  try {
    // Submit a form-filling task
    const response = await axios.post(`${API_URL}/api/tasks/submit`, {
      accountId: 'demo-account-001',
      formData: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '555-123-4567',
        message: 'This is a test message from the automated form filler.',
      },
      targetUrl: 'https://example.com/contact',
      submitSelector: 'button[type="submit"]',
      successIndicators: {
        successUrl: '/thank-you',
        successMessage: 'Thank you for your submission',
      },
      options: {
        simulateHuman: true,
        takeScreenshots: true,
      },
    });

    console.log('Task submitted successfully:');
    console.log(JSON.stringify(response.data, null, 2));

    const jobId = response.data.data.jobId;

    // Poll for job status
    let completed = false;
    while (!completed) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

      const statusResponse = await axios.get(`${API_URL}/api/tasks/${jobId}`);
      const status = statusResponse.data.data;

      console.log(`\nJob Status: ${status.status}`);
      console.log(`Progress: ${status.progress || 0}%`);

      if (status.status === 'completed') {
        console.log('\n✅ Job completed successfully!');
        console.log('Result:', JSON.stringify(status.result, null, 2));
        completed = true;
      } else if (status.status === 'failed') {
        console.log('\n❌ Job failed!');
        console.log('Error:', status.error);
        completed = true;
      }
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

submitTask();

