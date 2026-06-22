// SAFESPOT.LIFE — Worker entry (Workers Static Assets).
// Serves the static site via the ASSETS binding and handles dynamic routes.
//   POST /api/stories  -> store a youth-story submission (D1 + Turnstile + Resend)
// Everything else falls through to the static files.
//
// Bindings (wrangler.toml):  ASSETS, DB (D1), optional STORY_UPLOADS (R2)
// Secrets (dashboard -> Variables and secrets):  TURNSTILE_SECRET_KEY, RESEND_API_KEY
// Vars:  NOTIFY_EMAIL, FROM_EMAIL, IP_SALT

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/stories') {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });
      if (request.method === 'POST') return handleStories(request, env);
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
async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}
