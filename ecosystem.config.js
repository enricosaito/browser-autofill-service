/**
 * PM2 Ecosystem Configuration
 * 
 * Usage:
 * - Start all: pm2 start ecosystem.config.js
 * - Start API only: pm2 start ecosystem.config.js --only api
 * - Start worker only: pm2 start ecosystem.config.js --only worker
 * - Stop all: pm2 stop ecosystem.config.js
 * - Restart all: pm2 restart ecosystem.config.js
 * - View logs: pm2 logs
 * - Monitor: pm2 monit
 */

module.exports = {
  apps: [
    {
      name: 'autofill-api',
      script: './src/api/server.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/pm2-api-error.log',
      out_file: './logs/pm2-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
    },
    {
      name: 'autofill-worker',
      script: './src/workers/worker.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/pm2-worker-error.log',
      out_file: './logs/pm2-worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      kill_timeout: 30000, // Give time for graceful shutdown
    },
  ],
};

