# Story Intelligence API — 5 Minute Setup

## What You Need

1. Claude API key (get free at https://console.anthropic.com)
2. Node.js installed (https://nodejs.org)
3. 5 minutes ⏱️

---

## Step 1: Get Your API Key (2 mins)

```bash
# Go to:
# https://console.anthropic.com

# Create account → API Keys → Create Key
# Copy the key (starts with sk-ant-)
```

**Save it somewhere safe.** You'll need it in Step 3.

---

## Step 2: Install Dependencies (1 min)

```bash
cd /path/to/safe/website/backend

npm install
```

---

## Step 3: Set Up Environment (1 min)

```bash
# Copy example file:
cp .env.example .env

# Edit .env and paste your API key:
# ANTHROPIC_API_KEY=sk-ant-YOUR-KEY-HERE
```

Open `.env` with any text editor and update:

```
ANTHROPIC_API_KEY=sk-ant-paste-your-key-here
PORT=3000
NODE_ENV=development
```

---

## Step 4: Start API (1 min)

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
```

✓ Your API is live!

---

## Step 5: Test It (Works Immediately)

### Open another terminal and run:

```bash
curl -X POST http://localhost:3000/api/analyse-stories \
  -H "Content-Type: application/json" \
  -d '{
    "stories": [
      {
        "location": "London",
        "title": "Mental Health Crisis",
        "category": "Mental Health & Wellbeing",
        "content": "Im struggling with anxiety and depression. My school has no counsellor.",
        "wordCount": 15
      }
    ],
    "month": "July 2026"
  }'
```

### You'll get back a report like:

```json
{
  "success": true,
  "report": {
    "month": "July 2026",
    "summary": "Youth report significant...",
    "topInsights": [...],
    "topicBreakdown": [...],
    ...
  }
}
```

✓ Claude is analysing your stories!

---

## That's It!

Your backend is running and analysing stories with Claude.

**Next:**
- Keep this running while developing
- When ready to deploy, see `API-INTEGRATION-GUIDE.md`
- Connect your frontend to `http://localhost:3000/api/analyse-stories`

---

## Useful Commands

```bash
# Stop the server:
Ctrl+C

# Restart:
npm start

# Install more packages:
npm install package-name

# See what's happening:
npm start
# Watch the console output

# Test with actual stories:
# Edit test-story.json and run the curl command above
```

---

## Quick Troubleshooting

**"API key not found"**
→ Make sure `.env` file exists with your key

**"Cannot find module"**
→ Run `npm install` again

**"Port 3000 already in use"**
→ Change PORT in `.env` to 3001

**"Claude API error"**
→ Check your API key is correct at https://console.anthropic.com

---

That's all! Your Story Intelligence API is ready. 🚀
