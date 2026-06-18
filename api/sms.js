/**
 * SAFE — SMS service (SAFE-by-Text)
 *
 * Single Twilio webhook. Routes inbound texts:
 *
 *   HELP / START / INFO        → overview menu
 *   ROOF / SLEEP / HOMELESS    → emergency housing
 *   ROOF MORE                  → 18+ housing follow-up
 *   RIGHTS / RIGHTS18 / RIGHTS16 → your rights at your age
 *   MIND / THERAPY / MENTAL    → mental health resources
 *   JOBS / WORK                → work without a CV
 *   MONEY / BENEFITS / DEBT    → benefits, debt, sanctions
 *   LETTER                     → 2-step letter translator
 *   VOICE                      → 2-step re-parenting voice
 *   TALK / HUMAN / REAL        → escalation to humans
 *   STOP                       → opt out
 *   CANCEL                     → cancel current flow
 *   Anything else              → friendly fallback
 *
 * Crisis precheck bypasses all logic and routes to 999/Samaritans/SHOUT.
 *
 * State: ephemeral session in Upstash Redis (REST), keyed by SHA-256 hash of
 * the phone number. TTL 10 minutes. Nothing else is stored — no logs of
 * letter text, no logs of moments, no PII at rest.
 *
 * Required env vars:
 *   TWILIO_AUTH_TOKEN
 *   ANTHROPIC_API_KEY
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */

import crypto from "node:crypto";
import twilio from "twilio";
import Anthropic from "@anthropic-ai/sdk";

const { MessagingResponse } = twilio.twiml;

/* ─────────────────────────── crisis precheck ─────────────────────────── */

const CRISIS_RE = new RegExp(
  String.raw`\b(kill\s*myself|kill\s*me|end\s*it|end\s*my\s*life|suicid|`
+ String.raw`overdose|od\s+on|i.?m\s+going\s+to\s+die|i\s+want\s+to\s+die|`
+ String.raw`cut\s*myself|cutting\s*myself|hurt\s*myself|`
+ String.raw`hit\s*me|hitting\s*me|attacking\s*me|stabbed|stabbing|`
+ String.raw`raped|rape\s*me|being\s*raped|`
+ String.raw`he.?s\s*here|she.?s\s*here|they.?re\s*here|`
+ String.raw`can.?t\s*breathe|bleeding\s*out|going\s*to\s*kill)\b`,
  "i"
);

const CRISIS_REPLY =
  "Please call 999 right now. If you can't speak, text 85258 — they will help "
+ "and you don't have to talk. I'm still here. Reply when safe.";

/* ─────────────────────────── static branches ─────────────────────────── */

const M = (s) => s.trim();

