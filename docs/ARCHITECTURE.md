# Architecture Overview

This document describes the architecture and design decisions of the Browser Autofill Service.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Applications                      │
│                  (HTTP Requests to API Server)                   │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API Server (Express)                       │
│  - Receives form-filling tasks                                   │
│  - Adds jobs to queue                                            │
│  - Returns job status                                            │
│  - Manages profiles                                              │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Redis + BullMQ Queue                          │
│  - Job queue management                                          │
│  - Retry logic                                                   │
│  - Job state tracking                                            │
│  - Priority handling                                             │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Worker Process(es)                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Job Processor                                            │  │
│  │  1. Receive job from queue                                │  │
│  │  2. Launch isolated browser                               │  │
│  │  3. Navigate to target URL                                │  │
│  │  4. Detect & fill form fields                             │  │
│  │  5. Submit form                                            │  │
│  │  6. Verify submission                                      │  │
│  │  7. Return result                                          │  │
│  │  8. Cleanup browser                                        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Browser Manager                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Browser 1   │  │  Browser 2   │  │  Browser N   │         │
│  │  (Account A) │  │  (Account B) │  │  (Account N) │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  - Profile isolation                                             │
│  - Stealth configuration                                         │
│  - Anti-fingerprinting                                           │
└──────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. API Server (`src/api/server.js`)

**Responsibilities:**
- Accept HTTP requests from clients
- Validate request data
- Add tasks to queue
- Query job status
- Manage browser profiles
- Provide queue statistics

**Technology:** Express.js

**Key Features:**
- RESTful API design
- JSON request/response
- Error handling middleware
- Request logging

### 2. Queue Manager (`src/queue/queue.js`)

**Responsibilities:**
- Manage job queue
- Handle job priorities
- Implement retry logic
- Track job state
- Clean old jobs

**Technology:** BullMQ + Redis

**Key Features:**
- Automatic retries with exponential backoff
- Job prioritization
- Job persistence
- Queue statistics
- Job lifecycle management

**Job States:**
```
┌─────────┐
│ Waiting │ ─┐
└─────────┘  │
             ▼
┌─────────┐     ┌──────────┐
│ Active  │ ──> │Completed │
└─────────┘     └──────────┘
     │
     │          ┌──────────┐
     └────────> │ Failed   │
                └──────────┘
                     │
                     ▼
                ┌─────────┐
                │ Delayed │ (Retry)
                └─────────┘
```

### 3. Worker Process (`src/workers/worker.js`)

**Responsibilities:**
- Process jobs from queue
- Execute form-filling automation
- Handle errors and retries
- Update job progress
- Return results

**Key Features:**
- Concurrent job processing
- Rate limiting
- Graceful shutdown
- Progress tracking
- Error handling

**Job Processing Flow:**
```
1. Receive Job (10%)
   ↓
2. Launch Browser (20%)
   ↓
3. Navigate to URL (30%)
   ↓
4. Check for CAPTCHA (40%)
   ↓
5. Fill Form (70%)
   ↓
6. Submit Form (85%)
   ↓
7. Verify Submission (95%)
   ↓
8. Cleanup & Return Result (100%)
```

### 4. Browser Manager (`src/browser/browsermanager.js`)

**Responsibilities:**
- Launch and manage browser instances
- Apply stealth configurations
- Handle browser profiles
- Take screenshots for debugging
- Cleanup browser resources

**Key Features:**
- Profile isolation per account
- Anti-detection techniques
- Realistic fingerprinting
- Resource management
- Error recovery

**Stealth Techniques:**
```javascript
- Remove webdriver property
- Mock navigator properties
- Realistic plugins array
- Proper timezone/locale
- Canvas fingerprint masking
- WebGL fingerprint masking
- Custom user agent
- Randomized viewport
```

### 5. Form Logic (`src/browser/formlogic.js`)

**Responsibilities:**
- Detect form fields intelligently
- Map data to fields
- Fill forms with human-like behavior
- Submit forms
- Verify submission success
- Detect CAPTCHAs

