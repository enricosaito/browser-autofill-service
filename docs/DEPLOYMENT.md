# Deployment Guide

This guide covers deploying the Browser Autofill Service to a production Ubuntu VPS.

## Prerequisites

- Ubuntu 20.04 LTS or newer
- Root or sudo access
- At least 2GB RAM (4GB recommended)
- 20GB disk space minimum

## Step-by-Step Deployment

### 1. Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Node.js (v20)

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version
```

### 3. Install Redis

```bash
# Install Redis
sudo apt install -y redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify Redis is running
redis-cli ping  # Should return PONG

# Optional: Configure Redis for production
sudo nano /etc/redis/redis.conf
# Set: maxmemory 512mb
# Set: maxmemory-policy allkeys-lru
sudo systemctl restart redis-server
```

### 4. Install PM2

```bash
sudo npm install -g pm2

# Verify installation
pm2 --version
```

### 5. Install Playwright Dependencies

```bash
# Install system dependencies for Playwright Chromium
sudo apt install -y \
  libnss3 \
  libnspr4 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libasound2
```

### 6. Create Application User (Recommended)

```bash
# Create dedicated user
sudo useradd -m -s /bin/bash autofill
sudo usermod -aG sudo autofill

# Switch to new user
sudo su - autofill
```

### 7. Clone and Setup Application

```bash
# Clone repository
cd ~
git clone https://github.com/yourusername/browser-autofill-service.git
cd browser-autofill-service

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Create necessary directories
mkdir -p logs profiles
```

### 8. Configure Environment

```bash
# Copy and edit environment file
cp .env.example .env
nano .env
```

**Production .env settings:**
```env
PORT=3000
NODE_ENV=production

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

HEADLESS=true
BROWSER_TIMEOUT=30000
NAVIGATION_TIMEOUT=30000

# Set your actual form target
TARGET_URL=https://yourwebsite.com/form
FORM_SUBMIT_SELECTOR=button[type="submit"]

MAX_RETRIES=3
RETRY_DELAY=5000

PROFILES_DIR=./profiles
LOG_LEVEL=info
LOG_FILE=./logs/app.log

WORKER_CONCURRENCY=1
```

### 9. Start with PM2

```bash
# Start all services
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command it outputs
```

### 10. Configure Firewall (Optional)

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow API port (if accessing externally)
sudo ufw allow 3000/tcp

# Enable firewall
sudo ufw enable
```

### 11. Setup Nginx Reverse Proxy (Optional)

If you want to access the API through port 80/443:

```bash
# Install Nginx
sudo apt install -y nginx

# Create configuration
sudo nano /etc/nginx/sites-available/autofill
```

**Nginx configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/autofill /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 12. SSL with Let's Encrypt (Optional)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically
```

## Monitoring and Maintenance

### View Logs

```bash
# PM2 logs
pm2 logs

# Application logs
tail -f logs/app.log
tail -f logs/error.log

# PM2 specific logs
tail -f logs/pm2-api-out.log
tail -f logs/pm2-worker-out.log
```

### Monitor Resources

```bash
# PM2 monitoring
pm2 monit

# System resources
htop
```

### Restart Services

```bash
# Restart all
pm2 restart ecosystem.config.js

# Restart specific service
pm2 restart autofill-api
pm2 restart autofill-worker

# Reload (zero-downtime)
pm2 reload ecosystem.config.js
```

### Update Application

```bash
cd ~/browser-autofill-service

# Pull latest changes
git pull

# Install new dependencies
npm install

# Restart services
pm2 restart ecosystem.config.js
```

### Cleanup Old Data

```bash
# Clean old browser profiles
curl -X POST http://localhost:3000/api/profiles/cleanup \
  -H "Content-Type: application/json" \
  -d '{"daysOld": 30}'

# Clean Redis old jobs
redis-cli
> DEL bull:form-filling:*
```

## Troubleshooting

### Browser Launch Issues

```bash
# Check Playwright installation
npx playwright install --dry-run chromium

# Reinstall browsers
npx playwright install --force chromium

# Check dependencies
ldd ~/.cache/ms-playwright/chromium-*/chrome-linux/chrome
```

### Redis Connection Issues

```bash
# Check Redis is running
sudo systemctl status redis-server

# Test connection
redis-cli ping

# Check logs
sudo tail -f /var/log/redis/redis-server.log
```

### Worker Not Processing Jobs

```bash
# Check worker status
pm2 status autofill-worker

# View worker logs
pm2 logs autofill-worker

# Restart worker
pm2 restart autofill-worker
```

### High Memory Usage

```bash
# Monitor memory
pm2 monit

# Set memory limit in ecosystem.config.js
max_memory_restart: '1G'

# Clean browser profiles
rm -rf profiles/*
```

## Security Recommendations

1. **Firewall**: Only allow necessary ports
2. **SSH Keys**: Disable password authentication
3. **User Permissions**: Run as non-root user
4. **Environment Variables**: Never commit .env file
5. **API Authentication**: Add authentication middleware for production
6. **Rate Limiting**: Implement rate limiting on API endpoints
7. **Redis Password**: Set Redis password in production
8. **Regular Updates**: Keep system and dependencies updated

## Scaling

### Vertical Scaling (Same Server)

Increase worker concurrency:
```javascript
// ecosystem.config.js
{
  name: 'autofill-worker',
  instances: 3  // Run 3 worker processes
}
```

### Horizontal Scaling (Multiple Servers)

1. **Dedicated Redis Server**: Move Redis to separate server
2. **Multiple Workers**: Deploy workers on separate servers
3. **API Load Balancer**: Use Nginx to load balance API requests
4. **Shared Storage**: Use network storage for profiles if needed

## Backup

```bash
# Backup profiles
tar -czf profiles-backup-$(date +%Y%m%d).tar.gz profiles/

# Backup Redis
redis-cli BGSAVE
cp /var/lib/redis/dump.rdb ~/backups/redis-$(date +%Y%m%d).rdb

# Backup logs
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/
```

## Support

For issues during deployment:
1. Check logs: `pm2 logs`
2. Check system resources: `htop`
3. Verify services: `pm2 status`
4. Review configuration: `.env` and `ecosystem.config.js`

