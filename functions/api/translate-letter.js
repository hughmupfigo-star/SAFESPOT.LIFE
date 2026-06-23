// Cloudflare Pages Function — POST /api/translate-letter
//
// SAFE's Letter Translator. A young person sends an official letter — as pasted
// text, a phone photo, or a PDF scan — and gets it explained in plain English
// (optionally translated into another language), with the dates pulled out,
// what to do next, their rights, and who to call for free help.
//
// Privacy: this function does NOT store, log, or persist the letter. It is sent
// to the Anthropic API to produce the explanation and then discarded. Anthropic
// does not train on API traffic.
//
// Secret (set once):  wrangler pages secret put ANTHROPIC_API_KEY
//   ANTHROPIC_API_KEY  (required)

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_OUTPUT_TOKENS = 2000;
const MAX_TEXT = 12000;            // characters of pasted text
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB decoded (photo or PDF)

// Languages offered. code -> human name used in the prompt.
const LANGS = {
  en: 'English',
  ar: 'Arabic',
  fa: 'Persian (Farsi)',
  ps: 'Pashto',
  ku: 'Kurdish (Sorani)',
  pl: 'Polish',
  ro: 'Romanian',
  ru: 'Russian',
  uk: 'Ukrainian',
  so: 'Somali',
  ti: 'Tigrinya',
  am: 'Amharic',
  sq: 'Albanian',
  ur: 'Urdu',
  pa: 'Punjabi',
  bn: 'Bengali',
  gu: 'Gujarati',
  fr: 'French',
  es: 'Spanish',
  pt: 'Portuguese',
  vi: 'Vietnamese',
  zh: 'Chinese (Simplified)',
  tr: 'Turkish',
};

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const cors = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
});

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors() },
  });

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: cors() });
}

function buildSystemPrompt(targetLangName) {
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

  const tail = `

OUTPUT FORMAT: a single JSON object. No code fences. No commentary outside the JSON.`;

  return base + langRule + tail;
}

// Roughly how many bytes a base64 string decodes to, without decoding it.
function base64Bytes(b64) {
  if (typeof b64 !== 'string') return 0;
  const len = b64.length;
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor((len * 3) / 4) - padding;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.ANTHROPIC_API_KEY) {
    return json({ error: "The translator isn't configured on this server yet." }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: 'Send JSON.' }, 400);
  }

  const langCode = typeof body.language === 'string' && LANGS[body.language] ? body.language : 'en';
  const targetLangName = LANGS[langCode];

  // Build the user message content: text, image, or PDF.
  let content;
  const file = body.file;

  if (file && typeof file === 'object' && typeof file.data === 'string') {
    const kind = file.kind;
    const mediaType = file.media_type || '';
    const bytes = base64Bytes(file.data);

    if (bytes > MAX_FILE_BYTES) {
      return json({ error: 'That file is too big. Please use a photo or PDF under 8 MB.' }, 413);
    }
    if (bytes < 64) {
      return json({ error: 'That file looks empty. Try again.' }, 400);
    }

    if (kind === 'image') {
      if (!ALLOWED_IMAGE_TYPES.includes(mediaType)) {
        return json({ error: 'That image format is not supported. Use a JPG or PNG photo.' }, 400);
      }
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
    // Pasted text path
    const letter = typeof body.letter === 'string' ? body.letter.trim() : '';
    if (!letter) {
      return json({ error: 'Paste the letter, or upload a photo or PDF of it.' }, 400);
    }
    if (letter.length < 30) {
      return json({ error: 'That is a bit short — paste a few more sentences so I can make sense of it.' }, 400);
    }
    if (letter.length > MAX_TEXT) {
      return json({ error: 'That is a lot of text. Paste just the most important parts.' }, 413);
    }
    content = [{ type: 'text', text: letter }];
  }

  // Call Anthropic via raw fetch (works on the Workers runtime, no SDK needed).
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
        model: MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: buildSystemPrompt(targetLangName),
        messages: [{ role: 'user', content }],
      }),
    });
  } catch (err) {
    return json({ error: 'Translation service is unavailable right now. Please try again in a minute.' }, 502);
  }

  if (!resp.ok) {
    // 400 from the API usually means an unreadable/unsupported file.
    if (resp.status === 400 || resp.status === 422) {
      return json({ error: "I couldn't read that file. Try a clearer photo, or paste the text instead." }, 400);
    }
    return json({ error: 'Translation service is unavailable right now. Please try again in a minute.' }, 502);
  }

  let apiData;
  try {
    apiData = await resp.json();
  } catch (e) {
    return json({ error: 'Could not read the translation. Please try again.' }, 502);
  }

  const raw =
    (apiData && Array.isArray(apiData.content) && apiData.content[0] && apiData.content[0].text) || '';
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try { parsed = JSON.parse(m[0]); } catch (_) { /* ignore */ }
    }
  }
  if (!parsed) {
    return json({ error: 'Could not understand the letter this time. Please try again.' }, 502);
  }

  // Normalise to exactly the shape the page expects.
  const safe = {
    letter_type: typeof parsed.letter_type === 'string' ? parsed.letter_type : '',
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    key_dates: Array.isArray(parsed.key_dates)
      ? parsed.key_dates.filter((d) => d && d.date && d.what).map((d) => ({ date: String(d.date), what: String(d.what) }))
      : [],
    what_to_do: Array.isArray(parsed.what_to_do)
      ? parsed.what_to_do.filter((s) => typeof s === 'string' && s.trim())
      : [],
    your_rights: typeof parsed.your_rights === 'string' ? parsed.your_rights : '',
    who_to_call: Array.isArray(parsed.who_to_call)
      ? parsed.who_to_call
          .filter((c) => c && c.name && c.phone)
          .map((c) => ({ name: String(c.name), phone: String(c.phone), when_to_use: String(c.when_to_use || '') }))
      : [],
    watch_out_for: typeof parsed.watch_out_for === 'string' ? parsed.watch_out_for : '',
    language: langCode,
  };

  return json(safe);
}
