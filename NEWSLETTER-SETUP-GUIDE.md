# SAFE Blog Newsletter Popup — Setup Guide

## Overview

You now have 3 files:
1. **newsletter-popup.html** — The popup UI (add to your blog pages)
2. **newsletter-popup.js** — The popup logic (handles showing, closing, form submission)
3. **NEWSLETTER-SETUP-GUIDE.md** — This file (instructions)

---

## How It Works

### User Journey:
1. Reader visits your blog post
2. After 30 seconds OR 50% scroll, popup appears
3. Reader enters email (and optionally name)
4. JavaScript captures the submission
5. Email sent to **your backend** → **Mailchimp API**
6. Email added to your "Blog Subscribers" audience in Mailchimp
7. You can now send newsletters to all subscribers

### Data Flow:
```
Blog Page → JavaScript Form Submit → Your Backend → Mailchimp API → Subscriber List
```

---

## Step 1: Add Popup to Blog Pages

### Add to blog.html:

Find the closing `</body>` tag near the bottom of **blog.html**, and add:

```html
<!-- Newsletter Popup -->
<div id="newsletter-popup" class="newsletter-popup">
  <!-- [Copy the entire popup HTML from newsletter-popup.html here] -->
</div>

<!-- Newsletter Scripts -->
<script src="newsletter-popup.js"></script>
```

### Add to Individual Blog Post Pages:

Do the same for each post:
- blog-therapy-privacy.html
- blog-free-courses.html
- blog-reverse-pitch.html
- blog-emancipation.html
- blog-mental-health-job-hunting.html
- blog-micro-credentialing.html
- blog-runaway-reality.html
- blog-mutual-aid-101.html

**Quick method:** Copy the entire `newsletter-popup.html` file content (from the `<div id="newsletter-popup">` to the closing `</style>`) and paste it into each page before the closing `</body>` tag.

Then add this script tag on each page:
```html
<script src="newsletter-popup.js"></script>
```

---

## Step 2: Set Up Your Backend (IMPORTANT)

You have 2 options. **Option 1 (recommended)** requires a backend. **Option 2** is simpler but less secure.

### Option 1: Backend API Endpoint (RECOMMENDED)

Your backend needs to accept POST requests at `/api/subscribe` and forward them to Mailchimp.

#### If you use Node.js/Express:

```javascript
// backend/routes/subscribe.js
const axios = require('axios');

app.post('/api/subscribe', async (req, res) => {
  const { email, name } = req.body;
  const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY;
  const MAILCHIMP_AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID;

  try {
    const response = await axios.post(
      `https://us1.api.mailchimp.com/3.0/lists/${MAILCHIMP_AUDIENCE_ID}/members`,
      {
        email_address: email,
        status: 'pending', // sends confirmation email
        merge_fields: {
          FNAME: name || 'Subscriber'
        }
      },
      {
        auth: {
          username: 'anystring',
          password: MAILCHIMP_API_KEY
        }
      }
    );

    res.json({ success: true, message: 'Subscribed!' });
  } catch (error) {
    console.error('Mailchimp error:', error);
    res.status(400).json({ error: 'Subscription failed' });
  }
});
```

#### If you use Python/Flask:

```python
# app.py
import requests
from flask import Flask, request, jsonify
import os

