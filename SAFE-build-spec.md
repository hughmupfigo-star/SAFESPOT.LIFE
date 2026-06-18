# SAFE — Build Spec for the Differentiators

A concrete, solo-buildable spec for the features that make SAFE unlike any other youth service.
Written for one person with no team. Every feature is marked for effort and whether it can ship alone.

**Note on SMS (Tools 004):** removed from the homepage. It needs a live number, monitoring, and
ongoing upkeep you can't sustain solo right now. Park it. Bring it back when there's a team and a budget.

---

## Priority order (what to build first)

1. **Translator reply-generator** — extends a tool you already have. Highest value, lowest new work.
2. **Age + nation logic** — your accuracy moat. Reusable across every article and tool.
3. **Legit-check ("is this real?")** — same engine as the translator, new framing.
4. **Resumable sessions** — small, privacy-preserving, makes everything else usable on borrowed phones.
5. **Warm handoffs** — start as a manually-maintained "verified live" list, automate later.
6. **Story Intelligence as funding engine** — not a feature, the business model. Keeps the rest free.

---

## 1. Translator reply-generator

**What it is now:** paste a scary letter → plain-English explanation.
**The leap:** also generate the *response* the young person should send.

**Output structure (per letter):**

- **What this is** — letter type + one-line meaning.
- **Key dates** — extracted, with "what happens on this date."
- **Watch out for** — traps, deadlines, things not to do.
- **What to send back** — a ready-to-copy reply (email/letter text), pre-filled where safe,
  with `[your name]` style blanks for the rest.
- **Free help** — who to call, with the "verified live" badge (see §5).

**Reply templates to seed (UK, most common):**

- Section 21 / Section 8 eviction → request for written reasons + "I am seeking advice from Shelter" holding reply.
- Universal Credit decision → Mandatory Reconsideration request.
- College/school exclusion → appeal request + ask for the policy in writing.
- Debt collector → "prove the debt" / CCA request letter.
- Council homelessness → request a Section 184 decision in writing.

**Build notes (solo):**

- Templates are static text files with `{{placeholders}}`. No AI needed for the reply itself —
  the AI classifies the letter and picks the template; the template does the rest. Cheaper, safer, predictable.
- Add a fixed disclaimer line: *"This is information, not legal advice. Free regulated advice: [link]."*
- "Nothing is stored" stays true — generate client-side or delete on send.

---

## 2. Age + nation logic (the accuracy moat)

**What it is:** answers change based on exact age (15/16/17/18) and UK nation
(England / Scotland / Wales / Northern Ireland), because rights genuinely differ.

**Two inputs, asked once, never stored to an account:**

- Age band: `under 16 | 16 | 17 | 18+`
- Nation: `England | Scotland | Wales | NI`

**Where the differences actually bite (get these right):**

- **"Emancipation"** — does NOT exist in UK law. Common myth. The page must say so and explain the real routes
  (leaving home at 16 with caveats, who has duties to house you).
- **Homelessness duties** — vary by nation; Scotland and Wales have stronger duties than England.
- **Leaving/being asked to leave home** — different at 16 vs under 16; police "return" powers differ.
- **Consent to medical/mental-health treatment** — Gillick/Fraser in England & Wales vs Scotland's Age of Legal Capacity Act.
- **Care leaver support** — entitlements by age and nation.

**Build notes (solo):**

- Implement as a small JSON content map: `topic → {nation → {ageBand → snippet}}`.
- Default to the safest, most cautious wording when an input is missing.
- This is **content work, not engineering** — the value is in getting the facts right.
  Verify each snippet against a named source (Shelter, Citizens Advice, gov.uk, Coram) and date it.
- **Risk flag:** wrong legal info is worse than none. Put a "last checked" date on every snippet and
  a single line: *"Rules change. If this date is old, double-check the linked source."*

---

## 3. Legit-check — "Is this real? Am I allowed?"

**What it is:** a young person pastes a threat/message and asks "is this legit / can they actually do this?"
Same engine as the translator, different doorway.

**Covers:**

- Fake bailiffs / debt threats ("we're coming to your house today").
- Scam job ads (upfront fees, "send ID to this WhatsApp," pay-to-start).
- "We'll call the police / your parents / your school" — what authorities and adults *can and can't* lawfully do at their age.
- Phishing / sextortion threats aimed at teens.

**Output:** `Likely scam | Real but here's your rights | Need a human` + the specific reason + what to do.

**Build notes (solo):** reuses §1 classification + §2 age logic. Ship after those two exist.

---

## 4. Resumable sessions (privacy + continuity)

**The tension:** you promise nothing is stored, but kids use borrowed/PAYG phones and lose progress.

**The fix — a short re-entry code, not an account:**

- On any tool, user can tap "Save my place." Generates a 4-word or 6-digit code.
- State is held server-side **encrypted, keyed only by that code, auto-deleted after 48–72h.**
- No name, no email, no phone. The code is the only key. Lose it = data gone (by design).
- Re-enter the code on any device → resume.

**Build notes (solo):**

- One small key-value store with TTL expiry (e.g. a single table or Redis with `EXPIRE`).
- Make "Delete now" a one-tap button. Show the expiry time plainly.
- Privacy copy: *"We keep this for 3 days max, locked to your code, then it's gone. No name needed."*

---

## 5. Warm handoffs (start manual, automate later)

**The problem with every directory:** dead numbers, closed services, 6-month waitlists.
**SAFE's edge:** only show help you've confirmed is actually answering.

**Phase 1 — solo, no code:**

- Keep a spreadsheet of services with a `last_verified` date and `status`.
- Show a **"Checked live — [date]"** badge next to anything verified in the last 30 days.
- Hide or grey out anything not checked recently. Honesty beats completeness.

**Phase 2 — when there's help:**

- Periodic automated checks (phone/website up), volunteer "ring-round" rota, follow-up message
  ("did you get through?").

**Why it matters:** "We checked this line is answering today" is a sentence no competitor's PDF can say.

---

## 6. Story Intelligence as the funding engine

This is the answer to "how does a free, independent service survive without becoming a gatekeeper itself."

**The model:**

- Free side (advice, tools) stays free and unconditional.
- Paid side: monthly **Story Intelligence** reports sold to DfE, councils, NGOs, researchers, journalists —
  anonymised pattern analysis of what young people are actually facing, ahead of the headlines.
- The paid side funds the free side. SAFE never relies on the institutions it routes young people around.

**Solo-realistic first step:**

- One report. Pick the top 5 issues from whatever stories/queries you already have.
- Sell a £-per-year subscription or one-off report to 2–3 buyers to prove the model.
- Make the methodology transparent ("real stories, analysed for patterns — not a survey").

**Guardrail:** never sell anything that could identify a young person. Aggregate only. State this loudly —
it's also a selling point.

---

## What NOT to take on solo (be honest with yourself)

- **Live human chat / "TALK to a real person"** — only promise this if you can actually staff it with
  clear hours. An unanswered "talk to a human" button destroys trust faster than not having one.
- **24/7 anything.** Use stated hours.
- **The SMS lifeline** — parked, as above.

A single person can realistically ship §1–§4 as content + small static/serverless code, and run §5–§6 manually.
That alone makes SAFE more useful than almost anything else aimed at this group.
