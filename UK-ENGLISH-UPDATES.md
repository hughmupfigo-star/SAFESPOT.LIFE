# UK English Updates — Story Intelligence

## Changes Made

All Story Intelligence files have been updated to use British English spelling and terminology.

### Updated Files:

1. **story-intelligence.html**
   - "analyze" → "analyse" ✓
   - "color" → "colour" (in CSS variables - already correct)
   - Updated descriptions and messaging

2. **story-intelligence.js**
   - Function renamed: `analyzeStoriesWithClaude()` → `analyseStoriesWithClaude()` ✓
   - API endpoint: `/api/analyze-stories` → `/api/analyse-stories` ✓
   - Added trigger function: `triggerMonthlyAnalysis()` ✓
   - Comments updated to British English ✓

3. **index.html**
   - "analyze" → "analyse" ✓
   - Updated description text ✓

4. **Backend (New Files)**
   - **server.js**: Full Claude API integration with British English ✓
   - Comments and error messages use British English ✓
   - Function names: `analyseStoriesWithClaude()` ✓

### British vs American English Guide:

| British | American |
|---------|----------|
| analyse | analyze |
| colour | color |
| centre | center |
| favourite | favorite |
| organisation | organization |
| realise | realize |
| utilise | utilize |
| initialise | initialize |
| optimise | optimize |
| behaviour | behavior |
| labour | labor |

### Terminology Updates:

- "monthly reports" → stays same (universal)
- "youth" → stays same (universal)
- "stories" → stays same (universal)
- Document language: British English throughout

---

## API Endpoint Changes

### Old (American):
```
POST /api/analyze-stories
POST /api/webhook/formspree
POST /api/trigger-monthly-analysis
```

### New (British):
```
POST /api/analyse-stories ✓
POST /api/webhook/formspree (unchanged - proper noun)
POST /api/trigger-monthly-analysis (unchanged - standard)
```

---

## Function Names Updated

### JavaScript:
```javascript
// OLD:
analyzeStoriesWithClaude()

// NEW:
analyseStoriesWithClaude() ✓
```

---

## Frontend Integration

### Update your story-intelligence.html calls:

```javascript
// OLD:
fetch('/api/analyze-stories', ...)

// NEW:
fetch('/api/analyse-stories', ...)  // ✓
```

The frontend (`story-intelligence.js`) already calls the correct endpoint.

---

## Testing the API

When you test, use the new endpoint:

```bash
curl -X POST http://localhost:3000/api/analyse-stories \
  -H "Content-Type: application/json" \
  -d '{...}'
```

✓ British English is now the standard across all SAFE Story Intelligence systems.

---

## Why This Matters

- **Brand consistency**: SAFE is UK-based
- **Professional tone**: British English sounds more authoritative in UK/Europe
- **User trust**: Young people in the UK recognise proper English
- **International appeal**: British English is understood globally

All file updates complete. Your Story Intelligence system now speaks proper British English. ✓
