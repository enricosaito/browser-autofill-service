# 🇺🇸 Setting Up US Proxy for CartPanda

CartPanda requires US IP addresses. Here's how to configure Decodo for US locations.

---

## 🔧 Quick Setup

### **Step 1: Edit your .env on VPS**

```bash
nano .env
```

### **Step 2: Add Location Configuration**

Add these lines to your `.env` (after the DECODO_PASSWORD line):

```env
# Decodo Location - REQUIRED for CartPanda
DECODO_COUNTRY=us
DECODO_STATE=california
DECODO_CITY=
```

**Full example:**
```env
# DECODO PROXY
USE_PROXY=true
DECODO_SERVER=gate.decodo.com:7000
DECODO_USERNAME=spgu0fnngj
DECODO_PASSWORD=your-api-key-here

# LOCATION (CRITICAL for CartPanda!)
DECODO_COUNTRY=us
DECODO_STATE=california
DECODO_CITY=
```

### **Step 3: Restart Services**

```bash
pm2 restart all
```

### **Step 4: Test**

```bash
curl -X POST http://localhost:3000/api/tasks/submit \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "accountId": "test-us-proxy",
    "formData": {
      "email": "test@example.com",
      "fullName": "John Doe",
      "phone": "5551234567"
    }
  }'
```

Watch logs: `tail -f logs/app.log`

You should see:
```
Using Decodo proxy: US/california - Session: test-us-proxy-123456789-abc
```

---

## 🌍 Available Options

### **Country (Required)**
```env
DECODO_COUNTRY=us
```
Always use `us` for CartPanda.

### **State (Optional but Recommended)**

Popular states:
```env
DECODO_STATE=california   # Los Angeles, San Francisco
DECODO_STATE=newyork      # New York City
DECODO_STATE=florida      # Miami, Orlando
DECODO_STATE=texas        # Houston, Dallas
DECODO_STATE=illinois     # Chicago
```

### **City (Optional - Very Specific)**

```env
DECODO_CITY=losangeles
DECODO_CITY=miami
DECODO_CITY=chicago
DECODO_CITY=newyork
```

---

## 🧪 Test Your Proxy Location

Run this to verify you're getting a US IP:

```bash
# Set your credentials
export DECODO_USERNAME="your-username"
export DECODO_PASSWORD="your-password"

# Test what IP you get
curl -x http://$DECODO_USERNAME-country-us:$DECODO_PASSWORD@gate.decodo.com:7000 \
  https://ipinfo.io/json
```

Should return:
```json
{
  "ip": "XXX.XXX.XXX.XXX",
  "city": "Los Angeles",
  "region": "California",
  "country": "US",
  ...
}
```

---

## 📊 How It Works

The system automatically builds the proxy username like this:

```
username-country-us-state-california-session-{uniqueID}
```

Each checkout gets:
- ✅ US IP address
- ✅ Specific state (if configured)
- ✅ Unique sticky session
- ✅ Consistent IP for entire checkout

---

## ⚠️ Important Notes

1. **Always use US** for CartPanda - non-US IPs will be blocked
2. **State is optional** but helps with better IP quality
3. **City is very specific** - use only if you need it
4. **Each session gets a NEW IP** but stays sticky during checkout

---

## 🐛 Troubleshooting

### White Page / Blocked
```env
# Make sure you have:
DECODO_COUNTRY=us
USE_PROXY=true
```

### Timeout Issues
```env
# Increase timeouts:
BROWSER_TIMEOUT=60000
NAVIGATION_TIMEOUT=60000
```

### Verify Logs
```bash
tail -f logs/app.log | grep "Using Decodo proxy"
```

Should show: `Using Decodo proxy: US/california - Session: ...`

---

**After configuration, push to git and restart on VPS!** 🚀