**Field Detection Strategy:**
```
1. Find all input, textarea, select elements
2. Skip hidden/disabled fields
3. Generate unique selectors
4. Infer field purpose from:
   - name attribute
   - id attribute
   - placeholder text
   - class names
   - aria labels
   - autocomplete hints
5. Map formData to fields
```

**Field Purpose Inference:**
```javascript
{
  email: ['email', type='email'],
  firstName: ['firstname', 'first-name', 'fname'],
  lastName: ['lastname', 'last-name', 'lname'],
  phone: ['phone', 'tel', type='tel'],
  address: ['address'],
  city: ['city'],
  state: ['state', 'province'],
  zip: ['zip', 'postal'],
  // ... etc
}
```

### 6. Human Behavior Simulator (`src/utils/humanBehavior.js`)

**Responsibilities:**
- Generate realistic mouse movements
- Simulate natural typing patterns
- Create random delays
- Perform page interactions

**Key Features:**
- Bezier curve mouse paths
- Variable typing speed
- Random pauses
- Realistic scrolling
- Random pre-fill interactions

**Mouse Movement:**
```
Start Position → Bezier Curve → End Position
      (x1,y1)    (control points)     (x2,y2)
      
Steps: 15-25 points along curve
Delay between points: 10-20ms
```

**Typing Pattern:**
```
Character Type     Delay Range
────────────────   ────────────
Regular (a-z, 0-9) 50-150ms
Space              100-200ms
Special chars      150-300ms
Random pause (10%) 300-800ms
```

### 7. Profile Manager (`src/utils/profiles.js`)

**Responsibilities:**
- Create and manage browser profiles
- Isolate browser data per account
- Clean up old profiles
- Manage disk space

**Profile Structure:**
```
profiles/
├── account-001/
│   ├── cookies.json
│   ├── localStorage/
│   ├── cache/
│   └── ...
├── account-002/
│   └── ...
└── screenshots/
    ├── account-001_initial_2024-01-15.png
    └── account-001_error_2024-01-15.png
```

## Data Flow

### Task Submission Flow

```
1. Client sends POST /api/tasks/submit
   ↓
2. API validates request
   ↓
3. API creates job in queue
   ↓
4. API returns job ID to client
   ↓
5. Worker picks up job
   ↓
6. Worker processes job
   ↓
7. Worker updates job status/result
   ↓
8. Client polls GET /api/tasks/:jobId
   ↓
9. Client receives result
```

### Job Processing Flow

```
Worker receives job
   ↓
Create isolated browser profile
   ↓
Launch browser with stealth settings
   ↓
Apply anti-fingerprinting measures
   ↓
Navigate to target URL
   ↓
Wait for page load
   ↓
Check for CAPTCHA
   ├─ Found → Fail with CAPTCHA error
   └─ Not found → Continue
      ↓
   Detect form fields
      ↓
   Match formData to fields
      ↓
   Fill each field with human-like behavior
      ↓
   Submit form
      ↓
   Wait for response
      ↓
   Verify submission success
      ├─ Success indicators found → Mark success
      └─ Not found → Check for errors
         ↓
      Return result
         ↓
      Cleanup browser
         ↓
      Update job status
```

## Scalability

### Vertical Scaling (Single Server)

**Options:**
1. Increase worker concurrency
   ```javascript
   WORKER_CONCURRENCY=3  // Process 3 jobs simultaneously
   ```

2. Run multiple worker processes
   ```javascript
   // ecosystem.config.js
   {
     name: 'autofill-worker',
     instances: 4  // 4 worker processes
   }
   ```

**Limitations:**
- CPU (browser rendering)
- Memory (multiple browser instances)
- Disk I/O (profiles and screenshots)

### Horizontal Scaling (Multiple Servers)

