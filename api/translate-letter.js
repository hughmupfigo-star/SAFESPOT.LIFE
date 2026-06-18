/**
 * SAFE — Translate This Letter API
 *
 * Vercel serverless function (Node.js runtime). Drop this file at
 *   /api/translate-letter.js
 * inside a Vercel project that also hosts /translate-letter.html, then set:
 *   ANTHROPIC_API_KEY = sk-ant-...
 * in the Vercel project's Environment Variables. That's it.
 *
 * Compatible with Netlify Functions and Cloudflare Workers with minor edits
 * (replace the export style, that's all).
 *
 * Privacy: this function does NOT log, store, or persist the letter text.
 * It is sent to the Anthropic API and immediately discarded once the
 * response is returned. Anthropic's API does not train on API traffic.
 */

import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are SAFE's Letter Translator. A young person (likely 16-25) has pasted an official letter they're struggling to understand. Translate it into plain English and tell them what to do.

Output ONE valid JSON object. No preamble, no code fences, no commentary. Use this exact shape:

{
  "letter_type": "string - what kind of letter this is, 6 words or fewer",
  "summary": "string - 2-3 short sentences. What this letter is actually saying, in plain English.",
  "key_dates": [{"date": "string - human readable", "what": "string - what happens by/on this date"}],
  "what_to_do": ["string - concrete action, in priority order"],
  "your_rights": "string - 1-2 sentences on rights/protections relevant here",
  "who_to_call": [{"name": "string", "phone": "string with spaces between digits", "when_to_use": "string - brief"}],
  "watch_out_for": "string - sketchy details, missed deadlines, common traps. Empty string if nothing notable."
}

RULES:
- British English throughout. Plain language. No jargon.
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
- Never repeat full names, full addresses, or reference numbers unless absolutely necessary to explain what the letter says.
- If "your_rights" is not clearly relevant, return an empty string.

OUTPUT FORMAT: a single JSON object. No code fences. No commentary outside the JSON.`;

export default async function handler(req, res) {
  // Lock to POST
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Body
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const letter = body && body.letter;

  if (!letter || typeof letter !== "string") {
    return res.status(400).json({ error: "Missing letter text." });
  }
  const trimmed = letter.trim();
  if (trimmed.length < 30) {
    return res.status(400).json({ error: "Letter text is too short." });
  }
  if (trimmed.length > 12000) {
    return res.status(413).json({ error: "Letter text is too long. Please paste only the relevant parts." });
  }

  // Anthropic call
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let msg;
  try {
    msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: trimmed }],
    });
  } catch (err) {
    console.error("Anthropic error", err && err.message);
    return res.status(502).json({ error: "Translation service is unavailable. Please try again in a minute." });
  }

  // Pull text out + strip any stray code fences defensively
  const raw = (msg.content && msg.content[0] && msg.content[0].text) || "";
  const cleaned = raw.trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    // Final fallback: try to find the first {...} block in the text
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try { parsed = JSON.parse(m[0]); } catch (_) {}
    }
  }
  if (!parsed) {
    return res.status(502).json({ error: "Could not parse translation. Please try again." });
  }

  // Strip any keys we didn't ask for, normalise shape
  const safe = {
    letter_type:   typeof parsed.letter_type   === "string" ? parsed.letter_type   : "",
    summary:       typeof parsed.summary       === "string" ? parsed.summary       : "",
    key_dates:     Array.isArray(parsed.key_dates) ? parsed.key_dates.filter(d => d && d.date && d.what) : [],
    what_to_do:    Array.isArray(parsed.what_to_do) ? parsed.what_to_do.filter(s => typeof s === "string" && s.trim()) : [],
    your_rights:   typeof parsed.your_rights   === "string" ? parsed.your_rights   : "",
    who_to_call:   Array.isArray(parsed.who_to_call) ? parsed.who_to_call.filter(c => c && c.name && c.phone) : [],
    watch_out_for: typeof parsed.watch_out_for === "string" ? parsed.watch_out_for : "",
  };

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json(safe);
}

export const config = {
  runtime: "nodejs",
};
