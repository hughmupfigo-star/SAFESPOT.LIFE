// Cloudflare Pages Function — POST /api/stories
// Receives a youth-story submission, checks Turnstile (spam), stores it in your
// own D1 database, optionally puts an attached file in R2, and emails a
// notification via Resend.
//
// Bindings (wrangler.toml or Pages dashboard):
//   DB             -> D1 database (required)
//   STORY_UPLOADS  -> R2 bucket (optional, for file attachments)
// Secrets (wrangler pages secret put <NAME>):
//   TURNSTILE_SECRET_KEY   (required for spam check)
//   RESEND_API_KEY         (required for email notifications)
// Vars:
//   NOTIFY_EMAIL  e.g. stories@safespot.life
//   FROM_EMAIL    e.g. "SAFE Stories <stories@safespot.life>"
//   IP_SALT       any random string (privacy: stored IPs are hashed, never raw)

const cors = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
});

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors() },
  });

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: cors() });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const form = await request.formData();
    const ip = request.headers.get('CF-Connecting-IP') || '';

    // 1. Spam check (Turnstile)
    if (env.TURNSTILE_SECRET_KEY) {
      const ok = await verifyTurnstile(form.get('cf-turnstile-response'), env.TURNSTILE_SECRET_KEY, ip);
      if (!ok) return json({ error: 'Spam check failed. Please refresh and try again.' }, 400);
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

    // 4. Store in D1 (your own database)
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
  if (!token) return false;
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token.toString());
  if (ip) body.append('remoteip', ip);
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const data = await r.json().catch(() => ({ success: false }));
  return data.success === true;
}

async function notify(env, s) {
  const text = [
    'New youth story submission',
    '',
    `From:        ${s.name} <${s.email}>`,
    `Location:    ${s.location || '—'}`,
    `Age:         ${Number.isNaN(s.age) ? '—' : s.age}`,
    `Title:       ${s.storyTitle || '—'}`,
    `Category:    ${s.category || '—'}`,
    `Publish as:  ${s.anonymity || '—'}`,
    `Attachment:  ${s.fileKey ? s.fileKey : 'none'}`,
    '',
    '--- Story ---',
    s.storyContent,
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
