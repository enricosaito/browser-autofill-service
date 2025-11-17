const { Queue } = require('bullmq');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Task Queue Manager using BullMQ
 */
class QueueManager {
  constructor() {
    this.connection = {
      host: config.redis.host,
      port: config.redis.port,
      ...(config.redis.password && { password: config.redis.password }),
    };
    
    this.formQueue = new Queue('form-filling', {
      connection: this.connection,
      defaultJobOptions: {
        attempts: config.retry.maxRetries,
        backoff: {
          type: 'exponential',
          delay: config.retry.retryDelay,
        },
        removeOnComplete: {
          age: 24 * 3600, // Keep completed jobs for 24 hours
          count: 1000,
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
      },
    });
    
    logger.info('Queue manager initialized');
  }
  
  /**
   * Add a form filling task to the queue
   * @param {Object} taskData - Task data
   * @returns {Promise<Job>}
   */
  async addTask(taskData) {
    try {
      const {
        accountId,
        formData,
        targetUrl,
        submitSelector,
        successIndicators,
        priority = 1,
        options = {},
      } = taskData;
      
      // Validate required fields
      if (!accountId) {
        throw new Error('accountId is required');
      }
      
      if (!formData || typeof formData !== 'object') {
        throw new Error('formData must be an object');
      }
      
      const job = await this.formQueue.add(
        'fill-form',
        {
          accountId,
          formData,
          targetUrl: targetUrl || config.form.targetUrl,
          submitSelector: submitSelector || config.form.submitSelector,
          successIndicators: successIndicators || {},
          options,
          timestamp: Date.now(),
        },
        {
          priority,
          jobId: `${accountId}-${Date.now()}`, // Unique job ID
        }
      );
      
      logger.info(`Task added to queue: ${job.id} for account: ${accountId}`);
      
      return job;
    } catch (error) {
      logger.error('Failed to add task to queue:', error);
      throw error;
    }
  }
  
  /**
   * Get job status
   * @param {string} jobId
   * @returns {Promise<Object>}
   */
  async getJobStatus(jobId) {
    try {
      const job = await this.formQueue.getJob(jobId);
      
      if (!job) {
        return { status: 'not_found' };
      }
      
      const state = await job.getState();
      const progress = job.progress;
      const returnValue = job.returnvalue;
      const failedReason = job.failedReason;
      
      return {
        id: job.id,
        status: state,
        progress,
        result: returnValue,
        error: failedReason,
        data: job.data,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        attempts: job.attemptsMade,
      };
    } catch (error) {
      logger.error(`Failed to get job status for ${jobId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get all jobs by account ID
   * @param {string} accountId
   * @returns {Promise<Array>}
   */
  async getJobsByAccount(accountId) {
    try {
      const jobs = await this.formQueue.getJobs(['waiting', 'active', 'completed', 'failed', 'delayed']);
      
      const accountJobs = jobs.filter(job => job.data.accountId === accountId);
      
      return Promise.all(accountJobs.map(async job => {
        const state = await job.getState();
        return {
          id: job.id,
          status: state,
          progress: job.progress,
          timestamp: job.timestamp,
          data: job.data,
        };
      }));
    } catch (error) {
      logger.error(`Failed to get jobs for account ${accountId}:`, error);
      throw error;
    }
  }
  
  /**
   * Cancel a job
   * @param {string} jobId
   * @returns {Promise<boolean>}
   */
  async cancelJob(jobId) {
    try {
      const job = await this.formQueue.getJob(jobId);
      
      if (!job) {
        return false;
      }
      
      await job.remove();
      logger.info(`Job ${jobId} cancelled`);
      
      return true;
    } catch (error) {
      logger.error(`Failed to cancel job ${jobId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get queue statistics
   * @returns {Promise<Object>}
   */
  async getQueueStats() {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.formQueue.getWaitingCount(),
        this.formQueue.getActiveCount(),
        this.formQueue.getCompletedCount(),
        this.formQueue.getFailedCount(),
        this.formQueue.getDelayedCount(),
      ]);
      
      return {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed,
      };
    } catch (error) {
      logger.error('Failed to get queue stats:', error);
      throw error;
    }
  }
  
  /**
   * Clean old jobs
   * @param {number} grace - Grace period in milliseconds
   * @returns {Promise<void>}
   */
  async cleanOldJobs(grace = 24 * 60 * 60 * 1000) {
    try {
      await this.formQueue.clean(grace, 100, 'completed');
      await this.formQueue.clean(grace * 7, 100, 'failed'); // Keep failed jobs longer
      
      logger.info('Old jobs cleaned');
    } catch (error) {
      logger.error('Failed to clean old jobs:', error);
    }
  }
  
  /**
   * Close queue connections
   */
  async close() {
    await this.formQueue.close();
    logger.info('Queue closed');
  }
}

module.exports = new QueueManager();

