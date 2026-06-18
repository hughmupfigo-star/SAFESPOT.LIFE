# Story Intelligence — Claude API Integration Guide

## Overview

This guide walks you through setting up the Claude API integration for automated story analysis. Your backend will receive story submissions, analyse them with Claude, and generate monthly reports automatically.

---

## Prerequisites

✅ **Required:**
- Node.js 18+ installed
- Claude API key (free account available)
- Access to your server/hosting
- Basic understanding of command line

---

## Step 1: Get Your Claude API Key

1. Go to: https://console.anthropic.com
2. Create account (or sign in)
3. Navigate to "API Keys" section
4. Click "Create Key"
5. Copy your key (starts with `sk-ant-`)
6. **SAVE SECURELY** — You'll need this in Step 3

---

## Step 2: Set Up Backend Directory

### Create the backend folder:

```bash
cd /path/to/your/safe/website
mkdir backend
cd backend
```

### Copy the files provided:
```bash
# You should have:
# - backend/server.js (the API)
# - backend/package.json (dependencies)
# - backend/.env.example (configuration template)
```

### Install dependencies:

```bash
npm install
```

This installs:
- `express` — web framework
- `@anthropic-ai/sdk` — Claude API client
- `cors` — cross-origin requests
- `dotenv` — environment variables

---

## Step 3: Configure Environment

### Create `.env` file:

```bash
cp .env.example .env
```

### Edit `.env` and add your Claude API key:

```bash
# Open .env with your editor
nano .env
# or
vim .env
# or use VS Code
```

### Update the file:

```
# SAFE Story Intelligence API — Environment Configuration

# Your Claude API Key (get from https://console.anthropic.com)
ANTHROPIC_API_KEY=sk-ant-YOUR-ACTUAL-KEY-HERE

# Server Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration (update for production)
CORS_ORIGIN=https://safespot.life
```

**⚠️ CRITICAL:** 
- Never commit `.env` to git
- Never share your API key publicly
- Add `.env` to `.gitignore`

---

## Step 4: Test the API Locally

### Start the server:

```bash
npm start
```

You should see:

```
╔═══════════════════════════════════════════════════╗
║     SAFE Story Intelligence API                  ║
║     Port: 3000                                      ║
║     Status: Running ✓                            ║
╚═══════════════════════════════════════════════════╝

Available endpoints:
  GET  /health
  POST /api/analyse-stories
  POST /api/webhook/formspree
  POST /api/trigger-monthly-analysis
  GET  /api/latest-report
```

### Test the health endpoint:

```bash
curl http://localhost:3000/health
```

Response:
```json
{"status":"OK","service":"Story Intelligence API"}
```

✓ If you see this, your API is running!

---

## Step 5: Test Story Analysis

### Create a test story file (`test-story.json`):

```json
{
  "stories": [
    {
      "name": "Alex",
      "location": "London, UK",
      "title": "Mental Health Crisis in School",
      "category": "Mental Health & Wellbeing",
      "content": "I'm struggling with anxiety and depression. My school has no counsellor. Teachers don't understand. I'm trying to cope alone and it's getting worse.",
      "wordCount": 30
    },
    {
      "name": "Sam",
      "location": "Manchester, UK",
      "title": "Climate Anxiety",
      "category": "Environment & Nature",
      "content": "I'm worried about climate change. I try to be sustainable but it feels pointless when corporations pollute. What future am I supposed to have?",
      "wordCount": 28
    }
  ],
  "month": "July 2026"
}
```

### Send test request:

```bash
curl -X POST http://localhost:3000/api/analyse-stories \
  -H "Content-Type: application/json" \
  -d @test-story.json
```

### Expected response:

```json
{
  "success": true,
  "report": {
    "month": "July 2026",
    "summary": "Youth stories reveal...",
    "topInsights": [
      {
        "emoji": "🧠",
        "category": "Mental Health & Wellbeing",
        "title": "School Support Crisis",
        "description": "...",
        "stat": "X stories"
      }
    ],
    ...
  },
  "storiesAnalysed": 2
}
```

✓ Claude is analysing your stories!

---

## Step 6: Deploy to Production

### Option A: Heroku (Easiest)

```bash
# 1. Install Heroku CLI
# 2. Login to Heroku
heroku login

# 3. Create app
heroku create safe-story-api

# 4. Set environment variables
heroku config:set ANTHROPIC_API_KEY=sk-ant-YOUR-KEY

# 5. Deploy
git push heroku main

# Your API is now live at:
# https://safe-story-api.herokuapp.com
```

### Option B: DigitalOcean App Platform

1. Push code to GitHub
2. Connect GitHub repo to DigitalOcean
3. Set environment variables
4. Deploy
5. Get production URL

### Option C: Your Own Server

```bash
# On your server:
cd /var/www/safe-api
git pull origin main
npm install
npm start

# Use PM2 to keep it running:
npm install -g pm2
pm2 start server.js --name "safe-api"
pm2 save
pm2 startup
```

---

## Step 7: Connect Frontend to API

