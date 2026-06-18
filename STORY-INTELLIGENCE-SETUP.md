# Story Intelligence — Implementation Guide

## Overview
Story Intelligence is SAFE's AI-powered service that analyses real youth stories to reveal what mainstream media misses. It's the core insight engine that makes SAFE's platform unique.

## What's Implemented

### 1. **Frontend (Completed)**
- ✅ `story-intelligence.html` — Dashboard page showing monthly reports
- ✅ `story-intelligence.js` — Data management and report rendering (with Claude API integration ready)
- ✅ Navigation integration on all pages
- ✅ Featured section on `index.html`
- ✅ Dark mode support

### 2. **Sample Data (Completed)**
- June 2026 report: 247 stories, 6 key insights
- May 2026 report: 189 stories, 6 key insights
- Category breakdowns for each month
- "How Mainstream Media Got It Wrong" section

### 3. **Data Flow (Ready to Integrate)**
```
Youth Stories → Formspree → GoDaddy Email
                              ↓
                    [Claude API Analysis]
                              ↓
                    Backend: Generate Report JSON
                              ↓
                    story-intelligence.js receives data
                              ↓
                    Dashboard Displays Report
```

---

## Phase 1: Manual Operation (Months 1-2)

### What to do each month:

1. **Collect stories** from youth-stories.html form
2. **Download submissions** from Formspree (formspree.io dashboard)
3. **Manually review** stories for themes, patterns, insights
4. **Update** story-intelligence.js with new monthly data
5. **Push live** and watch dashboard update automatically

**File to edit:** `/story-intelligence.js`

**Example update structure:**
```javascript
{
  month: 'July 2026',
  period: 'July 1-31, 2026',
  summary: '[Your analysis summary]',
  stats: {
    totalStories: 250,
    countries: 45,
    avgLength: '680 words',
    categories: 11
  },
  topInsights: [
    {
      emoji: '[emoji]',
      category: '[category name]',
      title: '[insight title]',
      description: '[2-3 sentence description]',
      stat: '[number] stories'
    }
    // ... 5 more insights
  ],
  topicBreakdown: [
    { name: '[category]', count: [number] },
    // ...
  ],
  mediaGaps: [
    {
      title: 'What Mainstream Media Missed',
      items: ['point 1', 'point 2', ...]
    }
  ]
}
```

---

## Phase 2: AI-Powered Automation (Months 3+)

### Option A: Claude API (Recommended)

**Goal:** Automatically analyze stories with Claude to generate monthly reports.

**Setup:**

1. **Get Claude API key**
   - Go to https://console.anthropic.com
   - Create account (if needed)
   - Get API key

2. **Create backend endpoint** (Node.js example)
   ```javascript
   // backend/analyze-stories.js
   const Anthropic = require("@anthropic-ai/sdk");

   exports.analyzeStories = async (req, res) => {
     const { stories } = req.body;
     
     const client = new Anthropic();
     
     const prompt = `Analyze these youth stories and provide:
     1. Top 6 insights (with emoji, category, title, description)
     2. Category breakdown with counts
     3. What mainstream media is missing
     
     Stories: ${JSON.stringify(stories)}
     
     Return JSON format`;
     
     const response = await client.messages.create({
       model: "claude-opus-4.6",
       max_tokens: 2000,
       messages: [{ role: "user", content: prompt }]
     });
     
     res.json(JSON.parse(response.content[0].text));
   };
   ```

3. **Set up monthly automation**
   - Use node-cron or a service like Vercel Cron
   - Run analysis on 1st of month
   - Update story-intelligence.js with results
   - Deploy automatically

### Option B: Zapier/Make Integration

1. **Collect stories in Airtable** from Formspree
2. **Use Zapier to trigger** Claude API analysis
3. **Auto-generate report** and send to you
4. **You update story-intelligence.js manually** (simpler than Option A)

### Option C: Custom Dashboard with Real-Time Analysis

