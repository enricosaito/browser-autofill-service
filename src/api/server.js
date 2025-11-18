const express = require('express');
const config = require('../config');
const logger = require('../utils/logger');
const queueManager = require('../queue/queue');
const profileManager = require('../utils/profiles');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration for frontend (Vercel)
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173', // Vite dev
    'http://localhost:3001',
    process.env.FRONTEND_URL || ''
  ].filter(Boolean);
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || allowedOrigins.includes('')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// API Key authentication middleware
const authenticateAPIKey = (req, res, next) => {
  // Skip auth for health check
  if (req.path === '/health') {
    return next();
  }
  
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (!apiKey) {
    logger.warn('API request without API key', { ip: req.ip, path: req.path });
    return res.status(401).json({
      success: false,
      error: 'API key required',
    });
  }
  
  // Check against environment variable
  const validApiKey = process.env.API_KEY;
  
  if (!validApiKey) {
    logger.error('API_KEY not configured in environment');
    return res.status(500).json({
      success: false,
      error: 'Server configuration error',
    });
  }
  
  if (apiKey !== validApiKey) {
    logger.warn('Invalid API key attempt', { ip: req.ip, path: req.path });
    return res.status(403).json({
      success: false,
      error: 'Invalid API key',
    });
  }
  
  next();
};

// Apply authentication to all API routes
app.use('/api', authenticateAPIKey);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Queue statistics endpoint
app.get('/api/queue/stats', async (req, res) => {
  try {
    const stats = await queueManager.getQueueStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Failed to get queue stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve queue statistics',
    });
  }
});

// Submit form filling task endpoint
app.post('/api/tasks/submit', async (req, res) => {
  try {
    const {
      accountId,
      formData,
      targetUrl,
      submitSelector,
      successIndicators,
      priority,
      options,
    } = req.body;
    
    // Validate required fields
    if (!accountId) {
      return res.status(400).json({
        success: false,
        error: 'accountId is required',
      });
    }
    
    if (!formData || typeof formData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'formData must be an object',
      });
    }
    
    // Add task to queue
    const job = await queueManager.addTask({
      accountId,
      formData,
      targetUrl,
      submitSelector,
      successIndicators,
      priority,
      options,
    });
    
    res.json({
      success: true,
      data: {
        jobId: job.id,
        accountId,
        status: 'queued',
        message: 'Task added to queue successfully',
      },
    });
    
  } catch (error) {
    logger.error('Failed to submit task:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get job status endpoint
app.get('/api/tasks/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const status = await queueManager.getJobStatus(jobId);
    
    if (status.status === 'not_found') {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }
    
    res.json({
      success: true,
      data: status,
    });
    
  } catch (error) {
    logger.error('Failed to get job status:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get all jobs for an account
app.get('/api/tasks/account/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    
    const jobs = await queueManager.getJobsByAccount(accountId);
    
    res.json({
      success: true,
      data: {
        accountId,
        jobs,
        count: jobs.length,
      },
    });
    
  } catch (error) {
    logger.error('Failed to get account jobs:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Cancel job endpoint
app.delete('/api/tasks/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const cancelled = await queueManager.cancelJob(jobId);
    
    if (!cancelled) {
      return res.status(404).json({
        success: false,
        error: 'Job not found or already completed',
      });
    }
    
    res.json({
      success: true,
      message: 'Job cancelled successfully',
    });
    
  } catch (error) {
    logger.error('Failed to cancel job:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Profile management endpoints
app.get('/api/profiles', (req, res) => {
  try {
    const profiles = profileManager.listProfiles();
    
    res.json({
      success: true,
      data: {
        profiles,
        count: profiles.length,
      },
    });
  } catch (error) {
    logger.error('Failed to list profiles:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.delete('/api/profiles/:accountId', (req, res) => {
  try {
    const { accountId } = req.params;
    
    profileManager.deleteProfile(accountId);
    
    res.json({
      success: true,
      message: `Profile ${accountId} deleted successfully`,
    });
  } catch (error) {
    logger.error('Failed to delete profile:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post('/api/profiles/cleanup', (req, res) => {
  try {
    const { daysOld } = req.body;
    
    const cleaned = profileManager.cleanupOldProfiles(daysOld || 30);
    
    res.json({
      success: true,
      message: `Cleaned up ${cleaned} old profiles`,
      count: cleaned,
    });
  } catch (error) {
    logger.error('Failed to cleanup profiles:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Start server
function startServer() {
  const port = config.server.port;
  
  app.listen(port, () => {
    logger.info(`API server started on port ${port}`);
    logger.info(`Environment: ${config.server.nodeEnv}`);
    logger.info(`Health check: http://localhost:${port}/health`);
  });
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, closing server...');
    await queueManager.close();
    process.exit(0);
  });
}

// Start if run directly
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };

