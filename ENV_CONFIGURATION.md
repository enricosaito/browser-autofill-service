# 🔐 Environment Variables Configuration Guide

This document explains all environment variables needed for the Browser Autofill Service.

---

## 📝 **Creating Your .env File**

Create a `.env` file in the project root:

```bash
nano .env
```

---

## ⚙️ **Complete Configuration Template**

Copy and paste this into your `.env` file, then replace all values with your actual credentials:

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
# REDIS_PASSWORD=          # Optional: only if Redis has password

# ================================================================
# API SECURITY
# ================================================================
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
API_KEY=

# Your Vercel frontend URL (or multiple comma-separated)
FRONTEND_URL=https://your-app.vercel.app

# ================================================================
# BROWSER CONFIGURATION
# ================================================================
HEADLESS=true
BROWSER_TIMEOUT=60000
NAVIGATION_TIMEOUT=60000
PROFILES_DIR=./profiles

# ================================================================
# DECODO PROXY (CRITICAL!)
# ================================================================
# MUST be true for production to avoid IP bans
USE_PROXY=true

# Get these from your Decodo account
DECODO_SERVER=gate.decodo.com:8080
DECODO_USERNAME=
DECODO_PASSWORD=

# ================================================================
# CARTPANDA FORM
# ================================================================
# Default target URL (can be overridden per request)
TARGET_URL=https://checkout.cartpanda.com/your-checkout-url

# Submit button CSS selector
FORM_SUBMIT_SELECTOR=button[type="submit"]

# ================================================================
# WORKER CONFIGURATION
# ================================================================
# How many jobs to process simultaneously
# For 500/day with 3-5 concurrent: use 5
WORKER_CONCURRENCY=5

# ================================================================
# RETRY CONFIGURATION
# ================================================================
# Maximum retry attempts for failed jobs
MAX_RETRIES=2

# Delay between retries (milliseconds)
RETRY_DELAY=5000

# ================================================================
# LOGGING
# ================================================================
# Levels: error, warn, info, debug
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

---

## 🔑 **Variable Explanations**

### **PORT**
- **Default:** `3000`
- **Description:** Port the API server listens on
- **Production:** Keep as `3000` or change if port is in use

### **NODE_ENV**
- **Options:** `development`, `production`
- **Production:** Always set to `production`
- **Development:** Use `development` for local testing with visible browser

### **REDIS_HOST**
- **Default:** `localhost`
- **Production:** `localhost` if Redis is on same VPS
- **Distributed:** IP address of Redis server if on different machine

### **REDIS_PORT**
- **Default:** `6379`
- **Description:** Redis server port

### **API_KEY**
- **CRITICAL:** Generate a strong random key
- **Generate with:**
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **Example:** `a3f8d9e2c1b0...` (64 characters)
- **Security:** Never commit this to git!

### **FRONTEND_URL**
- **Description:** Your frontend application URL for CORS
- **Example:** `https://your-app.vercel.app`
- **Multiple URLs:** Not currently supported, but you can modify server.js

### **HEADLESS**
- **Options:** `true`, `false`
- **Production:** Always `true` (browser runs without GUI)
- **Development:** `false` to watch browser automation

### **BROWSER_TIMEOUT**
- **Default:** `60000` (60 seconds)
- **Description:** Maximum time for browser operations
- **Adjust:** Increase for slow connections

### **NAVIGATION_TIMEOUT**
- **Default:** `60000` (60 seconds)
- **Description:** Maximum time for page navigation
- **Adjust:** Increase for slow-loading pages

### **USE_PROXY**
- **CRITICAL FOR CARTPANDA:** Must be `true`
- **Options:** `true`, `false`
- **Production:** `true` to avoid IP bans
- **Development:** Can be `false` for testing

### **DECODO_SERVER**
- **Default:** `gate.decodo.com:8080`
- **Description:** Decodo proxy server address
- **Note:** Get from your Decodo account dashboard

### **DECODO_USERNAME**
- **Description:** Your Decodo account username
- **Format:** Usually your account username
- **Session ID:** System automatically appends `-session-{uniqueId}` for sticky sessions