**Most advanced option:**

1. **Collect stories in database** (Supabase, Firebase, etc.)
2. **Create admin dashboard** to trigger analysis
3. **Display live insights** as reports generate
4. **Automatically update** public story-intelligence page

---

## How to Update Reports

### Simple Method (Edit JSON directly):

1. Open `/story-intelligence.js`
2. Add new report object to `storyIntelligenceData.reports` array
3. New report appears at top of dashboard automatically
4. Push to production

### Using Claude API to Generate Report:

```javascript
// Example: Call Claude to analyze stories
async function generateMonthlyReport(stories, month) {
  const response = await fetch('/api/analyze-stories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stories, month })
  });
  
  const analysis = await response.json();
  
  // Format as report object
  const newReport = {
    month: month,
    period: `${month} 1-31, 2026`,
    summary: analysis.summary,
    stats: analysis.stats,
    topInsights: analysis.topInsights,
    topicBreakdown: analysis.topicBreakdown,
    mediaGaps: analysis.mediaGaps
  };
  
  // Add to story-intelligence.js
  // (or save to database)
  return newReport;
}
```

---

## Selling Story Intelligence Reports

### Who Pays for This?

1. **Government agencies** — Education departments, Youth councils
2. **NGOs** — Barnardo's, SaveTheChildren, local youth orgs
3. **Researchers** — Universities, think tanks
4. **Media outlets** — Publishers wanting authentic youth data
5. **Schools** — As research/curriculum resource
6. **Foundations** — Funding youth initiatives

### Pricing Model:

- **Free:** Monthly highlights on website (3-5 top insights)
- **Basic ($99/mo):** Full monthly report + archive access
- **Pro ($299/mo):** Reports + raw data export + custom analysis
- **Enterprise:** Custom reports on demand

### What to Include in Paid Reports:

- Executive summary (1 page)
- Top 10 insights with story quotes
- Category breakdown with visualizations
- Media gap analysis
- Emerging issues & early warning signals
- Raw data (anonymized story counts by region/category)
- Trend analysis (month-over-month changes)

---

## Measuring Success

Track these metrics:

1. **Data Quality**
   - Stories submitted per month
   - Average story length
   - Countries represented
   - Repeat contributors

2. **Impact**
   - Stories used in policy recommendations
   - Media outlets citing your insights
   - NGOs changing programs based on data
   - Schools using reports in curriculum

3. **Business**
   - Paid report subscriptions
   - Custom analysis requests
   - Speaking engagement offers
   - Research partnerships

---

## Integration with Other SAFE Features

### Youth Stories Form (youth-stories.html)
→ Feeds into monthly analysis

### News Page (news.html)
→ Can feature stories from Story Intelligence

### Courses (course.html)
→ Can reference insights in course content

### Shop (shop.html)
→ Can create data-driven product
(e.g., "The State of Youth" zine with monthly reports)

---

## Next Steps

### This Month:
1. ✅ Set up Story Intelligence dashboard
2. ✅ Add navigation integration
3. ✅ Add featured section to homepage
4. 📝 Start collecting stories via youth-stories.html

### Next Month:
1. Review first 50+ stories
2. Manually analyze patterns and themes
3. Update story-intelligence.js with July 2026 report
4. Measure engagement (page views, time on page)

### Month 3:
1. Decide on Claude API integration (Option A, B, or C)
2. Set up automation if pursuing Option A
3. Plan first customer outreach
4. Create pitch deck for selling reports

---

## Technical Notes

- Dashboard is fully responsive (mobile, tablet, desktop)
- Dark mode fully supported
- No database required initially (uses JS arrays)
- Can scale to 1000+ reports without performance issues
- Easy to migrate to database later (Supabase, Firebase, etc.)

---

## Questions?

- Claude API setup: https://docs.anthropic.com
- Formspree integration: https://formspree.io/docs
- Custom analysis requirements: Think about exactly what you want Claude to extract
