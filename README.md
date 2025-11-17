# Browser Autofill Service

A production-grade automated form-filling service using Playwright with human-like behavior simulation. Designed to run continuously on a VPS with PM2 process management.

## 🎯 Features

- **Human-like Behavior**: Realistic mouse movements, typing patterns, and random delays
- **Stealth Mode**: Advanced anti-detection techniques to avoid automation fingerprints
- **Profile Isolation**: Separate browser profiles for different accounts
- **Task Queue**: Robust job queue system using BullMQ and Redis
- **Error Handling**: Automatic retries, CAPTCHA detection, and comprehensive logging
- **Scalable**: Designed for horizontal scaling with multiple workers
- **RESTful API**: Submit and monitor tasks via HTTP endpoints
- **PM2 Integration**: Production-ready process management configuration

## 📋 Prerequisites

- **Node.js**: v20 or higher
- **Redis**: v6.0 or higher (required for BullMQ)
- **Playwright**: Chromium browser (installed automatically)
- **PM2**: For production deployment (optional but recommended)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/browser-autofill-service.git
   cd browser-autofill-service
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Playwright browsers**
   ```bash
   npx playwright install chromium
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Ensure Redis is running**
   ```bash
   # Ubuntu/Debian
   sudo systemctl start redis
   
   # macOS
   brew services start redis
   
   # Docker
   docker run -d -p 6379:6379 redis:alpine
   ```

## ⚙️ Configuration

Edit the `.env` file to configure the service:

```env
# Server
PORT=3000
NODE_ENV=production

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Browser
HEADLESS=true
BROWSER_TIMEOUT=30000

# Form Target
TARGET_URL=https://example.com/form
FORM_SUBMIT_SELECTOR=button[type="submit"]

# Proxy (optional)
USE_PROXY=false
PROXY_SERVER=http://proxy.example.com:8080
PROXY_USERNAME=
PROXY_PASSWORD=
```

## 🏃 Usage

### Development Mode

**Start API Server:**
```bash
node src/api/server.js
```

**Start Worker:**
```bash
node src/workers/worker.js
```

### Production Mode (PM2)

**Start all services:**
```bash
pm2 start ecosystem.config.js
```

**Start specific service:**
```bash
pm2 start ecosystem.config.js --only autofill-api
pm2 start ecosystem.config.js --only autofill-worker
```

**Monitor services:**
```bash
pm2 monit
pm2 logs
pm2 status
```

**Stop services:**
```bash
pm2 stop ecosystem.config.js
```

## 🌐 API Endpoints

### Submit Task
```bash
POST /api/tasks/submit
Content-Type: application/json

{
  "accountId": "user123",
  "formData": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "555-1234"
  },
  "targetUrl": "https://example.com/form",
  "submitSelector": "button[type='submit']",
  "successIndicators": {
    "successUrl": "/success",
    "successMessage": "Thank you"
  },
  "options": {
    "simulateHuman": true,
    "takeScreenshots": true
  }
}
```

### Get Job Status
```bash
GET /api/tasks/:jobId
```

### Get Account Jobs
```bash
GET /api/tasks/account/:accountId
```

### Cancel Job
```bash
DELETE /api/tasks/:jobId
```

### Queue Statistics
```bash
GET /api/queue/stats
```

### Health Check
```bash
GET /health
```

## 📁 Project Structure

```
browser-autofill-service/
├── src/
│   ├── api/
│   │   └── server.js           # Express API server
│   ├── browser/
│   │   ├── browsermanager.js   # Browser lifecycle & stealth
│   │   └── formlogic.js        # Form detection & filling
│   ├── queue/
│   │   └── queue.js            # BullMQ queue manager
│   ├── workers/
│   │   └── worker.js           # Task worker process
│   ├── utils/
│   │   ├── logger.js           # Winston logger
│   │   ├── humanBehavior.js    # Human simulation
│   │   └── profiles.js         # Profile management
│   └── config/
│       └── index.js            # Configuration
├── profiles/                    # Browser profiles (git-ignored)
├── logs/                        # Application logs (git-ignored)
├── ecosystem.config.js         # PM2 configuration
├── .env                        # Environment variables
└── package.json
```

## 🛡️ Anti-Detection Features

### Browser Fingerprinting
- Randomized viewport sizes
- Realistic user agents
- Proper timezone and locale settings
- Canvas and WebGL fingerprinting resistance
- Navigator property masking

### Human Behavior Simulation
- Bezier curve mouse movements
- Variable typing speeds
- Random pauses and hesitations
- Realistic scrolling patterns
- Pre-fill page interactions

### Profile Isolation
- Separate browser profiles per account
- Persistent cookies and local storage
- Independent browser contexts

## 🔄 Retry Logic

The system includes robust retry mechanisms:
- **Automatic Retries**: Failed jobs are retried up to 3 times (configurable)
- **Exponential Backoff**: Delays increase between retries
- **Error Screenshots**: Automatic screenshots on failures
- **CAPTCHA Detection**: Stops execution when CAPTCHA is detected

## 📊 Monitoring

### Logs
```bash
# View all logs
pm2 logs

