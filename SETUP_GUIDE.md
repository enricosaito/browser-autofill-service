# 🚀 CartPanda Automation - Complete Setup Guide

This guide will walk you through setting up the browser autofill service for CartPanda checkout automation on your DigitalOcean VPS.

---

## 📋 **Prerequisites Checklist**

- ✅ Ubuntu 22.04 VPS (DigitalOcean)
- ✅ Node.js and npm installed
- ✅ Redis installed and running
- ✅ Playwright with Chromium installed
- ✅ PM2 installed globally
- ✅ Decodo proxy account with credentials
- ✅ Vercel frontend URL

---

## 🔧 **1. Create .env File**

Create a `.env` file in the project root with the following configuration:

```bash
# Navigate to project directory
cd ~/browser-autofill-service

# Create .env file
nano .env
```

Paste the following configuration and **REPLACE ALL PLACEHOLDERS**:

```env
# ================================================================
# SERVER CONFIGURATION
# ================================================================
PORT=3000
NODE_ENV=production

# ================================================================
# REDIS CONFIGURATION
# ================================================================
REDIS_HOST=localhost
REDIS_PORT=6379

# ================================================================
# API SECURITY - GENERATE A STRONG KEY!
# ================================================================
# Generate a key with this command:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
API_KEY=YOUR_GENERATED_API_KEY_HERE

# Your Vercel frontend URL
FRONTEND_URL=https://your-app.vercel.app

# ================================================================
# BROWSER CONFIGURATION
# ================================================================
HEADLESS=true
BROWSER_TIMEOUT=60000
NAVIGATION_TIMEOUT=60000
PROFILES_DIR=./profiles

# ================================================================
# DECODO PROXY - CRITICAL FOR CARTPANDA!
# ================================================================
USE_PROXY=true
DECODO_SERVER=gate.decodo.com:8080
DECODO_USERNAME=your-decodo-username
DECODO_PASSWORD=your-decodo-password

# ================================================================
# CARTPANDA FORM
# ================================================================
TARGET_URL=https://checkout.cartpanda.com/your-checkout-url
FORM_SUBMIT_SELECTOR=button[type="submit"]

# ================================================================
# WORKER CONFIGURATION (500 checkouts per 24h = ~3-5 concurrent)
# ================================================================
WORKER_CONCURRENCY=5

# ================================================================
# RETRY CONFIGURATION
# ================================================================
MAX_RETRIES=2
RETRY_DELAY=5000

# ================================================================
# LOGGING
# ================================================================
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

Save with `Ctrl+O`, then `Enter`, then exit with `Ctrl+X`.

---

## 🔑 **2. Generate API Key**

Generate a strong API key for production:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste it as your `API_KEY` in the `.env` file.

---

## 🌐 **3. Verify All Services Running**

### Check Redis:
```bash
redis-cli ping
# Should return: PONG
```

### Check Node.js:
```bash
node --version
# Should be v20.x or higher
```

### Check PM2:
```bash
pm2 --version
# Should return version number
```

### Check Playwright:
```bash
npx playwright --version
# Should return version number
```

---

## 🚀 **4. Start the Service**

```bash
# Make sure you're in the project directory
cd ~/browser-autofill-service

# Install dependencies (if not already done)
npm install

# Create logs directory
mkdir -p logs profiles

# Start with PM2
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs
```

---

## 🧪 **5. Test the Service**

### Test 1: Health Check
```bash
curl http://localhost:3000/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "uptime": 5.2
}
```

### Test 2: Submit a Test Task

**IMPORTANT:** Replace `YOUR_API_KEY_HERE` with your actual API key!

```bash
curl -X POST http://localhost:3000/api/tasks/submit \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY_HERE" \
  -d '{
    "accountId": "test-001",
    "formData": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "5551234567",
      "address": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zip": "10001"
    }
  }'
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "jobId": "test-001-1234567890",
    "accountId": "test-001",
    "status": "queued",
    "message": "Task added to queue successfully"
  }
}
```

### Test 3: Check Job Status

```bash
# Replace JOB_ID with the jobId from Test 2
curl http://localhost:3000/api/tasks/JOB_ID \
  -H "X-API-Key: YOUR_API_KEY_HERE"
```

---

## 🔥 **6. Configure Firewall (If Applicable)**

If you have UFW enabled:

```bash
# Allow port 3000 (or use nginx reverse proxy)
sudo ufw allow 3000/tcp
sudo ufw status
```

**Recommended:** Use nginx as a reverse proxy for HTTPS:

```bash
# Install nginx
sudo apt install nginx

