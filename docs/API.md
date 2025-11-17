# API Documentation

Complete API reference for the Browser Autofill Service.

## Base URL

```
http://localhost:3000
```

## Authentication

Currently, the API does not require authentication. **For production use, implement authentication middleware.**

## Endpoints

### Health Check

Check if the service is running.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5
}
```

---

### Submit Form Filling Task

Submit a new form-filling task to the queue.

**Endpoint:** `POST /api/tasks/submit`

**Request Body:**
```json
{
  "accountId": "string (required)",
  "formData": "object (required)",
  "targetUrl": "string (optional, uses env default)",
  "submitSelector": "string (optional, uses env default)",
  "successIndicators": "object (optional)",
  "priority": "number (optional, default: 1)",
  "options": "object (optional)"
}
```

**Detailed Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `accountId` | string | Yes | Unique identifier for the account/user |
| `formData` | object | Yes | Key-value pairs of form field data |
| `targetUrl` | string | No | URL of the form to fill (uses env default if omitted) |
| `submitSelector` | string | No | CSS selector for submit button |
| `successIndicators` | object | No | Criteria to verify successful submission |
| `priority` | number | No | Job priority (higher = processed first) |
| `options` | object | No | Additional options for the task |

**formData Structure:**

The `formData` object should contain key-value pairs where keys match form field names, IDs, or purposes:

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "555-1234",
  "message": "Hello world",
  "address": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zip": "10001"
}
```

**successIndicators Structure:**

```json
{
  "successUrl": "/thank-you",           // Partial URL match
  "successMessage": "Thank you",        // Message in page content
  "successSelector": ".success-message" // CSS selector for success element
}
```

**options Structure:**

```json
{
  "simulateHuman": true,           // Enable human-like behavior (default: true)
  "takeScreenshots": false,        // Take debug screenshots (default: false)
  "browserOptions": {              // Additional browser options
    "executablePath": "/path/to/chrome"
  }
}
```

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/tasks/submit \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "user123",
    "formData": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "555-1234"
    },
    "targetUrl": "https://example.com/contact",
    "submitSelector": "button[type=\"submit\"]",
    "successIndicators": {
      "successUrl": "/thank-you"
    },
    "options": {
      "simulateHuman": true,
      "takeScreenshots": true
    }
  }'
```

**Response:**

Success (200):
```json
{
  "success": true,
  "data": {
    "jobId": "user123-1705315200000",
    "accountId": "user123",
    "status": "queued",
    "message": "Task added to queue successfully"
  }
}
```

Error (400):
```json
{
  "success": false,
  "error": "accountId is required"
}
```

---

### Get Job Status

Retrieve the status of a specific job.

**Endpoint:** `GET /api/tasks/:jobId`

**Parameters:**
- `jobId` (path parameter): Job ID returned from submit endpoint

**Example Request:**

```bash
curl http://localhost:3000/api/tasks/user123-1705315200000
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "user123-1705315200000",
    "status": "completed",
    "progress": 100,
    "result": {
      "success": true,
      "accountId": "user123",
      "fillResults": {
        "filled": [
          { "field": "firstName", "type": "text" },
          { "field": "lastName", "type": "text" },
          { "field": "email", "type": "email" }
        ],
        "failed": [],
        "skipped": []
      },
      "verification": {
        "success": true,
        "method": "url",
        "message": "URL changed to https://example.com/thank-you"
      },
      "duration": 15342,
      "timestamp": "2024-01-15T10:35:00.000Z"
    },
    "data": {
      "accountId": "user123",
      "formData": { "..." }
    },
    "timestamp": 1705315200000,
    "processedOn": 1705315205000,
    "finishedOn": 1705315220342,
    "attempts": 1
  }
}
```

**Status Values:**
- `waiting`: Job is in queue
- `active`: Job is being processed
- `completed`: Job completed successfully
- `failed`: Job failed after all retry attempts
- `delayed`: Job is delayed (retry backoff)

---

### Get Jobs by Account

Retrieve all jobs for a specific account.

**Endpoint:** `GET /api/tasks/account/:accountId`

**Parameters:**
- `accountId` (path parameter): Account identifier

**Example Request:**

```bash
curl http://localhost:3000/api/tasks/account/user123
```

**Response:**

```json
{
  "success": true,
  "data": {
    "accountId": "user123",
    "jobs": [
      {
        "id": "user123-1705315200000",
        "status": "completed",
        "progress": 100,
        "timestamp": 1705315200000,
        "data": { "..." }
      },
      {
        "id": "user123-1705315800000",
        "status": "waiting",
        "progress": 0,
        "timestamp": 1705315800000,
        "data": { "..." }
      }
    ],
    "count": 2
  }
}
```

---

### Cancel Job

Cancel a pending or active job.

**Endpoint:** `DELETE /api/tasks/:jobId`

**Parameters:**
- `jobId` (path parameter): Job ID to cancel

**Example Request:**

```bash
curl -X DELETE http://localhost:3000/api/tasks/user123-1705315200000
```

**Response:**

Success (200):
```json
{
  "success": true,
  "message": "Job cancelled successfully"
}
```

Not Found (404):
```json
{
  "success": false,
  "error": "Job not found or already completed"
}
```

---

### Get Queue Statistics

Get overall queue statistics.

**Endpoint:** `GET /api/queue/stats`

**Example Request:**

```bash
curl http://localhost:3000/api/queue/stats
```

**Response:**

```json
{
  "success": true,
  "data": {
    "waiting": 5,
    "active": 2,
    "completed": 150,
    "failed": 3,
    "delayed": 1,
    "total": 161
  }
}
```

---

### List Browser Profiles

List all stored browser profiles.

**Endpoint:** `GET /api/profiles`

**Example Request:**

```bash
curl http://localhost:3000/api/profiles
```

**Response:**

```json
{
  "success": true,
  "data": {
    "profiles": [
      "user123",
      "user456",
      "user789"
    ],
    "count": 3
  }
}
```

---

### Delete Browser Profile

Delete a specific browser profile.

**Endpoint:** `DELETE /api/profiles/:accountId`

**Parameters:**
- `accountId` (path parameter): Account identifier

**Example Request:**

```bash
curl -X DELETE http://localhost:3000/api/profiles/user123
```

**Response:**

```json
{
  "success": true,
  "message": "Profile user123 deleted successfully"
}
```

---

### Cleanup Old Profiles

Delete browser profiles older than specified days.

**Endpoint:** `POST /api/profiles/cleanup`

**Request Body:**
```json
{
  "daysOld": 30
}
```

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/profiles/cleanup \
  -H "Content-Type: application/json" \
  -d '{"daysOld": 30}'
```

