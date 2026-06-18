require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Story Intelligence API' });
});

// Main analysis endpoint
app.post('/api/analyse-stories', async (req, res) => {
  try {
    const { stories, month } = req.body;

    if (!stories || stories.length === 0) {
      return res.status(400).json({ error: 'No stories provided' });
    }

    console.log(`\n📊 Analysing ${stories.length} stories for ${month}...`);

    const storiesSummary = stories.map((story, idx) => {
      return `
Story ${idx + 1}:
- Title: ${story.title || 'Untitled'}
- Location: ${story.location || 'Unknown'}
- Category: ${story.category || 'Other'}
- Content: ${story.content?.substring(0, 300)}...
      `.trim();
    }).join('\n\n---\n\n');

    const analysisPrompt = `
You are a data analyst for SAFE. Analyse these ${stories.length} youth stories and provide:

1. A summary (1-2 sentences)
2. Exactly 6 KEY INSIGHTS with emoji, category, title, description, and story count
3. Category breakdown with counts
4. 5-6 things MAINSTREAM MEDIA IS MISSING

Return ONLY valid JSON:
{
  "summary": "...",
  "topInsights": [
    {
      "emoji": "🧠",
      "category": "Mental Health & Wellbeing",
      "title": "Finding",
      "description": "...",
      "stat": "X stories"
    }
  ],
  "topicBreakdown": [
    {"name": "Category", "count": 50}
  ],
  "mediaGaps": {
    "title": "What Mainstream Media Missed",
    "items": ["gap 1", "gap 2"]
  }
}

STORIES:
${storiesSummary}
    `;

    const response = await client.messages.create({
      model: 'claude-opus-4.6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: analysisPrompt }]
    });

    const analysisText = response.content[0].text;
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from Claude');
    }

    const analysis = JSON.parse(jsonMatch[0]);

    const report = {
      month: month || new Date().toLocaleString('en-GB', { month: 'long', year: 'numeric' }),
      summary: analysis.summary,
      stats: {
        totalStories: stories.length,
        countries: new Set(stories.map(s => s.location)).size,
        avgLength: Math.round(stories.reduce((sum, s) => sum + (s.wordCount || 0), 0) / stories.length) + ' words',
        categories: 11
      },
      topInsights: analysis.topInsights,
      topicBreakdown: analysis.topicBreakdown,
      mediaGaps: [analysis.mediaGaps]
    };

    console.log('✓ Analysis complete');
    res.json({ success: true, report: report });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║     SAFE Story Intelligence API                  ║
║     Port: ${PORT}                                      ║
║     Status: Running ✓                            ║
╚═══════════════════════════════════════════════════╝

Test: curl http://localhost:${PORT}/health
  `);
});