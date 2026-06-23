// SAFESPOT.LIFE — Worker entry (Workers Static Assets).
// Serves the static site via the ASSETS binding and handles dynamic routes.
//   POST /api/stories  -> store a youth-story submission (D1 + Turnstile + Resend)
// Everything else falls through to the static files.
//
// Bindings (wrangler.toml):  ASSETS, DB (D1), optional STORY_UPLOADS (R2)
// Secrets (dashboard -> Variables and secrets):  TURNSTILE_SECRET_KEY, RESEND_API_KEY
// Vars:  NOTIFY_EMAIL, FROM_EMAIL, IP_SALT

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/stories') {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });
      if (request.method === 'POST') return handleStories(request, env);
      return json({ error: 'Method not allowed' }, 405);
    }

    if (url.pathname === '/api/tts') {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });
      if (request.method === 'POST') return handleTTS(request, env, ctx);
      return json({ error: 'Method not allowed' }, 405);
    }

    if (url.pathname === '/api/translate-letter') {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });
      if (request.method === 'POST') return handleTranslateLetter(request, env);
      return json({ error: 'Method not allowed' }, 405);
    }

    if (url.pathname === '/api/news-submit') {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });
      if (request.method === 'POST') return handleNewsSubmit(request, env);
      return json({ error: 'Method not allowed' }, 405);
    }

    if (url.pathname === '/api/news-list') {
      if (request.method === 'GET') return handleNewsList(request, env);
      return json({ error: 'Method not allowed' }, 405);
    }

    if (url.pathname === '/api/news-file') {
      if (request.method === 'GET') return handleNewsFile(request, env);
      return json({ error: 'Method not allowed' }, 405);
    }

    if (url.pathname === '/api/comments') {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });
      if (request.method === 'GET') return handleCommentsList(request, env);
      if (request.method === 'POST') return handleCommentPost(request, env);
      return json({ error: 'Method not allowed' }, 405);
    }

    if (url.pathname === '/api/comments-approve') {
      if (request.method === 'GET') return handleCommentApprove(request, env);
      return json({ error: 'Method not allowed' }, 405);
    }

    // Not an API route -> serve the static site
    return env.ASSETS.fetch(request);
  },
};

const cors = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
});

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...cors() } });