@app.route('/api/subscribe', methods=['POST'])
def subscribe():
    data = request.json
    email = data.get('email')
    name = data.get('name', 'Subscriber')
    
    mailchimp_api_key = os.environ.get('MAILCHIMP_API_KEY')
    mailchimp_audience_id = os.environ.get('MAILCHIMP_AUDIENCE_ID')
    
    try:
        response = requests.post(
            f'https://us1.api.mailchimp.com/3.0/lists/{mailchimp_audience_id}/members',
            json={
                'email_address': email,
                'status': 'pending',
                'merge_fields': {'FNAME': name}
            },
            auth=('anystring', mailchimp_api_key)
        )
        
        if response.status_code in [200, 201]:
            return jsonify({'success': True})
        else:
            return jsonify({'error': 'Failed'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

#### Environment Variables:

Create a `.env` file and add:
```
MAILCHIMP_API_KEY=your_api_key_here
MAILCHIMP_AUDIENCE_ID=your_audience_id_here
```

#### Where to find your credentials in Mailchimp:

1. **API Key:** Profile → Account → Security → API keys → Create new key
2. **Audience ID:** Audience → Manage Audience → Settings → Audience ID

---

### Option 2: Client-Side Mailchimp (Simpler, Less Secure)

If you don't have a backend, you can call Mailchimp directly from JavaScript (less secure, but works for testing):

Edit **newsletter-popup.js**:

1. Find this section (around line 78):
```javascript
// Option 1: Send to your backend (RECOMMENDED - more secure)
// Replace YOUR_BACKEND_URL with your actual backend endpoint

return fetch('/api/subscribe', {
```

2. **Comment it out** and **uncomment the "Option 2" section** below it:

```javascript
// Option 2: Direct to Mailchimp (for testing, less secure)
// Uncomment below and comment above to use this approach

const MAILCHIMP_AUDIENCE_ID = 'YOUR_AUDIENCE_ID_HERE';
const MAILCHIMP_API_KEY = 'YOUR_API_KEY_HERE';

const mailchimpUrl = `https://us1.api.mailchimp.com/3.0/lists/${MAILCHIMP_AUDIENCE_ID}/members`;
// ... rest of code
```

3. Replace the credentials with your actual ones from Mailchimp.

**⚠️ Warning:** This exposes your API key in the browser. Anyone can see it. Use Option 1 for production.

---

## Step 3: Test the Popup

1. Open your blog page in a browser
2. Wait 30 seconds OR scroll down 50%
3. Popup should appear
4. Enter an email address
5. Click "Subscribe"
6. Check your Mailchimp audience to see if the subscriber appeared

---

## Customization

### Change Popup Timing:

In **newsletter-popup.js**, find:
```javascript
setTimeout(() => {
  if (!popupShown) {
    showNewsletterPopup();
    popupShown = true;
  }
}, 30000); // 30 seconds
```

Change `30000` to milliseconds:
- 5 seconds = `5000`
- 15 seconds = `15000`
- 1 minute = `60000`

### Change Scroll Trigger:

Find:
```javascript
if (scrollPercentage > 50) {
```

Change `50` to any percentage (e.g., `30` for 30% scroll).

### Change Popup Text:

Edit the HTML in your blog pages:
```html
<h2 class="newsletter-title">Your custom title here</h2>
<p class="newsletter-subtitle">Your custom subtitle here</p>
```

---

## After Setup: Sending Newsletters

Once you have subscribers:

1. Go to **Mailchimp → Create Campaign**
2. Choose **Email**
3. Select your **"Blog Subscribers"** audience
4. Write your newsletter
5. Schedule or send immediately

You can send email updates about new blog posts, insights, or announcements.

---

## Troubleshooting

### Popup not appearing?
- Check browser console for JavaScript errors (F12 → Console)
- Make sure `newsletter-popup.js` is loading (check Network tab)
- Verify you didn't already subscribe (check localStorage)

### Form not submitting?
- Check if `/api/subscribe` endpoint exists and is responding
- Look at Network tab to see the request and response
- Check server logs for errors

### Subscriber not appearing in Mailchimp?
- Check spam/unconfirmed subscribers section
- Verify Audience ID and API Key are correct
- Ensure double opt-in is enabled (they need to confirm email)

### Email already exists error?
- Mailchimp will reject duplicate emails by default
- This is good — prevents spam
- User can update their subscription preference instead

---

## Next Steps

1. ✅ Add popup HTML to blog pages
2. ✅ Set up backend endpoint or client-side Mailchimp integration
3. ✅ Test with a test email address
4. ✅ Monitor Mailchimp dashboard for subscriber growth
5. ✅ Create your first newsletter campaign

Need help with any step? The files are ready to deploy.
