# SAFESPOT.LIFE — Cloudflare Pages migration & Stories form

This change moves the site toward Cloudflare Pages and adds a **self-owned stories form**:
submissions land in **your own D1 database** (not a third party), spam is filtered by
**Turnstile**, and you get an **email notification** via Resend.

It is **additive** — it does not affect your current Netlify/Vercel deploy. Nothing here
runs until you deploy to Cloudflare Pages.

## Files added
- `functions/api/stories.js` — the Pages Function handling `POST /api/stories`
- `schema.sql` — the D1 table
- `wrangler.toml` — Pages + D1 config
- `.dev.vars.example` — template for local secrets
- `youth-stories.html` — form now posts to `/api/stories` with a Turnstile widget

---

## One-time setup (needs a Cloudflare account)

```bash
npm i -g wrangler
wrangler login

# 1. Create your database
wrangler d1 create safe-stories
#    -> copy the printed database_id into wrangler.toml (replace PUT_D1_DATABASE_ID_HERE)

# 2. Create the table
wrangler d1 execute safe-stories --remote --file=schema.sql

# 3. (optional) file uploads — create an R2 bucket, then uncomment [[r2_buckets]] in wrangler.toml
wrangler r2 bucket create safe-story-uploads
```

**Turnstile (free spam protection):** Cloudflare dashboard → Turnstile → add widget for `safespot.life`.
- Put the **site key** into `youth-stories.html` (replace `YOUR_TURNSTILE_SITE_KEY`)
- Save the **secret key**: `wrangler pages secret put TURNSTILE_SECRET_KEY`

**Resend (email notifications):** create an account, verify `safespot.life` as a sending domain,
make an API key, then: `wrangler pages secret put RESEND_API_KEY`

---

## Deploy & test (zero risk to your live site)
- Cloudflare dashboard → Pages → Connect to Git → pick this repo. Build command: none. Output dir: `/`.
- Or one-off from your machine: `wrangler pages deploy .`
- You get a free `*.pages.dev` URL. **Test the stories form there.** Your live domain is untouched.

## Go live (only after everything below is tested)
- Add `safespot.life` as a custom domain on the Pages project, then move DNS to Cloudflare.

> ⚠️ **Before pointing the domain at Cloudflare**, port the other `/api` endpoints (next section) —
> they are Vercel/Netlify-style and will NOT run on Pages until ported, so the shop and tools would break.

### Remaining endpoints to port (separate task — needs your API keys + testing)
| Current file | Move to | Needs |
|---|---|---|
| `api/checkout.js` (Stripe) | `functions/api/checkout.js` | `STRIPE_SECRET_KEY`; Stripe SDK must use the Workers fetch client |
| `api/session.js` (Stripe) | `functions/api/session.js` | `STRIPE_SECRET_KEY` |
| `api/translate-letter.js` (LLM) | `functions/api/translate-letter.js` | LLM API key |
| `api/reparenting.js` (LLM) | `functions/api/reparenting.js` | LLM API key |
| `api/sms.js` (Twilio + Upstash) | `functions/api/sms.js` | Twilio + Upstash creds; `nodejs_compat` flag (already set) |

---

## Emails — you only need the one inbox you already have

`enquiries@safespot.life` is your single real mailbox. Everything else is a **free alias**
that forwards into it — set them up in **Cloudflare Email Routing** (free, unlimited) once your
domain is on Cloudflare, or via your current host's free alias / catch-all.

The stories form sends its notification **to** `enquiries@` and **from** `stories@safespot.life`.
That "from" is a Resend sending identity, **not a mailbox** — it only needs the domain verified
in Resend (DNS records). No extra inbox, no cost. Resend free tier = 3,000 emails/month.

| Address | Type | Used by |
|---|---|---|
| `enquiries@` | real inbox (you have it) | `faq.html` contact; destination for everything below |
| `stories@` | free alias -> enquiries@ | public sender for the stories form |
| `shop@` | free alias -> enquiries@ | `shop.html` contact + `success.html` support link |
| `careers@` | free alias -> enquiries@ | `careers.html` + 10 `apply-*.html` |
| `hello@` | free alias -> enquiries@ | `apply-*.html` "Questions?" + SMS TALK path |
| `publishing@` | free alias -> enquiries@ | `publishing.html` |
| `products@` | free alias -> enquiries@ | `youth-products.html` |
| `reports@` | free alias -> enquiries@ | `story-intelligence.html` buyers |

Want the notifications labelled so you can filter them inside `enquiries@`? Create the `stories@`
alias and set `NOTIFY_EMAIL = stories@safespot.life` in `wrangler.toml` — mail still lands in
`enquiries@`, but with `To: stories@` so you can auto-label it.