async function handleStories(request, env) {
  try {
    const form = await request.formData();
    const ip = request.headers.get('CF-Connecting-IP') || '';

    // 1. Spam check (Turnstile)  [TEMP DEBUG: surfaces the real reason]
    if (env.TURNSTILE_SECRET_KEY) {
      const token = form.get('cf-turnstile-response');
      const result = await verifyTurnstile(token, env.TURNSTILE_SECRET_KEY, ip);
      if (!result.success) {
        const codes = (result['error-codes'] || []).join(', ') || 'none';
        const tok = token ? ('present(' + token.toString().length + ' chars)') : 'MISSING';
        return json({ error: 'Spam check failed [debug: token=' + tok + '; codes=' + codes + ']' }, 400);
      }
    }

    // 2. Fields + validation
    const f = (k) => (form.get(k) || '').toString().trim();
    const name = f('name'), email = f('email'), location = f('location');
    const ageNum = parseInt(f('age'), 10);
    const storyTitle = f('storyTitle'), category = f('category');
    const storyContent = f('storyContent'), anonymity = f('anonymity');

    if (!name || !email || !storyContent) return json({ error: 'Please fill in all required fields.' }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Please enter a valid email.' }, 400);

    // 3. Optional file -> R2 (only if a bucket is bound)
    let fileKey = null;
    const file = form.get('storyFile');
    if (file && typeof file === 'object' && file.size > 0) {
      if (file.size > 10 * 1024 * 1024) return json({ error: 'Attached file is over 10 MB.' }, 400);
      if (env.STORY_UPLOADS) {
        fileKey = `stories/${Date.now()}-${crypto.randomUUID()}-${safeName(file.name)}`;
        await env.STORY_UPLOADS.put(fileKey, file.stream(), { httpMetadata: { contentType: file.type } });
      }
    }

    // 4. Store in D1
    const ipHash = await sha256(ip + (env.IP_SALT || 'safe'));
    if (env.DB) {
      await env.DB.prepare(
        `INSERT INTO stories
           (name,email,location,age,story_title,category,story_content,anonymity,file_key,ip_hash,user_agent)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(
        name, email, location, Number.isNaN(ageNum) ? null : ageNum,
        storyTitle, category, storyContent, anonymity, fileKey, ipHash,
        request.headers.get('User-Agent') || ''
      ).run();
    }

    // 5. Notify by email (Resend)
    if (env.RESEND_API_KEY && env.NOTIFY_EMAIL) {
      await notify(env, { name, email, location, age: ageNum, storyTitle, category, storyContent, anonymity, fileKey });
    }

    return json({ ok: true });
  } catch (err) {
    return json({ error: 'Something went wrong saving your story. Please try again.' }, 500);
  }
}

async function verifyTurnstile(token, secret, ip) {
  if (!token) return { success: false, 'error-codes': ['missing-input-response'] };
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token.toString());
  if (ip) body.append('remoteip', ip);
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  return await r.json().catch(() => ({ success: false, 'error-codes': ['siteverify-parse-failed'] }));
}

async function notify(env, s) {
  const text = [
    'New youth story submission', '',
    `From:        ${s.name} <${s.email}>`,
    `Location:    ${s.location || '—'}`,
    `Age:         ${Number.isNaN(s.age) ? '—' : s.age}`,
    `Title:       ${s.storyTitle || '—'}`,
    `Category:    ${s.category || '—'}`,
    `Publish as:  ${s.anonymity || '—'}`,
    `Attachment:  ${s.fileKey ? s.fileKey : 'none'}`, '',
    '--- Story ---', s.storyContent,
  ].join('\n');
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.FROM_EMAIL || 'SAFE Stories <stories@safespot.life>',
      to: [env.NOTIFY_EMAIL],
      reply_to: s.email,
      subject: `New story: ${s.storyTitle || 'Untitled'} (${s.category || 'uncategorised'})`,
      text,
    }),
  });
}

function safeName(n) { return (n || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80); }
// ---- Text-to-speech proxy (OpenAI neural voice, edge-cached) ----------------
const TTS_ALLOWED_HOSTS = ['safespot.life', 'www.safespot.life'];

function ttsOriginOk(request) {
  const o = request.headers.get('Origin') || request.headers.get('Referer') || '';
  if (!o) return true; // same-origin requests may omit Origin
  try {
    const h = new URL(o).hostname;
    return TTS_ALLOWED_HOSTS.includes(h) || h.endsWith('.pages.dev') || h.endsWith('.workers.dev') || h === 'localhost';
  } catch (e) { return false; }
}

async function handleTTS(request, env, ctx) {
  try {
    if (!env.OPENAI_API_KEY) return json({ error: 'TTS not configured' }, 503);
    if (!ttsOriginOk(request)) return json({ error: 'Forbidden' }, 403);

    const body = await request.json().catch(() => ({}));
    let text = (body.text || '').toString().trim();
    if (!text) return json({ error: 'No text' }, 400);
    if (text.length > 3000) text = text.slice(0, 3000);

    const model = env.TTS_MODEL || 'gpt-4o-mini-tts';
    const voice = (body.voice || env.TTS_VOICE || 'nova').toString();

    // Edge cache by content hash so repeat plays cost nothing and load instantly.
    const key = await sha256(model + '|' + voice + '|' + text);
    const cacheUrl = new URL(request.url);
    cacheUrl.pathname = '/api/tts-cache/' + key;
    const cacheReq = new Request(cacheUrl.toString(), { method: 'GET' });
    const cache = caches.default;
    const hit = await cache.match(cacheReq);
    if (hit) return hit;

    const payload = { model, voice, input: text, response_format: 'mp3' };
    if (env.TTS_INSTRUCTIONS) payload.instructions = env.TTS_INSTRUCTIONS;

    const r = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      return json({ error: 'TTS upstream failed', status: r.status, detail: detail.slice(0, 300) }, 502);
    }
    const audio = await r.arrayBuffer();
    const resp = new Response(audio, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
        ...cors(),
      },
    });
    ctx.waitUntil(cache.put(cacheReq, resp.clone()));
    return resp;
  } catch (err) {
    return json({ error: 'TTS error' }, 500);
  }
}

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

// ---- Letter Translator -------------------------------------------------------
// POST /api/translate-letter — reads a letter (pasted text, a photo, or a PDF),
// explains it in plain English (optionally translated), and says what to do.
// Privacy: nothing is stored or logged. Sent to the Anthropic API, then dropped.
// Secret:  wrangler secret put ANTHROPIC_API_KEY
const TL_MODEL = 'claude-haiku-4-5-20251001';
const TL_MAX_OUTPUT_TOKENS = 2000;
const TL_MAX_TEXT = 12000;
const TL_MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB decoded
const TL_ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const TL_LANGS = {
  en: 'English', ar: 'Arabic', fa: 'Persian (Farsi)', ps: 'Pashto', ku: 'Kurdish (Sorani)',
  pl: 'Polish', ro: 'Romanian', ru: 'Russian', uk: 'Ukrainian', so: 'Somali', ti: 'Tigrinya',
  am: 'Amharic', sq: 'Albanian', ur: 'Urdu', pa: 'Punjabi', bn: 'Bengali', gu: 'Gujarati',
  fr: 'French', es: 'Spanish', pt: 'Portuguese', vi: 'Vietnamese', zh: 'Chinese (Simplified)', tr: 'Turkish',
};

function tlBase64Bytes(b64) {
  if (typeof b64 !== 'string') return 0;
  const pad = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - pad;
}

function tlSystemPrompt(targetLangName) {
  const base = `You are SAFE's Letter Translator. A young person (likely 16-25) has sent an official letter they're struggling to understand — as pasted text, a photo, or a scan. Read it carefully and explain it in plain English, then tell them what to do.

If the letter is an image or PDF, read ALL of the text — including the letterhead, headings, small print, dates, reference numbers, and any handwriting. If part of the image is blurry or cut off, do your best and note in "watch_out_for" that some of it was hard to read.

Output ONE valid JSON object. No preamble, no code fences, no commentary. Use this exact shape:

{
  "letter_type": "string - what kind of letter this is, 6 words or fewer",
  "summary": "string - 2-3 short sentences. What this letter is actually saying, in plain English.",
  "key_dates": [{"date": "string - human readable", "what": "string - what happens by/on this date"}],
  "what_to_do": ["string - concrete action, in priority order"],
  "your_rights": "string - 1-2 sentences on rights/protections relevant here",
  "who_to_call": [{"name": "string", "phone": "string with spaces between digits", "when_to_use": "string - brief"}],
  "watch_out_for": "string - sketchy details, missed deadlines, common traps, or parts that were hard to read. Empty string if nothing notable."
}

RULES:
- British English by default. Plain language. No jargon.
- Translate legalese ("hereby", "pursuant to", "without prejudice", "Section 21", "Notice Seeking Possession") into normal words.
- Pull every deadline into key_dates. Format as readable, e.g. "25 August 2026".
- Always include at least one item in what_to_do, even if it's just "double-check who actually sent this".
- For housing / eviction / Section 21 / county court / possession: include Shelter (0808 800 4444).
- For benefits / Universal Credit / sanctions / Job Centre: include Citizens Advice (0800 144 8848).
- For court / possession order / county court / bailiffs: include Shelter PLUS LawWorks (free legal clinics, lawworks.org.uk).
- For debt / bailiff / CCJ: include StepChange (0800 138 1111).
- For mental health crisis raised in letter: include Samaritans (116 123) or text SHOUT to 85258.
- For under-18 anything: include Childline (0800 1111). Remind them their council CANNOT lawfully refuse to accommodate them under the Children Act 1989 section 20.
- For immigration / asylum / Home Office: include Refugee Council (020 7346 6700).
- For SEND / school exclusion: include IPSEA (0800 018 4016).
- For domestic violence / abuse mentioned: Refuge (0808 2000 247, 24/7). If LGBTQ+, Galop (0800 999 5428).
- Never tell them to "consult a solicitor" without also giving them a free option.
- Never invent dates, names, amounts, or services that aren't in the letter.
- If the letter looks like a scam or phishing, say so directly in watch_out_for and put "Verify the sender by calling the official number from their website (not the one on this letter)" as the first what_to_do.
- If you cannot tell what kind of letter it is, be honest in summary and offer one safe next step ("forward it to Citizens Advice").
- Never repeat full names, full home addresses, or reference numbers unless absolutely necessary to explain what the letter says. Protect the young person's personal data.
- If "your_rights" is not clearly relevant, return an empty string.`;

  const langRule = targetLangName && targetLangName !== 'English'
    ? `

TRANSLATION: Write every human-readable string VALUE in ${targetLangName}. That includes letter_type, summary, every "what" in key_dates, every item in what_to_do, your_rights, every "when_to_use" in who_to_call, and watch_out_for. Keep the JSON keys themselves in English. Do NOT translate organisation names (e.g. "Shelter", "Citizens Advice", "Childline") or phone numbers — leave them exactly as written. When you translate a legal term, you may add the original English term in brackets after it the first time, so they can match it to the letter.`
    : '';

  return base + langRule + `

OUTPUT FORMAT: a single JSON object. No code fences. No commentary outside the JSON.`;
}

async function handleTranslateLetter(request, env) {
  if (!env.ANTHROPIC_API_KEY) {
    return json({ error: "The translator isn't configured on this server yet." }, 503);
  }

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'Send JSON.' }, 400); }

  const langCode = typeof body.language === 'string' && TL_LANGS[body.language] ? body.language : 'en';
  const targetLangName = TL_LANGS[langCode];

  let content;
  const file = body.file;

  if (file && typeof file === 'object' && typeof file.data === 'string') {
    const kind = file.kind;
    const mediaType = file.media_type || '';
    const bytes = tlBase64Bytes(file.data);
    if (bytes > TL_MAX_FILE_BYTES) return json({ error: 'That file is too big. Please use a photo or PDF under 8 MB.' }, 413);
    if (bytes < 64) return json({ error: 'That file looks empty. Try again.' }, 400);

    if (kind === 'image') {
      if (!TL_ALLOWED_IMAGE_TYPES.includes(mediaType)) return json({ error: 'That image format is not supported. Use a JPG or PNG photo.' }, 400);
      content = [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: file.data } },
        { type: 'text', text: 'This is a photo of an official letter. Read all of it and explain it using the JSON shape from your instructions.' },
      ];
    } else if (kind === 'pdf') {
      content = [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: file.data } },
        { type: 'text', text: 'This is a PDF of an official letter. Read all of it and explain it using the JSON shape from your instructions.' },
      ];
    } else {
      return json({ error: 'Unsupported file type. Upload a photo or a PDF.' }, 400);
    }
  } else {
    const letter = typeof body.letter === 'string' ? body.letter.trim() : '';
    if (!letter) return json({ error: 'Paste the letter, or upload a photo or PDF of it.' }, 400);
    if (letter.length < 30) return json({ error: 'That is a bit short — paste a few more sentences so I can make sense of it.' }, 400);
    if (letter.length > TL_MAX_TEXT) return json({ error: 'That is a lot of text. Paste just the most important parts.' }, 413);
    content = [{ type: 'text', text: letter }];
  }

  let resp;
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: TL_MODEL,
        max_tokens: TL_MAX_OUTPUT_TOKENS,
        system: tlSystemPrompt(targetLangName),
        messages: [{ role: 'user', content }],
      }),
    });
  } catch (err) {
    return json({ error: 'Translation service is unavailable right now. Please try again in a minute.' }, 502);
  }

  if (!resp.ok) {
    if (resp.status === 400 || resp.status === 422) return json({ error: "I couldn't read that file. Try a clearer photo, or paste the text instead." }, 400);
    return json({ error: 'Translation service is unavailable right now. Please try again in a minute.' }, 502);
  }

  let apiData;
  try { apiData = await resp.json(); } catch (e) { return json({ error: 'Could not read the translation. Please try again.' }, 502); }

  const raw = (apiData && Array.isArray(apiData.content) && apiData.content[0] && apiData.content[0].text) || '';
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  let parsed;
  try { parsed = JSON.parse(cleaned); }
  catch (e) {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) { try { parsed = JSON.parse(m[0]); } catch (_) { /* ignore */ } }
  }
  if (!parsed) return json({ error: 'Could not understand the letter this time. Please try again.' }, 502);

  const safe = {
    letter_type: typeof parsed.letter_type === 'string' ? parsed.letter_type : '',
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    key_dates: Array.isArray(parsed.key_dates)
      ? parsed.key_dates.filter((d) => d && d.date && d.what).map((d) => ({ date: String(d.date), what: String(d.what) })) : [],
    what_to_do: Array.isArray(parsed.what_to_do)
      ? parsed.what_to_do.filter((s) => typeof s === 'string' && s.trim()) : [],
    your_rights: typeof parsed.your_rights === 'string' ? parsed.your_rights : '',
    who_to_call: Array.isArray(parsed.who_to_call)
      ? parsed.who_to_call.filter((c) => c && c.name && c.phone).map((c) => ({ name: String(c.name), phone: String(c.phone), when_to_use: String(c.when_to_use || '') })) : [],
    watch_out_for: typeof parsed.watch_out_for === 'string' ? parsed.watch_out_for : '',
    language: langCode,
  };

  return json(safe);
}

// ---- Young Reporters / Good-News submissions --------------------------------
// POST /api/news-submit  -> store a community good-news submission (D1 + optional R2 doc + Resend)
// GET  /api/news-list    -> published submissions as JSON (for news.html to render)
// GET  /api/news-file?id=-> stream the uploaded document for a published post
//
// Auto-publishes by default. To switch to "review before it appears", set the
// Var  NEWS_AUTOPUBLISH = "false"  in wrangler.toml — submissions then wait as
// 'pending' until you flip them to 'published' in the database.
const NEWS_MAX_BODY = 20000;
const NEWS_MAX_FILE = 15 * 1024 * 1024; // 15 MB

function newsEscape(s) {
  return (s == null ? '' : String(s))
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function handleNewsSubmit(request, env) {
  try {
    const form = await request.formData();

    // Honeypot — real people leave this hidden field empty; bots fill it.
    if ((form.get('website') || '').toString().trim()) return json({ ok: true, status: 'published' });

    const ip = request.headers.get('CF-Connecting-IP') || '';

    // Optional spam check (only enforced if a Turnstile secret is configured).
    if (env.TURNSTILE_SECRET_KEY) {
      const r = await verifyTurnstile(form.get('cf-turnstile-response'), env.TURNSTILE_SECRET_KEY, ip);
      if (!r || r.success !== true) return json({ error: 'Spam check failed. Please refresh and try again.' }, 400);
    }

    const f = (k) => (form.get(k) || '').toString().trim();
    const on = (k) => { const v = f(k); return v === 'on' || v === 'true' || v === '1' || v === 'yes'; };

    const name = f('name'), email = f('email'), location = f('location');
    const headline = f('headline'), body = f('body');
    const ageNum = parseInt(f('age'), 10);

    if (!name || !email || !headline || !body) {
      return json({ error: 'Please add your name, email, a headline and your story.' }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Please enter a valid email.' }, 400);
    if (body.length < 50) return json({ error: 'Please write a little more — at least a few sentences.' }, 400);
    if (body.length > NEWS_MAX_BODY) return json({ error: 'That is very long — please trim it a little.' }, 400);
    if (!on('consent_publish') || !on('consent_own')) {
      return json({ error: 'Please tick the consent boxes so we can publish your story.' }, 400);
    }
    if (!Number.isNaN(ageNum) && ageNum < 18 && !on('consent_parent')) {
      return json({ error: 'As you are under 18, we need a parent or guardian to give permission — please tick that box.' }, 400);
    }

    // Optional document -> R2 (only if a bucket is bound).
    let docKey = null, docName = null;
    const file = form.get('document');
    if (file && typeof file === 'object' && file.size > 0) {
      if (file.size > NEWS_MAX_FILE) return json({ error: 'That file is over 15 MB — please attach a smaller one.' }, 400);
      if (env.NEWS_UPLOADS) {
        docName = safeName(file.name);
        docKey = `news/${Date.now()}-${crypto.randomUUID()}-${docName}`;
        await env.NEWS_UPLOADS.put(docKey, file.stream(), { httpMetadata: { contentType: file.type } });
      }
    }

    const status = (env.NEWS_AUTOPUBLISH === 'false') ? 'pending' : 'published';
    const ipHash = await sha256(ip + (env.IP_SALT || 'safe'));

    let postId = null;
    if (env.DB) {
      const res = await env.DB.prepare(
        `INSERT INTO news_posts
           (author_name,author_email,age,location,headline,body,doc_key,doc_name,status,ip_hash,created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'))`
      ).bind(
        name, email, Number.isNaN(ageNum) ? null : ageNum, location, headline, body,
        docKey, docName, status, ipHash
      ).run();
      postId = res && res.meta ? res.meta.last_row_id : null;
    }

    // Optional newsletter opt-in (best-effort; needs Mailchimp configured).
    if (on('subscribe') && env.MAILCHIMP_API_KEY && env.MAILCHIMP_AUDIENCE_ID && env.MAILCHIMP_SERVER) {
      try { await mailchimpSubscribe(env, email, name); } catch (e) { /* non-fatal */ }
    }

    // Notify you so you can shape or pull anything down.
    if (env.RESEND_API_KEY && env.NOTIFY_EMAIL) {
      try { await notifyNews(env, { name, email, age: ageNum, location, headline, body, docKey, status, postId }); } catch (e) {}
    }

    return json({ ok: true, status });
  } catch (err) {
    return json({ error: 'Something went wrong sending your story. Please try again.' }, 500);
  }
}

async function handleNewsList(request, env) {
  if (!env.DB) return json({ posts: [] });
  try {
    const { results } = await env.DB.prepare(
      `SELECT id, author_name, location, headline, body, doc_key, doc_name, created_at
         FROM news_posts WHERE status = 'published' ORDER BY id DESC LIMIT 60`
    ).all();
    const posts = (results || []).map((r) => ({
      id: r.id,
      name: r.author_name,
      location: r.location || '',
      headline: r.headline,
      body: r.body,
      created_at: r.created_at,
      doc: r.doc_key ? ('/api/news-file?id=' + r.id) : null,
      doc_name: r.doc_name || null,
    }));
    return json({ posts });
  } catch (e) {
    return json({ posts: [] });
  }
}

async function handleNewsFile(request, env) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id || !env.DB || !env.NEWS_UPLOADS) return new Response('Not found', { status: 404 });
  const row = await env.DB.prepare(
    `SELECT doc_key, doc_name FROM news_posts WHERE id = ? AND status = 'published'`
  ).bind(id).first();
  if (!row || !row.doc_key) return new Response('Not found', { status: 404 });
  const obj = await env.NEWS_UPLOADS.get(row.doc_key);
  if (!obj) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('Cache-Control', 'public, max-age=3600');
  if (row.doc_name) headers.set('Content-Disposition', `inline; filename="${row.doc_name}"`);
  return new Response(obj.body, { headers });
}