**Response:**

```json
{
  "success": true,
  "message": "Cleaned up 5 old profiles",
  "count": 5
}
```

---

## Error Responses

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

**Common HTTP Status Codes:**
- `200`: Success
- `400`: Bad Request (invalid input)
- `404`: Not Found
- `500`: Internal Server Error

---

## Rate Limiting

The worker has built-in rate limiting:
- **Default**: 10 jobs per minute per worker
- Configurable in worker configuration

For API-level rate limiting, implement middleware (recommended for production).

---

## Webhooks (Future)

*Webhook support for job completion notifications is planned for future releases.*

---

## Best Practices

1. **Unique Account IDs**: Use unique identifiers for each account/user
2. **Error Handling**: Always check the `success` field in responses
3. **Status Polling**: Poll job status at reasonable intervals (5-10 seconds)
4. **Screenshots**: Only enable for debugging (increases disk usage)
5. **Profile Cleanup**: Regularly clean old profiles to save disk space
6. **Priority**: Use priority sparingly to avoid starving normal jobs

---

## Code Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

async function submitFormFillTask() {
  try {
    const response = await axios.post('http://localhost:3000/api/tasks/submit', {
      accountId: 'user123',
      formData: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      },
    });
    
    console.log('Job ID:', response.data.data.jobId);
    return response.data.data.jobId;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}
```

### Python

```python
import requests
import time

API_URL = 'http://localhost:3000'

def submit_task():
    response = requests.post(f'{API_URL}/api/tasks/submit', json={
        'accountId': 'user123',
        'formData': {
            'firstName': 'John',
            'lastName': 'Doe',
            'email': 'john@example.com',
        },
    })
    
    data = response.json()
    return data['data']['jobId']

def check_status(job_id):
    response = requests.get(f'{API_URL}/api/tasks/{job_id}')
    return response.json()['data']

# Submit and monitor
job_id = submit_task()
print(f'Job submitted: {job_id}')

while True:
    status = check_status(job_id)
    print(f"Status: {status['status']}")
    
    if status['status'] in ['completed', 'failed']:
        print('Final result:', status.get('result'))
        break
    
    time.sleep(5)
```

### cURL

```bash
#!/bin/bash

# Submit task
JOB_ID=$(curl -s -X POST http://localhost:3000/api/tasks/submit \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "user123",
    "formData": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    }
  }' | jq -r '.data.jobId')

echo "Job ID: $JOB_ID"

# Monitor status
while true; do
  STATUS=$(curl -s http://localhost:3000/api/tasks/$JOB_ID | jq -r '.data.status')
  echo "Status: $STATUS"
  
  if [ "$STATUS" == "completed" ] || [ "$STATUS" == "failed" ]; then
    break
  fi
  
  sleep 5
done
```

---

## Support

For API issues:
- Check server logs: `pm2 logs autofill-api`
- Verify Redis connection
- Check request/response format
- Review error messages in response