const BRANCHES = {

HELP: M(`
SAFE — real advice for young people. No gatekeepers.

Reply:
ROOF — nowhere to sleep
MIND — mental health
RIGHTS — your rights at your age
JOBS — work without a CV
MONEY — benefits / debt
LETTER — explain a letter
VOICE — a hard moment
TALK — a real person

Free. Nothing saved.
`),

ROOF: M(`
If you're under 18: your council's children's services MUST house you. They can't lawfully refuse (Children Act 1989).

Call Shelter free: 0808 800 4444. They'll tell you your borough's number.

Sleeping rough? Text STREETLINK to 84005 — outreach will come to you.

In danger now: 999.

Reply MORE for 18+ options, VIOLENCE if abuse is why, or TALK for a real person.
`),

ROOF_MORE: M(`
18+: Shelter 0808 800 4444 (Mon–Fri 8am–8pm, Sat–Sun 9–5).

Out of hours, every UK council has an Emergency Duty Team — Shelter will give you the number, or search "[your borough] emergency duty team".

LGBTQ+ youth: akt.org.uk / 020 7831 6562.
Refugee/asylum seeker: Refugee Council 020 7346 6700.

Reply TALK if you'd rather speak to a person.
`),

VIOLENCE: M(`
If abuse is why you can't be at home:

Refuge (women & all genders, domestic abuse, 24/7): 0808 2000 247.
LGBTQ+ specific: Galop 0800 999 5428.
Men's Advice Line: 0808 801 0327.

You can leave today. Refuge will help you find somewhere safe tonight. They won't tell anyone you've called.

In danger right now: 999.
`),

RIGHTS: M(`
QUICK rights guide. Reply RIGHTS14, RIGHTS16, or RIGHTS18 for that age.

At 14: see a GP alone if you understand the decision (Gillick competence).
At 16: leave home, work, marry with consent.
At 18: legal adult — contracts, voting, full benefits.

With police: right to silence ("I want a solicitor"), free if you can't pay. Under 18: right to an Appropriate Adult present.
`),

RIGHTS14: M(`
At 14 you can:
- See a GP alone, get a prescription (e.g. contraception) if you understand
- Refuse treatment in most cases
- Speak to a school counsellor in private
- Open a Junior ISA (with adult)

You cannot work full hours, sign tenancies, leave school. Your council still has child protection duties to you.

Anything happening at home? Childline 0800 1111 (free, confidential).
`),

RIGHTS16: M(`
At 16 you can:
- Leave home (you don't need permission)
- Work full hours legally
- See a GP, dentist, optician alone
- Consent to medical treatment
- Marry with parental consent (England/Wales: 18 since 2023, NI: 16)

You can't yet sign most tenancies or get full Universal Credit.

Unsafe at home? Council's children's services MUST accommodate you. Call Shelter 0808 800 4444.
`),

RIGHTS18: M(`
At 18 you're a legal adult. You can:
- Sign tenancies, contracts, credit
- Vote, stand for office
- Apply for full Universal Credit
- Drink alcohol legally

If you were "looked after" by a council before 18, you get LEAVING CARE support up to age 25 — housing help, money, a Personal Adviser. They can't drop you.

Reply MONEY for benefits info.
`),

MIND: M(`
Free mental health support, UK, right now:

Samaritans: 116 123 — 24/7, free.
Text SHOUT to 85258 — 24/7, anonymous.
Childline (under 19): 0800 1111.
PAPYRUS HOPELINE (under 35, suicide-specific): 0800 068 4141.

Your GP can refer you for free NHS Talking Therapies — no parent needed if you're 16+.

Reply TALK for a SAFE volunteer (within 48hr).
`),

JOBS: M(`
Get hired without a CV or experience:

1) Pitch local businesses. Walk in: "I noticed X — I can fix it for £Y/week." One page. They hire on the spot more than you think.

2) Master ONE tool deep: Notion, Zapier, Excel, AI prompting. 5–20 hrs on YouTube. Free.

3) Apprenticeships: gov.uk/apply-apprenticeship.

On benefits, 16–24? Ask Jobcentre for the Youth Hub.
`),

MONEY: M(`
Benefits / money basics:

- Universal Credit: gov.uk/universal-credit. Usually 18+, some 16–17 exceptions.
- Council Tax Reduction if low income.
- Free school meals up to 18 if in college.
- Citizens Advice free: 0800 144 8848 (England/Wales).
- Debt? StepChange free: 0800 138 1111.

Reply UC, DEBT, or SANCTION for that topic in detail.
`),

UC: M(`
Universal Credit basics:

- Apply online: gov.uk/apply-universal-credit
- First payment takes ~5 weeks. Ask for an Advance Payment (interest-free loan you pay back from future UC).
- You can claim if you're 18+, in some cases 16–17 (estranged from parents, parent yourself, etc.) — your Jobcentre will tell you.
- Sanctioned? Reply SANCTION.

Citizens Advice will help you apply for free: 0800 144 8848.
`),

SANCTION: M(`
If you've been sanctioned (UC stopped or cut):

1) You can ask for a Mandatory Reconsideration within 1 month. Citizens Advice 0800 144 8848 will help you write it for free.
2) Apply for a Hardship Payment — your Jobcentre can fast-track if you have no money for food/rent.
3) Food bank now: trusselltrust.org/get-help or text BANK to 70450.

Don't ignore it — appeal.
`),

DEBT: M(`
Debt help, free, no judgement:

StepChange: 0800 138 1111 (free debt plan, will deal with creditors for you).
National Debtline: 0808 808 4000.
Citizens Advice: 0800 144 8848.

If a bailiff comes: you don't have to let them in (England/Wales). Keep doors locked. Speak through the door. Then call StepChange.

Don't pay anyone who isn't one of the above.
`),

LETTER_PROMPT: M(`
OK. In your NEXT text, type or paste the letter (under 1000 characters — paste the most important paragraph if it's long).

I'll explain what it actually says, pull out any dates, and tell you what to do.

Reply CANCEL to stop. You have 10 minutes.
`),

VOICE_PROMPT: M(`
OK. In your NEXT text, tell me ONE moment — what happened, who said it, roughly how old you were.

I'll write the line a good parent, carer, teacher or coach would have said in that moment.

Not therapy. Just the line.

Reply CANCEL to stop. You have 10 minutes.
`),

TALK: M(`
There isn't a 24/7 SAFE volunteer on this number yet. People who DO answer, right now, free:

Samaritans: 116 123 (24/7).
Text SHOUT to 85258 (anonymous).
Childline under 19: 0800 1111.

For a SAFE person (within 48hr), email hello@safespot.life with what you'd like help with. They'll reply.
`),

CANCEL: M(`
OK, cancelled. Reply HELP to see what SAFE can do.
`),

UNKNOWN: M(`
I didn't recognise that. Reply HELP for the menu. Or just text in plain English — I'll try.
`),

STOP: M(`
OK. You won't hear from SAFE again unless you text us first. The free helplines below still work if you need them.

Samaritans 116 123. Childline 0800 1111. SHOUT text 85258.
`),

};