### Update `story-intelligence.js`:

```javascript
// Change the API endpoint from localhost to production:

async function analyseStoriesWithClaude(stories) {
  const API_URL = process.env.NODE_ENV === 'production' 
    ? 'https://safe-story-api.herokuapp.com'  // Your production URL
    : 'http://localhost:3000';

  const response = await fetch(`${API_URL}/api/analyse-stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stories })
  });

  return await response.json();
}
```

---

## Step 8: Set Up Monthly Automation

### Option A: Node-Cron (Simplest)

Create `backend/scheduler.js`:

```javascript
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

// Run on 1st of each month at 9am
cron.schedule('0 9 1 * *', async () => {
  console.log('🚀 Running monthly analysis...');
  
  // 1. Fetch stories from Formspree/email/database
  const stories = await fetchStoriesFromThisMonth();
  
  // 2. Trigger analysis
  const month = new Date().toLocaleString('en-GB', 
    { month: 'long', year: 'numeric' }
  );
  
  const response = await fetch('http://localhost:3000/api/analyse-stories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stories, month })
  });
  
  const report = await response.json();
  
  // 3. Save report
  const reportPath = path.join(__dirname, `../reports/report-${month}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // 4. Deploy to frontend
  deployReportToFrontend(report);
  
  console.log('✓ Analysis complete');
});
```

### Option B: External Scheduler (Recommended)

Use **EasyCron** (easycron.com) or similar service:

1. Create webhook: `https://safe-story-api.herokuapp.com/api/trigger-monthly-analysis`
2. Set schedule: Every 1st of month at 09:00 UTC
3. Service calls your API automatically

### Option C: GitHub Actions (Advanced)

Create `.github/workflows/monthly-analysis.yml`:

```yaml
name: Monthly Story Analysis

on:
  schedule:
    - cron: '0 9 1 * *'  # 1st of month at 9am UTC

jobs:
  analyse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Trigger Analysis
        run: |
          curl -X POST https://safe-story-api.herokuapp.com/api/trigger-monthly-analysis \
            -H "Content-Type: application/json" \
            -d '{"month":"'$(date +'%B %Y')'","stories":[]}'
```

---

## API Endpoints Reference

### 1. Health Check
```bash
GET /health
```
**Response:** `{"status":"OK","service":"Story Intelligence API"}`

### 2. Analyse Stories
```bash
POST /api/analyse-stories
Content-Type: application/json

{
  "stories": [...],
  "month": "July 2026"
}
```
**Response:** Generated report with insights

### 3. Trigger Monthly Analysis
```bash
POST /api/trigger-monthly-analysis

{
  "month": "July 2026",
  "stories": [...]
}
```
**Response:** Saves report and returns it

### 4. Get Latest Report
```bash
GET /api/latest-report
```
**Response:** Most recent generated report

### 5. Formspree Webhook (Coming Soon)
```bash
POST /api/webhook/formspree
```
Receives story submissions from Formspree

---

## Troubleshooting

### "API key not found"
- Check `.env` file exists
- Verify `ANTHROPIC_API_KEY=sk-ant-...` is set
- Restart server: `npm start`

### "CORS error"
- Update `CORS_ORIGIN` in `.env`
- Make sure frontend and backend URLs match

### "Stories not being analysed"
- Check Claude API quota (https://console.anthropic.com)
- Verify stories array is not empty
- Check server logs: `npm start`

### "Out of quota"
- Free Claude API has monthly limits
- Upgrade at https://console.anthropic.com/account/billing
- Or implement rate limiting

---

## Cost Estimation

**Claude API Pricing:**
- Input: £0.003 per 1K tokens
- Output: £0.015 per 1K tokens

**Per-story cost:** ~£0.01-0.02
- 250 stories/month = £2.50-5.00

**Monthly budget:** £5-10 comfortably handles thousands of stories

---

## Security Best Practices

✅ **Do:**
- Keep API key in `.env` (never in code)
- Use HTTPS for production
- Validate all input
- Rate limit API calls
- Log errors for debugging

❌ **Don't:**
- Commit `.env` to git
- Share API key publicly
- Trust client-submitted data
- Leave debugging enabled in production
- Hardcode secrets in code

---

## Next Steps

1. ✅ Get Claude API key
2. ✅ Set up backend locally
3. ✅ Test with sample stories
4. ✅ Deploy to production
5. ✅ Connect frontend
6. ✅ Set up monthly automation
7. ✅ Monitor logs and costs
8. ✅ Gather feedback from users
9. ✅ Plan scaling strategy

---

## Support Resources

- **Claude API Docs:** https://docs.anthropic.com
- **Anthropic Status:** https://status.anthropic.com
- **Node.js Docs:** https://nodejs.org/docs
- **Express Docs:** https://expressjs.com

---

**Your Story Intelligence engine is now AI-powered.** 🚀

Every month, Claude will automatically analyse hundreds of youth stories, identify patterns, and generate insights that reveal what mainstream media misses.

The world is about to see what young people are actually experiencing.