# Create nginx config
sudo nano /etc/nginx/sites-available/autofill-api
```

Paste this config:

```nginx
server {
    listen 80;
    server_name your-vps-ip-or-domain;

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

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/autofill-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 📱 **7. Frontend Integration (React/Vercel)**

### Install axios in your frontend:
```bash
npm install axios
```

### Create API utility (`lib/autofillAPI.js`):

```javascript
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://your-vps-ip:3000';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  },
});

export async function submitCheckout(formData) {
  const response = await api.post('/api/tasks/submit', {
    accountId: `user-${Date.now()}`,
    formData,
  });
  
  return response.data;
}

export async function checkJobStatus(jobId) {
  const response = await api.get(`/api/tasks/${jobId}`);
  return response.data;
}

export async function getQueueStats() {
  const response = await api.get('/api/queue/stats');
  return response.data;
}
```

### Add to `.env.local` in your Vercel project:

```env
NEXT_PUBLIC_API_URL=http://your-vps-ip:3000
NEXT_PUBLIC_API_KEY=your-api-key-here
```

### Example React Component:

```jsx
import { useState } from 'react';
import { submitCheckout, checkJobStatus } from '@/lib/autofillAPI';

export default function CheckoutButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleCheckout = async () => {
    setLoading(true);
    
    try {
      // Submit checkout task
      const { data } = await submitCheckout({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '5551234567',
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        zip: '10001',
      });
      
      const jobId = data.jobId;
      console.log('Job submitted:', jobId);
      
      // Poll for status
      const interval = setInterval(async () => {
        const status = await checkJobStatus(jobId);
        console.log('Job status:', status.data.status);
        
        if (status.data.status === 'completed') {
          clearInterval(interval);
          setResult(status.data.result);
          setLoading(false);
        } else if (status.data.status === 'failed') {
          clearInterval(interval);
          setResult({ error: status.data.error });
          setLoading(false);
        }
      }, 5000); // Poll every 5 seconds
      
    } catch (error) {
      console.error('Checkout error:', error);
      setResult({ error: error.message });
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleCheckout} disabled={loading}>
        {loading ? 'Processing...' : 'Start Checkout'}
      </button>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}
```

---

## 🔍 **8. Monitoring & Debugging**

### View Logs:
```bash
# Real-time logs
pm2 logs

# API logs only
pm2 logs autofill-api

# Worker logs only
pm2 logs autofill-worker

# Application logs
tail -f logs/app.log

# Error logs
tail -f logs/error.log
```

### Check Queue Statistics:
```bash
curl http://localhost:3000/api/queue/stats \
  -H "X-API-Key: YOUR_API_KEY"
```

### Monitor PM2:
```bash
pm2 monit
```

### Check System Resources:
```bash
# CPU and memory usage
pm2 status

# Detailed monitoring
htop
```

---

## 🛠️ **9. Common Issues & Solutions**

### Issue: "API key required"
**Solution:** Make sure you're sending the `X-API-Key` header with every request.

### Issue: "Redis connection failed"
**Solution:** 
```bash
sudo systemctl status redis-server
sudo systemctl start redis-server
```

### Issue: "Browser launch failed"
**Solution:**
```bash
# Install missing dependencies
npx playwright install-deps chromium
npx playwright install chromium
```

### Issue: Port 3000 in use
**Solution:**
```bash
# Find and kill the process
sudo lsof -ti:3000 | xargs sudo kill -9

# Or change PORT in .env
```

### Issue: Jobs failing with proxy errors
**Solution:** Verify Decodo credentials:
- Check username/password
- Ensure `USE_PROXY=true`
- Test proxy manually

---

## 📊 **10. Performance Tuning**

### For 500 checkouts per 24 hours:

**Current settings:**
- `WORKER_CONCURRENCY=5` (5 concurrent jobs)
- Average time per checkout: ~30 seconds
- Capacity: 5 jobs/min × 60 min/hr × 24 hr = ~7,200 jobs/day

**Recommendations:**
1. Start with `WORKER_CONCURRENCY=5`
2. Monitor with `pm2 monit`
3. If VPS handles it well, increase to 7-10
4. Watch CPU/memory usage

### Rate Limiting:
The worker has built-in rate limiting (10 jobs/minute default). This is intentional to avoid detection.

---

## 🔐 **11. Security Checklist**

- [ ] Strong API key generated
- [ ] Firewall configured (UFW or security groups)
- [ ] Only necessary ports open (80, 443, 22)
- [ ] `.env` file not committed to git
- [ ] Decodo proxy credentials secured
- [ ] Regular security updates: `sudo apt update && sudo apt upgrade`

---

## 🎯 **12. Next Steps**

1. **Test with real CartPanda URL**
2. **Configure success indicators** for your specific checkout
3. **Set up monitoring/alerts** for failed jobs
4. **Create frontend UI** for managing checkouts
5. **Set up automatic profile cleanup** (cron job)

---

## 📞 **Support**

If you encounter issues:

1. Check logs: `pm2 logs`
2. Review this guide carefully
3. Check queue stats: `/api/queue/stats`
4. Enable debug logging: `LOG_LEVEL=debug` in `.env`

---

## ✨ **What's Been Implemented**

✅ **Unique session IDs** - Every checkout gets its own proxy session  
✅ **API authentication** - Secure with API keys  
✅ **CORS configured** - Ready for Vercel frontend  
✅ **Stealth bug fixed** - Better anti-detection  
✅ **CartPanda logic** - Specific handling for CartPanda checkouts  
✅ **Profile auto-cleanup** - Fresh start for every session  
✅ **Production-ready** - PM2, logging, error handling  

---

**You're ready to start automating CartPanda checkouts! 🚀**