async function mailchimpSubscribe(env, email, name) {
  const url = `https://${env.MAILCHIMP_SERVER}.api.mailchimp.com/3.0/lists/${env.MAILCHIMP_AUDIENCE_ID}/members`;
  await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa('anystring:' + env.MAILCHIMP_API_KEY),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email_address: email, status: 'pending', merge_fields: { FNAME: name || 'Friend' } }),
  });
}

async function notifyNews(env, s) {
  const text = [
    'New young-reporter / good-news submission',
    `Status: ${s.status}${s.postId ? '  (id ' + s.postId + ')' : ''}`,
    '',
    `From:      ${s.name} <${s.email}>`,
    `Age:       ${Number.isNaN(s.age) ? '—' : s.age}`,
    `Location:  ${s.location || '—'}`,
    `Headline:  ${s.headline}`,
    `Document:  ${s.docKey ? s.docKey : 'none'}`,
    '',
    '--- Story ---',
    s.body,
    '',
    s.status === 'published'
      ? 'This is now LIVE on the news page. To remove it, set its status to "hidden" in the news_posts table.'
      : 'This is PENDING. Set its status to "published" in the news_posts table to publish it.',
  ].join('\n');
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.FROM_EMAIL || 'SAFE Stories <stories@safespot.life>',
      to: [env.NOTIFY_EMAIL],
      reply_to: s.email,
      subject: `New good-news submission: ${s.headline}`,
      text,
    }),
  });
}

