// Story Intelligence Data & Analysis
// This file manages monthly reports and insights from youth stories

const storyIntelligenceData = {
  reports: [
    {
      month: 'June 2026',
      period: 'June 1-30, 2026',
      summary: 'Youth voices reveal unprecedented mental health crisis alongside growing climate anxiety. Stories show resilience patterns emerging in community-led solutions.',
      stats: {
        totalStories: 247,
        countries: 42,
        avgLength: '680 words',
        categories: 11
      },
      topInsights: [
        {
          emoji: '🧠',
          category: 'Mental Health & Wellbeing',
          title: 'The Loneliness Epidemic',
          description: 'Over 60% of submitted stories mention isolation, anxiety, or depression. Young people report a disconnect between online connection and real relationships.',
          stat: '147 stories'
        },
        {
          emoji: '🌍',
          category: 'Environment & Nature',
          title: 'Climate Grief is Real',
          description: 'Emerging theme: eco-anxiety driving decisions about futures. Youth want climate action, not climate news about problems they can\'t solve.',
          stat: '89 stories'
        },
        {
          emoji: '📚',
          category: 'Education & Learning',
          title: 'School is Failing Neurodivergence',
          description: 'Stories reveal systemic failures in supporting ADHD, autism, dyslexia. Youth feel pathologized instead of accommodated.',
          stat: '76 stories'
        },
        {
          emoji: '💰',
          category: 'Poverty & Economics',
          title: 'Student Debt Before Graduation',
          description: 'Young people working multiple jobs just to afford basic living. Cost of education pricing youth out of opportunity.',
          stat: '64 stories'
        },
        {
          emoji: '🤝',
          category: 'Community & Belonging',
          title: 'Hunger for Real Belonging',
          description: 'Youth creating informal communities when institutions fail them. Peer-led support groups outperforming traditional mental health services.',
          stat: '92 stories'
        },
        {
          emoji: '⚖️',
          category: 'Inequality & Systems',
          title: 'Systemic Barriers Feel Permanent',
          description: 'Stories reveal how race, class, and disability compound. Youth feel systems are designed to exclude, not include.',
          stat: '71 stories'
        }
      ],
      topicBreakdown: [
        { name: 'Mental Health & Wellbeing', count: 147 },
        { name: 'Community & Belonging', count: 92 },
        { name: 'Environment & Nature', count: 89 },
        { name: 'Education & Learning', count: 76 },
        { name: 'Inequality & Systems', count: 71 },
        { name: 'Poverty & Economics', count: 64 },
        { name: 'Violence & Safety', count: 48 },
        { name: 'Culture & Identity', count: 41 },
        { name: 'Family & Relationships', count: 38 },
        { name: 'Drugs & Substance Use', count: 27 },
        { name: 'Other', count: 14 }
      ],
      mediaGaps: [
        {
          title: 'What Mainstream Media Missed',
          items: [
            'Mental health crisis is not about TikTok—it\'s about economic hopelessness and disconnection',
            'Climate anxiety affects daily decisions (career choices, having children, where to live)',
            'Neurodivergence is a strength being pathologized into a weakness by education systems',
            'Youth are already building solutions—media covers the problems, not the young builders',
            'Online connection ≠ community. Young people crave physical, local, real belonging'
          ]
        }
      ]
    },
    {
      month: 'May 2026',
      period: 'May 1-31, 2026',
      summary: 'Initial data shows clear patterns: youth concerns are structural, not individual. Stories reveal systemic failures in mental health, education, and economic opportunity.',
      stats: {
        totalStories: 189,
        countries: 38,
        avgLength: '625 words',
        categories: 11
      },
      topInsights: [
        {
          emoji: '🎓',
          category: 'Education & Learning',
          title: 'School System is Broken',
          description: 'Stories reveal curriculum designed for compliance, not learning. Young people feel education is preparation for corporate life, not meaningful work.',
          stat: '78 stories'
        },
        {
          emoji: '💼',
          category: 'Careers & Entrepreneurship',
          title: 'Gen Z Building Alternative Futures',
          description: 'Young people bypassing traditional careers. Creating freelance portfolios, starting micro-businesses, building digital products.',
          stat: '54 stories'
        },
        {
          emoji: '❤️',
          category: 'Mental Health & Wellbeing',
          title: 'Therapy Gap: Need vs. Access',
          description: 'Mental health support is either unaffordable or overbooked. Youth turning to peers, journaling, and online communities instead.',
          stat: '112 stories'
        },
        {
          emoji: '🏠',
          category: 'Poverty & Economics',
          title: 'Housing Crisis Shaping Futures',
          description: 'Young people delaying independence due to unaffordable housing. Intergenerational poverty harder to escape.',
          stat: '58 stories'
        },
        {
          emoji: '🤝',
          category: 'Community & Belonging',
          title: 'Local Community is Dying',
          description: 'Youth notice absence of third spaces. Parks are empty, community centers are closed. Shopping malls are not connection.',
          stat: '71 stories'
        },
        {
          emoji: '🌈',
          category: 'Culture & Identity',
          title: 'Identity Exploration in Uncertain Times',
          description: 'Young people navigating identity (gender, sexuality, culture) while systems resist change. Finding belonging in online communities.',
          stat: '43 stories'
        }
      ],
      topicBreakdown: [
        { name: 'Mental Health & Wellbeing', count: 112 },
        { name: 'Education & Learning', count: 78 },
        { name: 'Community & Belonging', count: 71 },
        { name: 'Poverty & Economics', count: 58 },
        { name: 'Careers & Entrepreneurship', count: 54 },
        { name: 'Culture & Identity', count: 43 },
        { name: 'Environment & Nature', count: 38 },
        { name: 'Inequality & Systems', count: 35 },
        { name: 'Violence & Safety', count: 32 },
        { name: 'Family & Relationships', count: 28 },
        { name: 'Drugs & Substance Use', count: 19 }
      ],
      mediaGaps: [
        {
          title: 'What Mainstream Media Missed',
          items: [
            'Young people are building solutions, not just complaining about problems',
            'Mental health is economic, not just chemical. Hopelessness comes from systemic barriers',
            'School is failing young people in ways that go beyond what news outlets discuss',
            'Youth are creating their own communities because institutions have abandoned them',
            'Climate action is a lived reality for young people, not an abstract political issue'
          ]
        }
      ]
    }
  ]
};