/* ─────────────────────────── keyword routing ─────────────────────────── */

function normalise(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function routeKeyword(body) {
  const n = normalise(body);
  const w = n.split(" ");

  // multi-word triggers
  if (n.startsWith("roof more") || n === "more")     return "ROOF_MORE";

  const k = w[0];

  if (["help", "start", "menu", "info"].includes(k))                   return "HELP";
  if (["roof", "sleep", "sleeping", "homeless", "house"].includes(k))  return "ROOF";
  if (["violence", "abuse", "abused", "hit", "domestic"].includes(k))  return "VIOLENCE";
  if (k === "rights14" || n === "rights 14")                           return "RIGHTS14";
  if (k === "rights16" || n === "rights 16")                           return "RIGHTS16";
  if (k === "rights18" || n === "rights 18")                           return "RIGHTS18";
  if (["rights", "right"].includes(k))                                 return "RIGHTS";
  if (["mind", "therapy", "mental", "depressed", "anxious"].includes(k)) return "MIND";
  if (["jobs", "job", "work", "career"].includes(k))                   return "JOBS";
  if (k === "uc" || n.startsWith("universal credit"))                  return "UC";
  if (["sanction", "sanctioned"].includes(k))                          return "SANCTION";
  if (["debt", "bailiff", "ccj"].includes(k))                          return "DEBT";
  if (["money", "benefits", "benefit", "pip"].includes(k))             return "MONEY";
  if (["letter"].includes(k))                                          return "LETTER";
  if (["voice", "line"].includes(k))                                   return "VOICE";
  if (["talk", "human", "real", "person"].includes(k))                 return "TALK";
  if (["stop", "unsubscribe", "quit"].includes(k))                     return "STOP";
  if (["cancel", "nope", "back"].includes(k))                          return "CANCEL";

  return null;
}

/* ─────────────────────────── Upstash session store ─────────────────── */

function hashPhone(p) {
  return crypto.createHash("sha256").update(p + (process.env.PHONE_SALT || "safe")).digest("hex").slice(0, 24);
}

async function upstash(cmd, args) {
  const url = `${process.env.UPSTASH_REDIS_REST_URL}/${cmd}/${args.join("/")}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` } });
  if (!res.ok) return null;
  const j = await res.json();
  return j.result;
}

