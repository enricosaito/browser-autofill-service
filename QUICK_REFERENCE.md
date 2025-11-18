# ⚡ Quick Reference Guide

Fast reference for common tasks and commands.

---

## 🚀 **Quick Start (VPS)**

```bash
# 1. Create .env file
nano .env
# (Paste configuration from ENV_CONFIGURATION.md)

# 2. Install dependencies
npm install

# 3. Start services
pm2 start ecosystem.config.js
pm2 save

# 4. Check status
pm2 status
pm2 logs
```

---

## 🔑 **Generate API Key**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📡 **API Endpoints**

### Health Check
```bash
curl http://localhost:3000/health
```

### Submit Checkout
```bash
curl -X POST http://localhost:3000/api/tasks/submit \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_KEY" \
  -d '{
    "accountId": "user123",
    "formData": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "5551234567",
      "address": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zip": "10001"
    }
  }'
```

### Check Job Status
```bash
curl http://localhost:3000/api/tasks/{JOB_ID} \
  -H "X-API-Key: YOUR_KEY"
```

### Queue Statistics
```bash
curl http://localhost:3000/api/queue/stats \
  -H "X-API-Key: YOUR_KEY"
```

---

## 🎛️ **PM2 Commands**

```bash
# Start
pm2 start ecosystem.config.js

# Stop
pm2 stop ecosystem.config.js

# Restart
pm2 restart ecosystem.config.js

# Delete
pm2 delete ecosystem.config.js

# Logs (real-time)
pm2 logs

# Monitor
pm2 monit

# Status
pm2 status

# Save config
pm2 save

# Startup script
pm2 startup
```

---

## 📝 **Log Commands**

```bash
# PM2 logs
pm2 logs                    # All logs
pm2 logs autofill-api       # API logs only
pm2 logs autofill-worker    # Worker logs only
pm2 logs --lines 100        # Last 100 lines

# Application logs
tail -f logs/app.log        # Application log
tail -f logs/error.log      # Error log only
tail -n 100 logs/app.log    # Last 100 lines
```

---

## 🔧 **Redis Commands**

```bash
# Check if running
redis-cli ping

# Start
sudo systemctl start redis-server

# Stop
sudo systemctl stop redis-server

# Restart
sudo systemctl restart redis-server

# Status
sudo systemctl status redis-server

# Connect to Redis
redis-cli

# Inside redis-cli:
> KEYS *                    # List all keys
> GET key_name             # Get value
> DEL key_name             # Delete key
> FLUSHALL                 # Clear all (WARNING!)
> exit                     # Exit redis-cli
```

---

## 🛠️ **Troubleshooting**

### Redis not running
```bash
sudo systemctl start redis-server
redis-cli ping
```

### Port 3000 in use
```bash
sudo lsof -ti:3000 | xargs sudo kill -9
```

### Permission errors
```bash
sudo chown -R $USER:$USER .
chmod -R 755 .
```

### Playwright errors
```bash
npx playwright install chromium
npx playwright install-deps chromium
```

### PM2 not found
```bash
sudo npm install -g pm2
```

### .env not loading
```bash
# Check file exists
ls -la .env

# Check format (no spaces around =)
cat .env

# Restart services
pm2 restart ecosystem.config.js
```

---

## 📊 **Monitoring**

### Check system resources
```bash
# CPU/Memory
htop
# or
top

# Disk space
df -h

# Specific directory size
du -sh ./profiles
du -sh ./logs
```

### Check queue depth
```bash
curl -s http://localhost:3000/api/queue/stats -H "X-API-Key: YOUR_KEY" | jq
```

### Check active jobs
```bash
redis-cli
> KEYS bull:form-filling:*
> exit
```

---

## 🧹 **Cleanup Commands**

### Clean old profiles
```bash
curl -X POST http://localhost:3000/api/profiles/cleanup \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_KEY" \
  -d '{"daysOld": 7}'
```

### Manual profile cleanup
```bash
rm -rf ./profiles/*
```

### Clean logs
```bash
# Truncate logs (keep file)
> logs/app.log
> logs/error.log

# Or delete old logs
find logs/ -name "*.log" -mtime +7 -delete
```

### Clean PM2 logs
```bash
pm2 flush
```

---

## 🔄 **Update & Restart**

```bash
# Pull latest code
git pull

# Install new dependencies
npm install

# Restart services
pm2 restart ecosystem.config.js

# Check logs
pm2 logs
```

---

## 🔐 **Security**

### Check firewall
```bash
sudo ufw status
```

### Allow port
```bash
sudo ufw allow 3000/tcp
```

### Check who's using port 3000
```bash
sudo netstat -tulpn | grep 3000
```

### Generate new API key
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📱 **Frontend Testing**

### From your local machine
```bash
# Test health check
curl http://YOUR_VPS_IP:3000/health

# Test CORS
curl -H "Origin: https://your-app.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-API-Key" \
     -X OPTIONS \
     http://YOUR_VPS_IP:3000/api/tasks/submit \
     -v
```

---

## 🎯 **Environment Variables Quick Reference**

| Variable | Production Value | Required |
|----------|------------------|----------|
| `PORT` | `3000` | Yes |
| `NODE_ENV` | `production` | Yes |
| `REDIS_HOST` | `localhost` | Yes |
| `REDIS_PORT` | `6379` | Yes |
| `API_KEY` | Generate with node | **YES** |
| `FRONTEND_URL` | Your Vercel URL | **YES** |
| `USE_PROXY` | `true` | **YES** |
| `DECODO_USERNAME` | Your username | **YES** |
| `DECODO_PASSWORD` | Your password | **YES** |
| `TARGET_URL` | CartPanda URL | **YES** |
| `WORKER_CONCURRENCY` | `5` | Yes |
| `HEADLESS` | `true` | Yes |

---

## 💾 **Backup & Restore**

### Backup .env
```bash
cp .env .env.backup
```

### Backup entire project
```bash
cd ..
tar -czf browser-autofill-backup-$(date +%Y%m%d).tar.gz browser-autofill-service/
```

### Restore
```bash
tar -xzf browser-autofill-backup-YYYYMMDD.tar.gz
```

---

## 🆘 **Emergency Commands**

### Stop everything
```bash
pm2 stop all
```

### Kill all Node processes
```bash
pkill -f node
```

### Restart Redis
```bash
sudo systemctl restart redis-server
```

### Check if services are actually running
```bash
ps aux | grep node
ps aux | grep redis
```

### Full restart
```bash
pm2 delete all
sudo systemctl restart redis-server
pm2 start ecosystem.config.js
pm2 save
```

---

## 📞 **Getting Help**

1. Check logs: `pm2 logs`
2. Check Redis: `redis-cli ping`
3. Check .env: `cat .env`
4. Check status: `pm2 status`
5. Check guides: `SETUP_GUIDE.md`, `ENV_CONFIGURATION.md`

---

**Keep this guide handy for quick reference! 📌**

