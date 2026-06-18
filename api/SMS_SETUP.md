# SAFE-by-Text — Setup & Run

Single Twilio webhook + serverless function. Lets a young person on any UK
phone — including PAYG with zero credit — get SAFE's content by SMS.

## 1 — Twilio account

1. Sign up at twilio.com (UK billing address).
2. Apply for **Twilio.org Impact Access** (twilio.com/impact) — they give
   verified non-profits monthly SMS credit. Worth a one-off email.
3. Buy a UK long code number from Console → Phone Numbers → Buy a Number:
   - **Country:** United Kingdom
   - **Capabilities:** SMS ✓
   - **Type:** Local (cheaper) or Mobile (better deliverability) — start Local.
   - Cost: £1.10/month.
4. Make a note of the number. Tell SAFE volunteers and physical-card
   designers about it.

## 2 — Upstash Redis (session store)

The LETTER and VOICE flows need to remember "this user is mid-flow" for up
to 10 minutes. We use Upstash Redis (free tier is plenty).

1. Sign up at upstash.com (no card required for free tier).
2. Create a Redis database in the eu-west-1 region.
3. From the Details page, copy:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

## 3 — Vercel project

Either bolt this on to the existing SAFE Vercel project, or create a
separate one if you'd rather isolate the SMS service.

In Vercel **Project Settings → Environment Variables**, add:

| Name                          | Value                       |
|-------------------------------|-----------------------------|
| `TWILIO_AUTH_TOKEN`           | Twilio dashboard → Account  |
| `ANTHROPIC_API_KEY`           | Anthropic console           |
| `UPSTASH_REDIS_REST_URL`      | from step 2                 |
| `UPSTASH_REDIS_REST_TOKEN`    | from step 2                 |
| `PHONE_SALT`                  | random string, any value    |

`PHONE_SALT` is just so the phone hashes in the session store aren't
trivially rainbow-tableable.

Add the npm dependencies in your `package.json`:

```json
{
  "type": "module",
  "dependencies": {
    "@anthropic-ai/sdk": "^0.30.0",
    "twilio": "^5.0.0"
  }
}
```

Vercel runs `npm install` on deploy.

## 4 — Wire Twilio to Vercel

After your first Vercel deploy, copy the production URL (e.g.
`https://safe.vercel.app`). In Twilio Console → Phone Numbers → your SAFE
number → Messaging Configuration:

- **A MESSAGE COMES IN — Webhook:** `https://safe.vercel.app/api/sms`
- **Method:** HTTP POST

Save. From now on every inbound text to that number hits your Vercel
function.

## 5 — Test

From your own phone, text the SAFE number with:

- `HELP` → should return the menu
- `RIGHTS16` → should return the under-16 rights message
- `LETTER` → should ask you to send the letter next
- a random sentence → should return the friendly fallback

If you get nothing back: check the Vercel function logs and the Twilio
debugger.

## 6 — Cost expectations

| Channel item             | Cost                       |
|--------------------------|----------------------------|
| Twilio UK long code      | £1.10/month                |
| Inbound SMS (per msg)    | £0.0075 (~0.75p)           |
| Outbound SMS (per seg)   | ~£0.035 (~3.5p)            |
| Anthropic Haiku (LETTER) | ~£0.001 per use            |
| Anthropic Sonnet (VOICE) | ~£0.01 per use             |
| Upstash Redis            | Free tier covers thousands |
| Vercel functions         | Free tier covers thousands |

Average conversation = 3 outbound segments = ~10p/young person. £100
budget = ~1,000 young people reached.

## 7 — Compliance notes

- This is **signposting and content**, not a regulated counselling service.
  No safeguarding sign-off needed at this scope.
- We process a phone number transiently (for routing the reply) and store
  only a salted SHA-256 hash for session continuity. We do not log
  message content. State this on the physical resource card.
- Twilio's UK long codes auto-handle STOP / unsubscribe — if a user texts
  STOP, the carrier blocks further outbound. Our STOP branch also fires a
  human-readable confirmation.
- For crisis keywords (suicide / self-harm / violence-in-progress) we
  short-circuit straight to 999 + Samaritans + SHOUT without LLM
  involvement.

## 8 — Marketing the number

Print on the **SAFE Card** alongside the URL:

> Text **SAFE** any of: ROOF / MIND / RIGHTS / JOBS / MONEY / LETTER /
> VOICE / TALK to **[YOUR NUMBER]**. Free from any UK phone. Nothing saved.

Distribute through libraries, A&E, school nurses, hostels, foodbanks,
police custody suites, mosques/churches, LGBTQ+ centres, TfL Help Points.

10,000 printed cards is around £180.