// Function to render reports
function renderReports() {
  const container = document.getElementById('reportsContainer');
  const loadingMessage = document.getElementById('loadingMessage');

  if (loadingMessage) {
    loadingMessage.remove();
  }

  storyIntelligenceData.reports.forEach(report => {
    const reportHTML = `
      <div class="month-report">
        <div class="report-header">
          <p class="report-month">${report.month}</p>
          <h2 class="report-title">${report.summary}</h2>
          <p style="font-size: 14px; color: var(--mid); margin-top: 16px;">${report.period}</p>
        </div>

        <div class="report-stats">
          <div class="stat-card">
            <div class="stat-number">${report.stats.totalStories}</div>
            <div class="stat-label">Stories Submitted</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${report.stats.countries}</div>
            <div class="stat-label">Countries</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${report.stats.avgLength}</div>
            <div class="stat-label">Avg. Story Length</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${report.stats.categories}</div>
            <div class="stat-label">Categories</div>
          </div>
        </div>

        <div>
          <p style="font-family: var(--mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--mid); margin-bottom: 32px; font-weight: 500;">Top Insights</p>
          <div class="insights-grid">
            ${report.topInsights.map(insight => `
              <div class="insight-card">
                <span class="insight-emoji">${insight.emoji}</span>
                <p class="insight-category">${insight.category}</p>
                <h3 class="insight-title">${insight.title}</h3>
                <p class="insight-desc">${insight.description}</p>
                <p class="insight-stat">${insight.stat}</p>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="topic-breakdown">
          <h3 class="breakdown-title">Story Categories Breakdown</h3>
          <div class="topic-list">
            ${report.topicBreakdown.map(topic => `
              <div class="topic-item">
                <span class="topic-name">${topic.name}</span>
                <span class="topic-count">${topic.count}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="background: var(--off); padding: 40px; border-radius: 4px; margin-bottom: 0;">
          <h3 style="font-size: 18px; font-weight: 400; margin-bottom: 20px;">How Mainstream Media Got It Wrong</h3>
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${report.mediaGaps[0].items.map(item => `
              <li style="padding: 12px 0; border-bottom: 1px solid var(--border); font-size: 14px; line-height: 1.6;">
                <strong style="color: var(--black);">→</strong> ${item}
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    `;

    container.insertAdjacentHTML('beforeend', reportHTML);
  });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  renderReports();
});

// ============================================
// CLAUDE API INTEGRATION (Automated Analysis)
// ============================================

async function analyseStoriesWithClaude(stories) {
  try {
    // Point to your backend API
    const API_URL = 'http://localhost:3001';
    
    const response = await fetch(`${API_URL}/api/analyse-stories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stories })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const analysis = await response.json();
    return analysis;
  } catch (error) {
    console.error('Error analysing stories:', error);
    return null;
  }
}

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const analysis = await response.json();
    return analysis;
  } catch (error) {
    console.error('Error analysing stories:', error);
    return null;
  }
}

// Add new report to dashboard
function addMonthlyReport(month, analysis) {
  if (!analysis) return;

  const newReport = {
    month: month,
    period: `${month} 1-30, 2026`,
    summary: analysis.summary,
    stats: analysis.stats,
    topInsights: analysis.topInsights,
    topicBreakdown: analysis.topicBreakdown,
    mediaGaps: analysis.mediaGaps
  };

  storyIntelligenceData.reports.unshift(newReport);
  renderReports();
}

// Trigger monthly analysis (call from your backend scheduler)
async function triggerMonthlyAnalysis(month, storiesData) {
  console.log(`Triggering analysis for ${month}...`);
  const analysis = await analyseStoriesWithClaude(storiesData);

  if (analysis) {
    addMonthlyReport(month, analysis);
    console.log(`✓ Report generated for ${month}`);
    return true;
  } else {
    console.error(`✗ Failed to generate report for ${month}`);
    return false;
  }
}