// ---- Blog comments (self-owned, pre-moderated) ------------------------------
// GET  /api/comments?post=<slug>   -> approved comments for a post
// POST /api/comments               -> new comment (held as 'pending')
// GET  /api/comments-approve?id=&token=  -> one-click approve from the email
const CMT_MAX = 2000;
function cmtSlug(s) { return (s == null ? '' : String(s)).toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 80); }

async function handleCommentsList(request, env) {
  if (!env.DB) return json({ comments: [] });
  const slug = cmtSlug(new URL(request.url).searchParams.get('post'));
  if (!slug) return json({ comments: [] });
  try {
    const { results } = await env.DB.prepare(
      `SELECT id, author_name, body, created_at FROM comments
        WHERE post_slug = ? AND status = 'approved' ORDER BY id ASC LIMIT 500`
    ).bind(slug).all();
    return json({ comments: (results || []).map((r) => ({ id: r.id, name: r.author_name, body: r.body, created_at: r.created_at })) });
  } catch (e) { return json({ comments: [] }); }
}

async function handleCommentPost(request, env) {
  try {
    let b;
    const ct = request.headers.get('content-type') || '';
    if (ct.includes('application/json')) b = await request.json();
    else { const f = await request.formData(); b = Object.fromEntries(f.entries()); }

    if ((b.website || '').toString().trim()) return json({ ok: true, status: 'pending' }); // honeypot

    const slug = cmtSlug(b.post);
    const name = (b.name || '').toString().trim();
    const email = (b.email || '').toString().trim();
    const body = (b.body || '').toString().trim();

    if (!slug || !name || !email || !body) return json({ error: 'Please add your name, email and a comment.' }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Please enter a valid email.' }, 400);
    if (body.length < 2) return json({ error: 'Your comment looks empty.' }, 400);
    if (body.length > CMT_MAX) return json({ error: 'That comment is a bit long — please shorten it.' }, 400);

    const ipHash = await sha256((request.headers.get('CF-Connecting-IP') || '') + (env.IP_SALT || 'safe'));
    let id = null;
    if (env.DB) {
      const r = await env.DB.prepare(
        `INSERT INTO comments (post_slug,author_name,author_email,body,status,ip_hash,created_at)
         VALUES (?,?,?,?, 'pending', ?, datetime('now'))`
      ).bind(slug, name, email, body, ipHash).run();
      id = r && r.meta ? r.meta.last_row_id : null;
    }

    const sub = b.subscribe;
    if ((sub === 'on' || sub === 'true' || sub === '1' || sub === true) && env.MAILCHIMP_API_KEY && env.MAILCHIMP_AUDIENCE_ID && env.MAILCHIMP_SERVER) {
      try { await mailchimpSubscribe(env, email, name); } catch (e) {}
    }

    if (env.RESEND_API_KEY && env.NOTIFY_EMAIL && id) {
      try { await notifyComment(env, request, { id, slug, name, email, body }); } catch (e) {}
    }

    return json({ ok: true, status: 'pending' });
  } catch (e) {
    return json({ error: 'Could not post your comment. Please try again.' }, 500);
  }
}

async function cmtToken(env, id) {
  return await sha256('cmt:' + id + ':' + (env.COMMENTS_ADMIN_SECRET || env.IP_SALT || 'safe'));
}

async function notifyComment(env, request, c) {
  const origin = new URL(request.url).origin;
  const token = await cmtToken(env, c.id);
  const approve = `${origin}/api/comments-approve?id=${c.id}&token=${token}`;
  const text = [
    'New blog comment awaiting your approval',
    '',
    `Post:  ${c.slug}`,
    `From:  ${c.name} <${c.email}>`,
    '',
    '--- Comment ---',
    c.body,
    '',
    'Approve & publish it (one click):',
    approve,
    '',
    '(Just ignore this email to leave it unpublished.)',
  ].join('\n');
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.FROM_EMAIL || 'SAFE Stories <stories@safespot.life>',
      to: [env.NOTIFY_EMAIL],
      reply_to: c.email,
      subject: `New comment on ${c.slug} — approve?`,
      text,
    }),
  });
}

async function handleCommentApprove(request, env) {
  const u = new URL(request.url);
  const id = u.searchParams.get('id');
  const token = u.searchParams.get('token');
  const page = (msg) => new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<body style="font-family:system-ui,sans-serif;max-width:520px;margin:60px auto;padding:0 20px;line-height:1.6;color:#111">' +
    '<h1 style="font-weight:600;font-size:20px">' + msg + '</h1><p><a href="/blog.html">Back to the blog</a></p>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
  if (!id || !token || !env.DB) return page('Invalid approval link.');
  const expected = await cmtToken(env, id);
  if (token !== expected) return page('That approval link is not valid.');
  try {
    await env.DB.prepare(`UPDATE comments SET status = 'approved' WHERE id = ?`).bind(id).run();
    return page('Comment approved and published.');
  } catch (e) {
    return page('Could not approve right now — please try again.');
  }
}