async function getSession(phone) {
  if (!process.env.UPSTASH_REDIS_REST_URL) return null;
  const raw = await upstash("get", [`sess:${hashPhone(phone)}`]);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

async function setSession(phone, value, ttlSec = 600) {
  if (!process.env.UPSTASH_REDIS_REST_URL) return;
  const payload = encodeURIComponent(JSON.stringify(value));
  await upstash("setex", [`sess:${hashPhone(phone)}`, String(ttlSec), payload]);
}

async function clearSession(phone) {
  if (!process.env.UPSTASH_REDIS_REST_URL) return;
  await upstash("del", [`sess:${hashPhone(phone)}`]);
}

/* ─────────────────────────── Claude-powered flows ───────────────────── */

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const LETTER_SYSTEM = `A young person in the UK has texted you a letter they don't understand. They're on SMS, possibly on a cracked phone, possibly in a hurry.

REPLY in plain text only. No markdown. No asterisks. No emoji. No headings. UK English. Maximum 300 characters total (two SMS segments).

Use this exact shape, with line breaks:

[ONE LINE: what this letter is]
[ONE LINE: the single most important date if any, in readable form]
[ONE LINE: the single most important action to take, starting with a verb]
[ONE LINE: one free phone number to call. Choose based on topic.]

PHONE NUMBER PICKS:
- housing/eviction/Section 21: Shelter 0808 800 4444
- benefits/UC/Job Centre: Citizens Advice 0800 144 8848
- debt/CCJ/bailiff: StepChange 0800 138 1111
- domestic abuse: Refuge 0808 2000 247
- under-18 anything: Childline 0800 1111
- immigration: Refugee Council 020 7346 6700
- scam suspected: lead with "Looks like a scam — don't reply. Call Action Fraud 0300 123 2040."

If you cannot tell what the letter is, say so plainly and recommend Citizens Advice.

Output the SMS body only — no preamble, no JSON.`;

const VOICE_SYSTEM = `A young person in the UK has texted you a moment from their life. They want the words a good adult would have said in that moment.

REPLY in plain text only. No markdown. No asterisks. No emoji. UK English. Maximum 320 characters total (two SMS segments).

Use this exact shape, with line breaks:

"[The line a good parent / carer / teacher / coach would have said in that moment, in second person. Match the age. Tender, short, plain. No lecturing. No 'I'm sorry'. No therapy jargon.]"

[ONE LINE: the single thing they can hold. Plain. Under 14 words.]

Do not preface. Do not name yourself. Speak as the voice directly.

If their text is silly or testing, reply only with: "This tool is for real moments. Take care of yourself today."

If their text describes current suicidality or imminent danger, reply: "Please call 999 now, or text 85258 if you can't speak. I'm here when you're safe."`;

async function callClaude({ system, model, user }) {
  const msg = await client.messages.create({
    model,
    max_tokens: 250,
    system,
    messages: [{ role: "user", content: user }],
  });
  let txt = (msg.content?.[0]?.text || "").trim();
  // SMS hygiene: strip any markdown that slipped through
  txt = txt.replace(/[*_`~#>]/g, "");
  txt = txt.replace(/—/g, "-").replace(/…/g, "...");
  if (txt.length > 320) txt = txt.slice(0, 317).replace(/\s\S*$/, "") + "...";
  return txt;
}

/* ─────────────────────────── webhook ─────────────────────────── */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Method not allowed");
  }

  // Parse form-encoded body (Twilio default)
  let body = req.body;
  if (typeof body === "string") {
    const params = new URLSearchParams(body);
    body = Object.fromEntries(params);
  }

  // Twilio signature validation
  const sig = req.headers["x-twilio-signature"];
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const url = `${proto}://${host}${req.url}`;
  if (process.env.TWILIO_AUTH_TOKEN) {
    const validator = new twilio.RequestValidator(process.env.TWILIO_AUTH_TOKEN);
    if (!validator.validate(url, body, sig)) {
      return res.status(403).send("Invalid signature");
    }
  }

  const from = (body.From || "").trim();
  const message = (body.Body || "").trim();

  const reply = new MessagingResponse();

  // 1. Crisis precheck — never delay with the LLM
  if (CRISIS_RE.test(message)) {
    reply.message(CRISIS_REPLY);
    res.setHeader("Content-Type", "text/xml");
    return res.status(200).send(reply.toString());
  }

  try {
    const session = await getSession(from);

    // 2. In-flight flow handling
    if (session && session.state === "awaiting_letter") {
      if (/^cancel$/i.test(message)) {
        await clearSession(from);
        reply.message(BRANCHES.CANCEL);
      } else if (message.length < 30) {
        reply.message("Need a bit more text — type or paste the letter (under 1000 characters), or reply CANCEL.");
      } else {
        const out = await callClaude({
          system: LETTER_SYSTEM,
          model: "claude-haiku-4-5-20251001",
          user: message.slice(0, 4000),
        });
        await clearSession(from);
        reply.message(out + "\n\nReply HELP for more.");
      }
    } else if (session && session.state === "awaiting_moment") {
      if (/^cancel$/i.test(message)) {
        await clearSession(from);
        reply.message(BRANCHES.CANCEL);
      } else if (message.length < 20) {
        reply.message("Tell me a bit more — even one or two extra sentences. Reply CANCEL to stop.");
      } else {
        const out = await callClaude({
          system: VOICE_SYSTEM,
          model: "claude-sonnet-4-6",
          user: message.slice(0, 2000),
        });
        await clearSession(from);
        reply.message(out + "\n\nReply VOICE for another, or HELP.");
      }
    } else {
      // 3. Keyword routing
      const key = routeKeyword(message);

      if (key === "LETTER") {
        await setSession(from, { state: "awaiting_letter", started: Date.now() });
        reply.message(BRANCHES.LETTER_PROMPT);
      } else if (key === "VOICE") {
        await setSession(from, { state: "awaiting_moment", started: Date.now() });
        reply.message(BRANCHES.VOICE_PROMPT);
      } else if (key && BRANCHES[key]) {
        reply.message(BRANCHES[key]);
      } else {
        reply.message(BRANCHES.UNKNOWN);
      }
    }
  } catch (err) {
    console.error("SAFE-SMS error", err && err.message);
    reply.message(
      "Something went wrong. While I sort it: Samaritans 116 123 (24/7). Childline (under 19) 0800 1111. Reply HELP to try again."
    );
  }

  res.setHeader("Content-Type", "text/xml");
  return res.status(200).send(reply.toString());
}

export const config = { runtime: "nodejs" };
