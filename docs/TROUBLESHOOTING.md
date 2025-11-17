# Troubleshooting Guide

Common issues and their solutions.

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Redis Connection Issues](#redis-connection-issues)
3. [Browser Issues](#browser-issues)
4. [Form Filling Issues](#form-filling-issues)
5. [Performance Issues](#performance-issues)
6. [PM2 Issues](#pm2-issues)
7. [Network Issues](#network-issues)
8. [Debugging Tips](#debugging-tips)

---

## Installation Issues

### Error: "Cannot find module"

**Symptoms:**
```
Error: Cannot find module 'playwright'
```

**Solutions:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Or try npm cache clean
npm cache clean --force
npm install
```

### Error: "Playwright browsers not installed"

**Symptoms:**
```
browserType.launch: Executable doesn't exist
```

**Solutions:**
```bash
# Install browsers
npx playwright install chromium

# Install system dependencies (Linux)
npx playwright install-deps

# Manual installation
npx playwright install --force chromium
```

### Error: "Permission denied"

**Symptoms:**
```
EACCES: permission denied, mkdir '/profiles'
```

**Solutions:**
```bash
# Fix permissions
sudo chown -R $USER:$USER .
chmod -R 755 .

# Or run with sudo (not recommended)
sudo npm install
```

---

## Redis Connection Issues

### Error: "Redis connection refused"

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Diagnosis:**
```bash
# Check if Redis is running
redis-cli ping

# Check Redis process
ps aux | grep redis
```

**Solutions:**

**On macOS:**
```bash
brew services start redis
```

**On Linux:**
```bash
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**Using Docker:**
```bash
docker run -d --name redis -p 6379:6379 redis:alpine
```

**Check Redis Configuration:**
```bash
# Test connection
redis-cli ping

# Check Redis logs
sudo tail -f /var/log/redis/redis-server.log
```

### Error: "Redis authentication failed"

**Symptoms:**
```
Error: NOAUTH Authentication required
```

**Solutions:**
```bash
# Set password in .env
REDIS_PASSWORD=your_redis_password

# Or disable password in Redis
# Edit /etc/redis/redis.conf
# Comment out: requirepass yourpassword
sudo systemctl restart redis-server
```

### Redis Memory Issues

**Symptoms:**
```
Error: OOM command not allowed when used memory > 'maxmemory'
```

**Solutions:**
```bash
# Edit Redis config
sudo nano /etc/redis/redis.conf

# Add/modify these lines:
maxmemory 512mb
maxmemory-policy allkeys-lru

# Restart Redis
sudo systemctl restart redis-server
```

---

## Browser Issues

### Error: "Browser launch failed"

**Symptoms:**
```
browserType.launch: Protocol error: Connection closed
```

**Diagnosis:**
```bash
# Test Playwright directly
npx playwright test

# Check system resources
free -h  # Memory
df -h    # Disk space
```

**Solutions:**

**1. Install system dependencies:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y \
  libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
  libcups2 libdrm2 libxkbcommon0 libxcomposite1 \
  libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2

# Check missing libraries
ldd ~/.cache/ms-playwright/chromium-*/chrome-linux/chrome
```

**2. Increase system resources:**
```bash
# Increase shared memory (Docker/VPS)
docker run --shm-size=2gb ...

# Or edit /etc/fstab
tmpfs /dev/shm tmpfs defaults,size=2g 0 0
```

**3. Run with different launch options:**
```javascript
// In browsermanager.js
args: [
  '--disable-dev-shm-usage',  // Use /tmp instead of /dev/shm
  '--no-sandbox',             // Disable sandbox (use cautiously)
]
```

### Error: "Browser timeout"

**Symptoms:**
```
TimeoutError: page.goto: Timeout 30000ms exceeded
```

**Solutions:**

**1. Increase timeout:**
```bash
# In .env
NAVIGATION_TIMEOUT=60000
BROWSER_TIMEOUT=60000
```

**2. Check network:**
```bash
# Test target URL
curl -I https://your-target-url.com

# Check DNS
nslookup your-target-url.com
```

**3. Disable wait conditions:**
```javascript
// In worker.js, change:
await page.goto(targetUrl, {
  waitUntil: 'domcontentloaded',  // Instead of 'networkidle'
  timeout: 60000,
});
```

### Browser Crashes

**Symptoms:**
```
Protocol error: Target closed
```

**Solutions:**

**1. Check system resources:**
```bash
# Monitor memory usage
free -m

# Monitor during job
watch -n 1 'ps aux | grep chrome'
```

**2. Reduce memory usage:**
```javascript
// In ecosystem.config.js
max_memory_restart: '500M'  // Restart if memory exceeds 500MB

// Or reduce browser instances
WORKER_CONCURRENCY=1
```

**3. Clean browser profiles:**
```bash
# Delete old profiles
curl -X POST http://localhost:3000/api/profiles/cleanup \
  -H "Content-Type: application/json" \
  -d '{"daysOld": 7}'

# Or manually
rm -rf profiles/*
```

---

## Form Filling Issues

### Issue: "Form fields not detected"

**Symptoms:**
```
Detected 0 form fields
```

**Diagnosis:**
```bash
# Enable screenshots
# In task options:
"options": { "takeScreenshots": true }

# Check screenshots
ls -lh profiles/screenshots/
```

**Solutions:**

**1. Wait for dynamic content:**
```javascript
// Add delay before detection
await sleep(5000);  // Wait 5 seconds for JS to load
```

**2. Check selectors:**
```javascript
// Use browser console to test
await page.evaluate(() => {
  console.log('Inputs:', document.querySelectorAll('input').length);
  console.log('Forms:', document.querySelectorAll('form').length);
});
```

**3. Handle iframes:**
```javascript
// If form is in iframe
const frame = page.frame({ name: 'form-frame' });
await formLogic.fillForm(frame, formData);
```

### Issue: "Fields filled with wrong data"

**Symptoms:**
```
Email entered into phone field
```

**Solutions:**

**1. Use exact field names:**
```json
{
  "formData": {
    "email": "user@example.com",  // Match exact field name
    "phone": "555-1234"
  }
}
```

**2. Check field detection log:**
```bash
# Look for detected field names
tail -f logs/app.log | grep "Detected.*form fields"
```

**3. Use CSS selectors:**
```javascript
// Directly target specific fields
"formData": {
  "#email-input": "user@example.com",
  "[name='phone']": "555-1234"
}
```

### Issue: "CAPTCHA detected"

**Symptoms:**
```
CAPTCHA detected - manual intervention required
```

**Solutions:**

**1. This is expected behavior** - the service stops to avoid being blocked

**2. Handle manually:**
- Set `HEADLESS=false`
- System will pause at CAPTCHA
- Solve manually
- Continue automation

**3. Implement CAPTCHA solving:**
```javascript
// Add CAPTCHA solving service integration
// (2Captcha, Anti-Captcha, etc.)
```

**4. Avoid CAPTCHAs:**
- Use better proxies
- Reduce request rate
- Improve stealth techniques
- Use cookies from previous successful sessions

### Issue: "Form submission not verified"

**Symptoms:**
```
Unable to determine submission status
```

**Solutions:**

**1. Set proper success indicators:**
```json
{
  "successIndicators": {
    "successUrl": "/thank-you",
    "successMessage": "successfully submitted",
    "successSelector": ".success-banner"
  }
}
```

**2. Increase wait time:**
```javascript
// In formlogic.js verifySubmission
await sleep(5000);  // Wait longer for redirect
```

**3. Check page manually:**
```bash
# Enable screenshots
# Check after-submit screenshot
```

---

## Performance Issues

### Issue: "Jobs processing slowly"

**Diagnosis:**
```bash
# Check queue stats
curl http://localhost:3000/api/queue/stats

# Check system resources
htop
```

**Solutions:**

**1. Increase worker concurrency:**
```bash
# In .env
WORKER_CONCURRENCY=3
```

**2. Run multiple workers:**
```javascript
// In ecosystem.config.js
{
  name: 'autofill-worker',
  instances: 2
}
```

**3. Optimize delays:**
```javascript
// Reduce human simulation delays for speed
"options": {
  "simulateHuman": false  // Faster but less realistic
}
```

### Issue: "High memory usage"

**Diagnosis:**
```bash
# Monitor memory
pm2 monit

# Or
watch -n 1 'ps aux | grep node'
```

**Solutions:**

**1. Set memory limits:**
```javascript
// ecosystem.config.js
max_memory_restart: '500M'
```

**2. Clean up profiles:**
```bash
# Regular cleanup
0 0 * * * curl -X POST http://localhost:3000/api/profiles/cleanup -d '{"daysOld":7}'
```

**3. Disable screenshots:**
```json
{
  "options": {
    "takeScreenshots": false
  }
}
```

### Issue: "Disk space filling up"

**Diagnosis:**
```bash
# Check disk usage
df -h

# Check profile sizes
du -sh profiles/*
```

**Solutions:**
```bash
# Clean profiles
rm -rf profiles/*

# Clean logs
truncate -s 0 logs/*.log

# Set up log rotation
sudo apt install logrotate
```

---

## PM2 Issues

### Issue: "PM2 not starting"

**Solutions:**
```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs --lines 100

# Delete PM2 processes and restart
pm2 delete all
pm2 start ecosystem.config.js

# Check PM2 configuration
pm2 show autofill-worker
```

### Issue: "Worker keeps restarting"

**Symptoms:**
```
Worker in restart loop
```

**Diagnosis:**
```bash
# Check error logs
pm2 logs autofill-worker --err --lines 50

# Check restart count
pm2 status
```

**Solutions:**
```bash
# Fix the error shown in logs
# Then restart
pm2 restart autofill-worker

# Prevent restart loop
# In ecosystem.config.js:
max_restarts: 10,
min_uptime: '30s'
```

---

## Network Issues

### Issue: "Proxy connection failed"

**Symptoms:**
```
net::ERR_PROXY_CONNECTION_FAILED
```

**Solutions:**
```bash
# Test proxy
curl -x http://proxy.example.com:8080 https://www.google.com

# Check proxy credentials
# In .env:
PROXY_SERVER=http://proxy.example.com:8080
PROXY_USERNAME=user
PROXY_PASSWORD=pass

# Or disable proxy
USE_PROXY=false
```

### Issue: "Target site blocking requests"

**Symptoms:**
```
403 Forbidden
503 Service Unavailable
```

**Solutions:**

**1. Improve stealth:**
```bash
# Ensure headless detection prevention is working
# Check user agent is realistic
```

**2. Use proxies:**
```bash
USE_PROXY=true
PROXY_SERVER=http://your-proxy:8080
```

**3. Reduce rate:**
```javascript
// In queue.js
limiter: {
  max: 5,        // Only 5 jobs
  duration: 60000  // per minute
}
```

**4. Add delays:**
```javascript
// Random delay between jobs
await sleep(randomDelay(5000, 15000));
```

---

## Debugging Tips

### Enable Debug Mode

```bash
# In .env
NODE_ENV=development
LOG_LEVEL=debug
HEADLESS=false
```

### Take Screenshots

```json
{
  "options": {
    "takeScreenshots": true
  }
}
```

### Log Browser Console

```javascript
// In worker.js
page.on('console', msg => {
  logger.info('Browser console:', msg.text());
});
```

### Inspect Network Requests

```javascript
// In worker.js
page.on('request', request => {
  logger.info('Request:', request.url());
});

page.on('response', response => {
  logger.info('Response:', response.url(), response.status());
});
```

### Test Selectors

```javascript
// In browser console or page.evaluate
await page.evaluate(() => {
  // Test selector
  console.log(document.querySelector('button[type="submit"]'));
  
  // List all form fields
  document.querySelectorAll('input, select, textarea').forEach(el => {
    console.log(el.tagName, el.type, el.name, el.id);
  });
});
```

### Monitor Jobs

```bash
# Watch queue stats
watch -n 2 'curl -s http://localhost:3000/api/queue/stats | jq'

# Watch logs
tail -f logs/app.log | grep "Job"
```

### Check Job Details

```bash
# Get job status
curl http://localhost:3000/api/tasks/JOB_ID | jq

# Get all jobs for account
curl http://localhost:3000/api/tasks/account/ACCOUNT_ID | jq
```

---

## Still Having Issues?

1. **Check logs thoroughly:**
   ```bash
   # Application logs
   tail -f logs/app.log
   tail -f logs/error.log
   
   # PM2 logs
   pm2 logs --lines 200
   ```

2. **Enable full debugging:**
   ```bash
   NODE_ENV=development
   LOG_LEVEL=debug
   HEADLESS=false
   ```

3. **Test components individually:**
   ```bash
   # Test Redis
   redis-cli ping
   
   # Test Playwright
   npx playwright test
   
   # Test API
   curl http://localhost:3000/health
   ```

4. **Create a minimal reproduction:**
   - Use simplest possible form
   - Minimal formData
   - Default settings
   - Check if it works

5. **Open an issue on GitHub:**
   - Include logs
   - Include configuration (redact secrets)
   - Include screenshots
   - Describe expected vs actual behavior

---

## Common Error Codes

| Error | Cause | Solution |
|-------|-------|----------|
| `ECONNREFUSED` | Redis not running | Start Redis |
| `ENOTFOUND` | DNS resolution failed | Check network/URL |
| `ETIMEDOUT` | Network timeout | Increase timeout |
| `EACCES` | Permission denied | Fix file permissions |
| `Protocol error` | Browser crashed | Check system resources |
| `Target closed` | Page closed unexpectedly | Check for redirects/popups |
| `Selector not found` | Element doesn't exist | Check page loaded, verify selector |

---

For more help, see:
- [Architecture Documentation](ARCHITECTURE.md)
- [API Documentation](API.md)
- [Deployment Guide](DEPLOYMENT.md)

