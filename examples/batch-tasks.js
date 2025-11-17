/**
 * Example of submitting multiple tasks for different accounts
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000';

// Sample data for multiple accounts
const accounts = [
  {
    accountId: 'account-001',
    formData: {
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice.smith@example.com',
      phone: '555-0001',
    },
  },
  {
    accountId: 'account-002',
    formData: {
      firstName: 'Bob',
      lastName: 'Johnson',
      email: 'bob.johnson@example.com',
      phone: '555-0002',
    },
  },
  {
    accountId: 'account-003',
    formData: {
      firstName: 'Carol',
      lastName: 'Williams',
      email: 'carol.williams@example.com',
      phone: '555-0003',
    },
  },
];

async function submitBatchTasks() {
  try {
    console.log(`Submitting ${accounts.length} tasks...\n`);

    const jobIds = [];

    // Submit all tasks
    for (const account of accounts) {
      const response = await axios.post(`${API_URL}/api/tasks/submit`, {
        ...account,
        targetUrl: 'https://example.com/form',
        submitSelector: 'button[type="submit"]',
        options: {
          simulateHuman: true,
          takeScreenshots: false, // Disable for batch to save resources
        },
      });

      console.log(`✅ Task submitted for ${account.accountId}: ${response.data.data.jobId}`);
      jobIds.push({
        jobId: response.data.data.jobId,
        accountId: account.accountId,
      });
    }

    console.log('\n📊 Checking queue statistics...');
    const statsResponse = await axios.get(`${API_URL}/api/queue/stats`);
    console.log('Queue Stats:', JSON.stringify(statsResponse.data.data, null, 2));

    console.log('\n⏳ Waiting for all jobs to complete...\n');

    // Monitor all jobs
    let allCompleted = false;
    while (!allCompleted) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Check every 10 seconds

      const statuses = await Promise.all(
        jobIds.map(async ({ jobId, accountId }) => {
          try {
            const response = await axios.get(`${API_URL}/api/tasks/${jobId}`);
            return {
              accountId,
              status: response.data.data.status,
              progress: response.data.data.progress || 0,
            };
          } catch (error) {
            return { accountId, status: 'error', progress: 0 };
          }
        })
      );

      // Display status
      console.clear();
      console.log('Job Status Summary:');
      console.log('===================\n');
      statuses.forEach(({ accountId, status, progress }) => {
        const emoji = status === 'completed' ? '✅' : status === 'failed' ? '❌' : '⏳';
        console.log(`${emoji} ${accountId}: ${status} (${progress}%)`);
      });

      // Check if all completed or failed
      allCompleted = statuses.every(s => s.status === 'completed' || s.status === 'failed');
    }

    console.log('\n🎉 All jobs processed!');

    // Final summary
    const finalStats = await axios.get(`${API_URL}/api/queue/stats`);
    console.log('\nFinal Queue Stats:', JSON.stringify(finalStats.data.data, null, 2));

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

submitBatchTasks();

