# Story Intelligence — Quick Start Guide

## 🚀 What's Live Right Now

Your Story Intelligence system is **fully implemented** and live:

1. **Dashboard:** https://yoursite.com/story-intelligence.html
2. **Homepage feature:** New "Story Intelligence" section on index.html
3. **Navigation:** "Intelligence" link in main nav on all pages
4. **Sample data:** June 2026 and May 2026 reports with 6 key insights each

---

## 📊 How It Works

```
YOUTH SUBMITS STORY
        ↓
Form at youth-stories.html
        ↓
Story arrives in your email (stories@safespot.life)
        ↓
YOU: Review story + note patterns
        ↓
Monthly: Analyze all stories from month
        ↓
Update story-intelligence.js with findings
        ↓
Dashboard auto-updates with new report
        ↓
Visitors see latest insights
```

---

## ✏️ How to Update Monthly Reports

### Every Month (Takes ~30 mins):

1. **Collect stories** from Formspree dashboard
2. **Export as JSON** or CSV
3. **Read through** and note themes/patterns
4. **Count category totals** (mental health, education, etc.)
5. **Identify 6 big insights** with supporting data
6. **Update story-intelligence.js:**

```javascript
// In story-intelligence.js, add new report to TOP of reports array:

{
  month: 'July 2026',
  period: 'July 1-31, 2026',
  summary: 'Your key finding in 1-2 sentences',
  stats: {
    totalStories: 240,
    countries: 42,
    avgLength: '650 words',
    categories: 11
  },
  topInsights: [
    {
      emoji: '🧠',
      category: 'Mental Health & Wellbeing',
      title: 'Your Insight Title',
      description: 'What you found. Why it matters. What it means.',
      stat: '145 stories'
    },
    // ... 5 more insights
  ],
  topicBreakdown: [
    { name: 'Mental Health & Wellbeing', count: 145 },
    // ... all 11 categories
  ],
  mediaGaps: [
    {
      title: 'What Mainstream Media Missed',
      items: [
        'Key pattern that news outlets don\'t cover',
        'Another pattern...',
      ]
    }
  ]
}
```

7. **Push to production**
8. **Done!** Dashboard updates automatically

---

## 💡 Insight Formula

**Good insights follow this pattern:**

```
[EMOJI] [CATEGORY] | [TITLE] 
"[Specific finding from stories]"
"[Why it matters]"
"[What youth actually need]"

STAT: [Number] stories mention this
```

**Example (what we already have):**

🧠 Mental Health & Wellbeing | The Loneliness Epidemic
"Over 60% of youth stories mention isolation, anxiety, or depression."
"Real relationships matter more than online connection."
"Youth are seeking actual community, not just digital interaction."

STAT: 147 stories

---

## 📈 Sample Data to Collect Each Month

**From story submissions:**

1. Total number of stories
2. Countries represented
3. Average story length (word count)
4. Breakdown by category:
   - Education & Learning
   - Mental Health & Wellbeing
   - Environment & Nature
   - Poverty & Economics
   - Community & Belonging
   - Violence & Safety
   - Inequality & Systems
   - Culture & Identity
   - Drugs & Substance Use
   - Family & Relationships
   - Other

5. **Themes** (appear in 3+ stories):
   - What's the pattern?
   - How many stories mention it?
   - What's the sentiment? (positive/negative/mixed)

6. **Media gaps**:
   - What are stories talking about that news isn't?
   - What's the biggest overlooked issue?

---

## 🤖 Future: Automate with Claude API

When you're ready to automate (Month 3+):

### Option 1: Manual → Semi-Automated
- Use Claude API in a one-off analysis
- API does pattern recognition
- You write the insights based on findings
- Takes 15 mins instead of 30 mins

### Option 2: Fully Automated
- Set up backend that runs monthly
- Claude analyzes all stories automatically
- Report generates and deploys
- You just review and approve

### Option 3: Real-Time Dashboard
- Build admin dashboard
- Trigger analysis anytime
- See insights generate in real-time
- Most powerful but most complex

**We have the commented code ready in story-intelligence.js** — uncomment when you're ready!

---

## 💰 Revenue Opportunity

### Who buys Story Intelligence reports?

1. **Youth councils & government** — £500-2000/report
2. **NGOs** — £300-1500/custom analysis
3. **Universities & researchers** — £200-1000/dataset
4. **Media & journalists** — £100-500/report
5. **Schools** — £50-300/access (bulk subscriptions)

### Your pricing could be:
- **Free:** Top 3 insights on website
- **£99/month:** Full monthly report + archive
- **£299/month:** Reports + raw data + custom analysis
- **Custom:** Bespoke research (£1000+)

---

## 📅 Timeline

| Month | Action |
|-------|--------|
| **Now** | Dashboard is live. Start collecting stories. |
| **Month 1** | Collect 50+ stories. Get comfortable with Formspree. |
| **Month 2** | Publish first manual report (June/July 2026). |
| **Month 3** | Decide on automation strategy. Set up Claude API if interested. |
| **Month 4** | First automated report. Start customer outreach. |
| **Month 6** | First paying customer? |
| **Month 12** | Thousands of stories analyzed. Industry recognition. |

---

## 🔗 Files Modified/Created

- ✅ **story-intelligence.html** — Main dashboard page
- ✅ **story-intelligence.js** — Data & report rendering
- ✅ **index.html** — Added Intelligence section + nav link
- ✅ **styles.css** — Dark mode auto-applied
- ✅ **youth-stories.html** — Already feeding data in

---

## 🎯 Next Actions

### This Week:
1. Review the dashboard at `/story-intelligence.html`
2. Share link with your team
3. Start promoting "Submit Your Story" button
4. Watch stories come in from youth-stories.html

### Next Month:
1. Download stories from Formspree
2. Analyze patterns (3-5 hours work)
3. Write first real monthly report
4. Update story-intelligence.js
5. Publish new report on dashboard

### Month 3:
1. Decide on Claude API automation
2. Plan outreach to potential customers
3. Create basic sales pitch deck
4. Reach out to 5 potential customers

---

## 🎨 Design Philosophy

The dashboard is **intentionally clean**:
- Focus on data, not design
- Readable dark mode
- Mobile-responsive
- Fast to load
- Easy to update

This is a **tool for change**, not a showcase. The insights matter more than how pretty they look.

---

## ❓ FAQ

**Q: What if I don't have 100+ stories yet?**
A: Publish what you have. Even 20 stories showing real patterns is valuable. Quality > quantity.

**Q: Can I show partial/incomplete reports?**
A: Yes! You can say "First 30 days of data" or "Preliminary findings from 45 stories."

**Q: What about privacy?**
A: Stories are anonymized in reports. Never quote a full story without permission. Numbers only.

**Q: How often should I publish reports?**
A: Monthly is ideal (predictable). But quarterly works too if you have fewer stories.

**Q: Can I change the insights/categories?**
A: Yes! Customize the 6 insights to what you're actually seeing. The template is flexible.

---

## 📞 Support

If you need to:
- Add Claude API integration → See STORY-INTELLIGENCE-SETUP.md
- Change the dashboard design → Edit story-intelligence.html
- Modify categories → Update the topicBreakdown array in story-intelligence.js
- Connect to a database → Reference the commented API code in story-intelligence.js

---

**You now have a world-class data intelligence platform that most NGOs would pay thousands for. Start using it.** 🚀