**Architecture:**
```
┌─────────────┐
│ API Server  │ ←─── Client Requests
└──────┬──────┘
       │
       ↓
┌─────────────┐
│Redis Cluster│ ←─── Shared Queue
└──────┬──────┘
       │
       ├──────────┬──────────┬──────────┐
       ↓          ↓          ↓          ↓
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│Worker 1  │ │Worker 2  │ │Worker 3  │ │Worker N  │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

**Benefits:**
- Unlimited horizontal scaling
- Fault tolerance
- Load distribution
- Geographic distribution

**Considerations:**
- Shared Redis instance (or cluster)
- Network latency
- Profile storage (NFS or S3)

## Performance Considerations

### Bottlenecks

1. **Browser Launch Time**: 2-5 seconds per instance
   - **Solution**: Reuse browser contexts when possible

2. **Form Processing Time**: 5-20 seconds per form
   - **Solution**: Optimize field detection, reduce unnecessary delays

3. **Queue Latency**: <1 second typically
   - **Solution**: Redis optimization, connection pooling

4. **Disk I/O**: Profile storage
   - **Solution**: Regular cleanup, SSD storage

### Resource Usage

**Per Worker Instance:**
- **CPU**: 50-200% (during active jobs)
- **Memory**: 500MB - 1GB
- **Disk**: 50-100MB per profile
- **Network**: Minimal (depends on target site)

**Redis:**
- **Memory**: 100MB - 1GB (depends on queue size)
- **Disk**: Minimal (with persistence enabled)

## Security Considerations

### Authentication & Authorization
- API currently has no authentication (add for production)
- Consider API keys or JWT tokens
- Rate limiting per API key

### Browser Isolation
- Each account uses separate profile
- No cross-contamination of cookies/storage
- Clean state for each job

### Data Privacy
- Form data stored temporarily in Redis
- Jobs cleaned after retention period
- No logging of sensitive form data
- Profiles can be encrypted at rest

### Anti-Detection
- Multiple layers of fingerprinting resistance
- Realistic behavior simulation
- Profile isolation prevents correlation

## Error Handling

### Error Categories

1. **Network Errors**
   - Connection timeout
   - DNS resolution failure
   - Solution: Retry with backoff

2. **Browser Errors**
   - Launch failure
   - Crash during execution
   - Solution: Cleanup and retry

3. **Form Errors**
   - Field not found
   - CAPTCHA detected
   - Submission failure
   - Solution: Screenshot and report

4. **Queue Errors**
   - Redis connection lost
   - Job serialization error
   - Solution: Reconnect, log error

### Retry Strategy

```
Attempt 1: Immediate
   ↓ (fail)
Wait 5 seconds
   ↓
Attempt 2: After delay
   ↓ (fail)
Wait 10 seconds (exponential backoff)
   ↓
Attempt 3: After delay
   ↓ (fail)
Mark as failed, screenshot taken
```

## Monitoring & Observability

### Logs

**Log Levels:**
- **info**: Normal operations
- **warn**: Potential issues (CAPTCHA, timeouts)
- **error**: Failures requiring attention

**Log Locations:**
```
logs/app.log           - All application logs
logs/error.log         - Error logs only
logs/pm2-api-*.log     - API server PM2 logs
logs/pm2-worker-*.log  - Worker PM2 logs
```

### Metrics

**Key Metrics to Monitor:**
- Jobs processed per minute
- Success rate
- Average processing time
- Queue depth
- Worker CPU/memory usage
- Browser launch failures
- CAPTCHA detection rate

### Debugging

**Tools:**
1. Screenshots on error
2. Browser console logs
3. Network request logs (optional)
4. Job state history
5. PM2 monitoring

## Future Improvements

### Planned Features

1. **Webhook Support**: Notify on job completion
2. **Advanced CAPTCHA Handling**: Integration hooks
3. **ML-Based Field Detection**: Improve accuracy
4. **Web Dashboard**: Visual task management
5. **Docker Support**: Easy deployment
6. **Multiple Browser Engines**: Firefox, WebKit support
7. **Session Recording**: Video recording for debugging
8. **Advanced Proxy Rotation**: Automatic proxy switching
9. **Browser Extension Support**: For additional functionality
10. **GraphQL API**: Alternative to REST

### Optimization Opportunities

1. Browser context reuse
2. Predictive field detection caching
3. Parallel form field filling
4. Smart retry logic based on error type
5. Distributed profile storage
6. Job priority learning

## Contributing

See `CONTRIBUTING.md` for architecture guidelines when contributing.

## References

- [Playwright Documentation](https://playwright.dev/)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [PM2 Documentation](https://pm2.keymetrics.io/)
- [Redis Documentation](https://redis.io/documentation)