### **DECODO_PASSWORD**
- **Description:** Your Decodo account password
- **Security:** Keep this secure!

### **TARGET_URL**
- **Description:** Default CartPanda checkout URL
- **Example:** `https://checkout.cartpanda.com/abc123/checkout`
- **Override:** Can be overridden per API request

### **FORM_SUBMIT_SELECTOR**
- **Default:** `button[type="submit"]`
- **Description:** CSS selector for form submit button
- **CartPanda:** Usually `button[type="submit"]` or `.checkout-button`
- **Override:** Can be overridden per API request

### **WORKER_CONCURRENCY**
- **Default:** `1`
- **Description:** Number of jobs processed simultaneously
- **500/day:** Set to `5` for 3-5 concurrent checkouts
- **Resources:** Monitor CPU/memory and adjust

### **MAX_RETRIES**
- **Default:** `3`
- **Description:** Maximum retry attempts for failed jobs
- **Production:** `2` is good balance (3 total attempts)

### **RETRY_DELAY**
- **Default:** `5000` (5 seconds)
- **Description:** Initial delay between retries (exponential backoff)
- **Adjust:** Increase if rate limiting is an issue

### **LOG_LEVEL**
- **Options:** `error`, `warn`, `info`, `debug`
- **Production:** `info`
- **Debugging:** `debug` for detailed logs
- **Performance:** `warn` or `error` for minimal logging

---

## 🎯 **Configuration Profiles**

### **Production (VPS)**
```env
PORT=3000
NODE_ENV=production
HEADLESS=true
USE_PROXY=true
WORKER_CONCURRENCY=5
LOG_LEVEL=info
MAX_RETRIES=2
```

### **Development (Local)**
```env
PORT=3000
NODE_ENV=development
HEADLESS=false
USE_PROXY=false
WORKER_CONCURRENCY=1
LOG_LEVEL=debug
MAX_RETRIES=1
```

### **Testing (Staging)**
```env
PORT=3000
NODE_ENV=production
HEADLESS=true
USE_PROXY=true
WORKER_CONCURRENCY=2
LOG_LEVEL=debug
MAX_RETRIES=1
```

---

## 🔒 **Security Best Practices**

1. **Never commit .env to git**
   - Already in `.gitignore`
   - Double-check before pushing

2. **Use strong API keys**
   - Minimum 32 bytes (64 hex characters)
   - Use cryptographically secure random generator

3. **Secure Decodo credentials**
   - Don't share
   - Rotate if compromised

4. **Limit frontend URLs**
   - Only add trusted domains to CORS
   - Update when frontend URL changes

5. **Regular updates**
   - Review and update configurations
   - Check for unused variables

---

## ✅ **Validation Checklist**

Before starting the service, verify:

- [ ] `.env` file created in project root
- [ ] All required variables filled in
- [ ] API_KEY generated (not empty)
- [ ] FRONTEND_URL set to your Vercel app
- [ ] DECODO credentials correct
- [ ] TARGET_URL points to your CartPanda checkout
- [ ] USE_PROXY=true for production
- [ ] NODE_ENV=production for VPS

---

## 🧪 **Testing Your Configuration**

After creating `.env`:

```bash
# Test that environment variables load
node -e "require('dotenv').config(); console.log('API_KEY:', process.env.API_KEY ? 'SET' : 'NOT SET')"

# Test Redis connection
redis-cli ping

# Start services
pm2 start ecosystem.config.js

# Check logs for any configuration errors
pm2 logs
```

---

## 📞 **Need Help?**

Common issues:

- **"API_KEY not configured"** → Generate and set API_KEY in .env
- **"Redis connection failed"** → Check REDIS_HOST and REDIS_PORT
- **"Proxy authentication failed"** → Verify DECODO credentials
- **CORS errors from frontend** → Check FRONTEND_URL matches exactly

---

## 🔄 **Updating Configuration**

To update configuration while service is running:

```bash
# 1. Edit .env file
nano .env

# 2. Restart services
pm2 restart ecosystem.config.js

# 3. Verify changes took effect
pm2 logs
```

---

**Your .env file is the heart of your configuration. Keep it secure! 🔐**

