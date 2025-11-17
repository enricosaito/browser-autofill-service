# Quick Start Guide

Get the Browser Autofill Service up and running in 5 minutes!

## Prerequisites

Before you begin, ensure you have:

- ✅ Node.js v20+ installed
- ✅ Redis running locally
- ✅ Git (for cloning)

### Check Prerequisites

```bash
# Check Node.js version
node --version  # Should be v20.x.x or higher

# Check if Redis is running
redis-cli ping  # Should return "PONG"
```

### Install Redis (if needed)

**macOS:**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
```

**Windows:**
```bash
# Use WSL or Docker
docker run -d -p 6379:6379 redis:alpine
```

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/browser-autofill-service.git
cd browser-autofill-service
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Install Playwright Browser

```bash
npx playwright install chromium
```

### 4. Configure Environment

```bash
# The .env file is already created, edit if needed
nano .env
```

**Minimal .env for testing:**
```env
PORT=3000
NODE_ENV=development
REDIS_HOST=localhost
REDIS_PORT=6379
HEADLESS=false
TARGET_URL=https://www.example.com/form
```

## Running the Service

### Option 1: Development Mode (Recommended for Testing)

**Terminal 1 - Start API Server:**
```bash
npm run dev:api
```

You should see:
```
info: API server started on port 3000
info: Health check: http://localhost:3000/health
```

**Terminal 2 - Start Worker:**
```bash
npm run dev:worker
```

You should see:
```
info: Starting form filling worker
info: Worker started successfully
```

### Option 2: Production Mode with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start all services
npm run pm2:start

# Check status
npm run pm2:logs
```

## Test the Service

### 1. Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "uptime": 5.2
}
```

### 2. Submit a Test Task

```bash
curl -X POST http://localhost:3000/api/tasks/submit \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "test-account",
    "formData": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com"
    }
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "jobId": "test-account-1705315200000",
    "accountId": "test-account",
    "status": "queued",
    "message": "Task added to queue successfully"
  }
}
```

### 3. Check Job Status

```bash
# Replace JOB_ID with the actual jobId from step 2
curl http://localhost:3000/api/tasks/JOB_ID
```

### 4. Watch It Work!

Since you set `HEADLESS=false`, you'll see a browser window open and the form being filled automatically!

## Using the Example Scripts

We've included ready-to-use example scripts:

### Simple Task Example

```bash
cd examples
npm install
npm run simple
```

This will:
1. Submit a form-filling task
2. Poll for status updates
3. Display the final result

### Batch Tasks Example

```bash
npm run batch
```

This will:
1. Submit multiple tasks for different accounts
2. Monitor all jobs in real-time
3. Display completion summary

## Common Issues & Solutions

### ❌ "Redis connection failed"

**Problem:** Redis is not running

**Solution:**
```bash
# Start Redis
redis-server

# Or on Ubuntu
sudo systemctl start redis-server
```

### ❌ "Browser launch failed"

**Problem:** Playwright browsers not installed

**Solution:**
```bash
npx playwright install chromium
npx playwright install-deps  # Install system dependencies
```

### ❌ Port 3000 already in use

**Problem:** Another service is using port 3000

**Solution:**
```bash
# Change port in .env
PORT=3001

# Or find and kill the process
lsof -ti:3000 | xargs kill -9  # macOS/Linux
```

### ❌ "Cannot find module"

**Problem:** Dependencies not installed

**Solution:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

### 1. Configure Your Target Form

Edit `.env` to point to your actual form:

```env
TARGET_URL=https://yourwebsite.com/contact
FORM_SUBMIT_SELECTOR=button[type="submit"]
```

### 2. Customize Form Data

When submitting tasks, provide data matching your form fields:

```json
{
  "accountId": "user123",
  "formData": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "555-1234",
    "message": "Your custom message",
    "company": "Acme Corp",
    // Add any fields your form needs
  }
}
```

### 3. Enable Screenshots (Debugging)

```json
{
  "options": {
    "takeScreenshots": true
  }
}
```

Screenshots will be saved to `profiles/screenshots/`

### 4. Set Up Success Verification

Tell the system how to verify successful submission:

```json
{
  "successIndicators": {
    "successUrl": "/thank-you",
    "successMessage": "Form submitted successfully",
    "successSelector": ".success-notification"
  }
}
```

### 5. Use Multiple Accounts

The service supports multiple isolated browser profiles:

```bash
# Account 1
curl -X POST http://localhost:3000/api/tasks/submit \
  -H "Content-Type: application/json" \
  -d '{"accountId": "account-001", "formData": {...}}'

# Account 2 (will use separate browser profile)
curl -X POST http://localhost:3000/api/tasks/submit \
  -H "Content-Type: application/json" \
  -d '{"accountId": "account-002", "formData": {...}}'
```

## Project Structure Quick Reference

```
browser-autofill-service/
├── src/
│   ├── api/server.js          ← API endpoints
│   ├── workers/worker.js      ← Job processor
│   ├── browser/
│   │   ├── browsermanager.js  ← Browser management
│   │   └── formlogic.js       ← Form filling logic
│   ├── queue/queue.js         ← Job queue
│   └── utils/                 ← Helper utilities
├── examples/                  ← Ready-to-run examples
├── docs/                      ← Documentation
├── .env                       ← Configuration
└── ecosystem.config.js        ← PM2 configuration
```

## Useful Commands

```bash
# Development
npm run dev:api          # Start API server
npm run dev:worker       # Start worker

# Production (PM2)
npm run pm2:start        # Start all services
npm run pm2:stop         # Stop all services
npm run pm2:restart      # Restart all services
npm run pm2:logs         # View logs
npm run pm2:monit        # Monitor dashboard

# Monitoring
curl http://localhost:3000/api/queue/stats    # Queue statistics
curl http://localhost:3000/api/profiles       # List profiles

# Cleanup
curl -X POST http://localhost:3000/api/profiles/cleanup \
  -H "Content-Type: application/json" \
  -d '{"daysOld": 7}'
```

## Learning Resources

- 📖 **Full Documentation**: See `README.md`
- 🏗️ **Architecture**: See `docs/ARCHITECTURE.md`
- 🚀 **Deployment Guide**: See `docs/DEPLOYMENT.md`
- 📡 **API Reference**: See `docs/API.md`
- 💡 **Examples**: Check `examples/` directory

## Getting Help

1. **Check logs**: `npm run pm2:logs` or `tail -f logs/app.log`
2. **Enable debug mode**: Set `NODE_ENV=development` and `HEADLESS=false`
3. **Review screenshots**: Look in `profiles/screenshots/`
4. **Open an issue**: GitHub issues page

## What's Next?

Now that you have the service running:

1. ✅ Test with your actual target form
2. ✅ Set up proper success verification
3. ✅ Configure proxy support (if needed)
4. ✅ Enable human-like behavior simulation
5. ✅ Deploy to your VPS (see `docs/DEPLOYMENT.md`)

Happy automating! 🚀

