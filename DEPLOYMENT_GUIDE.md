# 🚀 CartPanda Automation - Deployment Guide

Everything you need to deploy and use your CartPanda checkout automation.

---

## 📋 Prerequisites

On your Ubuntu 22.04 VPS:
- ✅ Node.js & npm installed
- ✅ Redis installed and running
- ✅ Playwright installed: `npx playwright install chromium && npx playwright install-deps chromium`
- ✅ PM2 installed: `sudo npm install -g pm2`

---

## ⚡ Quick Setup

### 1. Create .env File

```bash
cd ~/browser-autofill-service
nano .env
```

**Paste this and fill in your values:**

```env
# Server
PORT=3000
NODE_ENV=production

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Security - Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
API_KEY=

# Your Vercel frontend URL
FRONTEND_URL=https://your-app.vercel.app

# Browser
HEADLESS=true
BROWSER_TIMEOUT=60000

# Decodo Proxy (CRITICAL for CartPanda - requires US IPs!)
USE_PROXY=true

# OPTION 1: Subdomain Routing (RECOMMENDED - Decodo residential proxies)
# System auto-detects subdomain format and uses plain username (no suffixes)
DECODO_SERVER=us.decodo.com:10001
DECODO_USERNAME=your_username
DECODO_PASSWORD=your_password
DECODO_COUNTRY=
DECODO_STATE=
DECODO_CITY=

# Other subdomains: br.decodo.com, uk.decodo.com, de.decodo.com, etc.

# OPTION 2: Username-Suffix Format (gate.decodo.com with location in username)
# System auto-adds: username-country-us-state-texas-session-{id}
# DECODO_SERVER=gate.decodo.com:7000
# DECODO_USERNAME=your_username
# DECODO_PASSWORD=your_password
# DECODO_COUNTRY=us
# DECODO_STATE=texas
# DECODO_CITY=

# CartPanda
TARGET_URL=https://checkout.cartpanda.com/your-url

# Worker (5 concurrent = ~7000/day capacity)
WORKER_CONCURRENCY=5

# Logging
LOG_LEVEL=info
```

### 2. Start Services

```bash
npm install
pm2 start ecosystem.config.js
pm2 save
pm2 logs
```

### 3. Test

```bash
# Health check
curl http://localhost:3000/health

# Submit test (replace YOUR_API_KEY)
curl -X POST http://localhost:3000/api/tasks/submit \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "accountId": "test",
    "formData": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "test@example.com",
      "phone": "5551234567"
    }
  }'
```

---

## 🎯 Frontend Integration (React/Vercel)

### API utility (lib/api.js):

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'X-API-Key': process.env.NEXT_PUBLIC_API_KEY,
  },
});

export async function submitCheckout(formData) {
  const { data } = await api.post('/api/tasks/submit', {
    accountId: `user-${Date.now()}`,
    formData,
  });
  return data;
}

export async function checkStatus(jobId) {
  const { data } = await api.get(`/api/tasks/${jobId}`);
  return data;
}
```

### In your Vercel .env:

```env
NEXT_PUBLIC_API_URL=http://your-vps-ip:3000
NEXT_PUBLIC_API_KEY=your-api-key
```

### Usage Example (CartPanda):

```javascript
const { data } = await submitCheckout({
  // Basic info
  email: 'john@example.com',
  fullName: 'John Doe',  // or "nome" for Portuguese
  phone: '5511999999999',  // or "telefone"
  
  // Payment info (CartPanda Stripe)
  cardNumber: '4111111111111111',  // or "cartao"
  cardExpiry: '12/25',  // MM/YY format, or "validade"
  cvc: '123',  // or "cvv"
  cardholderName: 'John Doe',  // optional, uses fullName if not provided
});

const jobId = data.jobId;

// Poll for status
const interval = setInterval(async () => {
  const status = await checkStatus(jobId);
  
  if (status.data.status === 'completed') {
    clearInterval(interval);
    console.log('Success!', status.data.result);
    console.log('Order:', status.data.result.orderNumber);
  } else if (status.data.status === 'failed') {
    clearInterval(interval);
    console.error('Failed:', status.data.error);
  }
}, 5000);
```

---

## 🔧 Common Commands

### PM2 Management
```bash
pm2 status              # Check status
pm2 logs                # View logs
pm2 restart all         # Restart services
pm2 stop all            # Stop services
```

### Redis
```bash
redis-cli ping          # Test connection
sudo systemctl restart redis-server
```

### Monitoring
```bash
pm2 monit              # Live monitoring
htop                   # System resources
```

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| "API key required" | Add `-H "X-API-Key: YOUR_KEY"` to requests |
| Redis connection failed | `sudo systemctl start redis-server` |
| Browser launch failed | `npx playwright install-deps chromium` |
| CORS errors | Check `FRONTEND_URL` in .env matches exactly |
| Port 3000 in use | `sudo lsof -ti:3000 \| xargs sudo kill -9` |

---

## 📊 What You Get

**Every checkout gets unique:**
- ✅ Proxy IP (Decodo sticky session)
- ✅ Browser fingerprint
- ✅ Cookies & storage
- ✅ User agent & viewport

**Security:**
- ✅ API key authentication
- ✅ CORS protection
- ✅ Rate limiting (10/min)

**Capacity:**
- 5 concurrent workers
- ~30 sec per checkout
- **~7,000/day capacity** (your need: 500/day ✅)

---

## 🔑 API Reference

### Submit Checkout
```bash
POST /api/tasks/submit
Headers: X-API-Key: your-key
Body: {
  "accountId": "unique-id",
  "formData": {
    "email": "john@example.com",
    "fullName": "John Doe",
    "phone": "5511999999999",
    "cardNumber": "4111111111111111",
    "cardExpiry": "12/25",
    "cvc": "123"
  }
}
```

### Check Status
```bash
GET /api/tasks/{jobId}
Headers: X-API-Key: your-key
```

### Queue Stats
```bash
GET /api/queue/stats
Headers: X-API-Key: your-key
```

---

## ⚠️ Important Notes

1. **API Key:** Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. **Proxy:** Must set `USE_PROXY=true` and add Decodo credentials
3. **Session IDs:** Auto-generated, ensures complete isolation
4. **Cleanup:** Profiles auto-deleted after each checkout

---

**That's it! You're ready to automate CartPanda checkouts.** 🎉

