# 🇺🇸 Setting Up US Proxy for CartPanda

CartPanda requires US IP addresses. Here's how to configure Decodo for US locations.

---

## 🔧 Quick Setup (Subdomain Routing - RECOMMENDED)

### **Step 1: Test Your Proxy Credentials**

First, verify your Decodo credentials work:

```bash
curl -U "your_username:your_password" \
  -x "us.decodo.com:10001" \
  "https://ip.decodo.com/json"
```

**Expected output:** Should show `"country": { "code": "US" }`

### **Step 2: Edit your .env on VPS**

```bash
nano .env
```

### **Step 3: Configure for Subdomain Routing**

**Full example for Decodo subdomain routing:**
```env
# DECODO PROXY (Subdomain-based - RECOMMENDED)
USE_PROXY=true
DECODO_SERVER=us.decodo.com:10001
DECODO_USERNAME=your_username
DECODO_PASSWORD=your_password

# Leave these EMPTY for subdomain routing
DECODO_COUNTRY=
DECODO_STATE=
DECODO_CITY=
```

**Why leave location fields empty?**
- The subdomain `us.decodo.com` handles US routing automatically
- Adding `-country-us` to the username causes 407 errors
- System adds `-session-{id}` automatically for sticky sessions

### **Step 4: Restart Services**

```bash
pm2 restart all
```

### **Step 5: Test CartPanda Checkout**

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
Using Decodo proxy: US - Session: test-us-proxy-123456789-abc
Navigating to https://rewards.mycartpanda.com/checkout/...
Detected CartPanda checkout page
```

---

## 🌍 Decodo Proxy Formats

### **Method 1: Subdomain Routing (RECOMMENDED)**

**Use country-specific subdomains:**
- `us.decodo.com:10001` = United States 🇺🇸
- `br.decodo.com:10001` = Brazil 🇧🇷
- `uk.decodo.com:10001` = United Kingdom 🇬🇧
- `de.decodo.com:10001` = Germany 🇩🇪

**Configuration:**
```env
DECODO_SERVER=us.decodo.com:10001
DECODO_USERNAME=your_username
DECODO_PASSWORD=your_password
DECODO_COUNTRY=
DECODO_STATE=
DECODO_CITY=
```

**How It Works:**
- System detects `us.decodo.com` format
- Uses **plain username** (no `-session-` or `-country-` suffixes)
- Subdomain handles location routing automatically

**Advantages:**
- ✅ Simple - just change subdomain (us, br, uk, etc.)
- ✅ Clean authentication - username exactly as-is
- ✅ Works with port 10001
- ✅ No 407 authentication errors

---

### **Method 2: Username-Suffix Format**

**Use username suffixes for location:**

**Configuration:**
```env
DECODO_SERVER=gate.decodo.com:7000
DECODO_USERNAME=your_username
DECODO_PASSWORD=your_password
DECODO_COUNTRY=us
DECODO_STATE=california
DECODO_CITY=
```

**System builds username:** `your_username-country-us-state-california-session-{id}`

**Popular US states:**
- `california` - Los Angeles, San Francisco
- `newyork` - New York City
- `florida` - Miami, Orlando
- `texas` - Houston, Dallas
- `illinois` - Chicago

**Cities (very specific):**
- `losangeles`, `miami`, `chicago`, `newyork`, `dallas`

---

## 🧪 Test Your Proxy Location

### **Test Subdomain Routing (Method 1):**

```bash
curl -U "your_username:your_password" \
  -x "us.decodo.com:10001" \
  "https://ip.decodo.com/json"
```

**Expected output:**
```json
{
  "country": { "code": "US", "name": "United States" },
  "city": { "name": "Grand Prairie", "state": "Texas" },
  "proxy": { "ip": "108.207.109.26" }
}
```

### **Test Username-Suffix Format (Method 2):**

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