# View specific service
pm2 logs autofill-worker

# View error logs only
tail -f logs/error.log
```

### Metrics
```bash
# PM2 monitoring
pm2 monit

# Queue statistics
curl http://localhost:3000/api/queue/stats
```

## 🐛 Debugging

### Enable Debug Mode
```env
NODE_ENV=development
HEADLESS=false
LOG_LEVEL=debug
```

### Screenshots
Enable automatic screenshots:
```json
{
  "options": {
    "takeScreenshots": true
  }
}
```

Screenshots are saved to `profiles/screenshots/`

### Browser Console
Worker logs browser console errors automatically. Check logs for:
```
Console error for account123: ...
```

## 🔒 Security Considerations

1. **Rate Limiting**: Built-in job limiter (10 jobs/minute by default)
2. **Profile Isolation**: Each account uses separate browser profile
3. **Proxy Support**: Route traffic through proxies to avoid IP bans
4. **Error Handling**: Graceful failures without exposing sensitive data

## 🚀 Scaling

### Horizontal Scaling
Run multiple worker instances:

```javascript
// ecosystem.config.js
{
  name: 'autofill-worker',
  instances: 3,  // Run 3 worker instances
  exec_mode: 'cluster'
}
```

### Separate Servers
- Run API server on one machine
- Run workers on multiple machines
- All connect to the same Redis instance

## 🧪 Testing

Submit a test task:
```bash
curl -X POST http://localhost:3000/api/tasks/submit \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "test123",
    "formData": {
      "firstName": "Test",
      "lastName": "User",
      "email": "test@example.com"
    }
  }'
```

Check job status:
```bash
curl http://localhost:3000/api/tasks/{jobId}
```

## 📝 Best Practices

1. **Profile Cleanup**: Regularly clean old profiles to save disk space
2. **Log Rotation**: Use PM2 log rotation or logrotate
3. **Redis Persistence**: Enable Redis persistence for job durability
4. **Monitoring**: Set up alerts for failed jobs and worker crashes
5. **Proxies**: Use rotating proxies for large-scale operations
6. **Rate Limiting**: Respect target website's rate limits

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

ISC

## ⚠️ Disclaimer

This tool is for educational and legitimate automation purposes only. Ensure you have permission to automate interactions with target websites. Always respect robots.txt and terms of service. Use responsibly.

## 🆘 Support

For issues and questions:
- Open an issue on GitHub
- Check logs in `logs/` directory
- Review PM2 logs with `pm2 logs`

## 🔮 Roadmap

- [ ] Multiple browser engine support (Firefox, WebKit)
- [ ] CAPTCHA solving integration hooks
- [ ] Advanced form field inference using ML
- [ ] Web interface for task management
- [ ] Metrics dashboard
- [ ] Docker containerization
- [ ] Kubernetes deployment templates

