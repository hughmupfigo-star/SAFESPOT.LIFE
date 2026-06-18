# SAFE — Translate This Letter API

This folder contains the serverless backend for `translate-letter.html`.

## Deploy on Vercel (recommended, free tier is enough)

1. Push the deploy folder to a Git repo and connect it to Vercel.
2. In **Project Settings → Environment Variables**, add:
   - `ANTHROPIC_API_KEY` = your Anthropic API key (starts with `sk-ant-`)
3. Vercel auto-detects `/api/translate-letter.js` as a serverless function.
   The frontend at `/translate-letter.html` will call `/api/translate-letter`
   automatically.

## Required dependency

In the repo root, add a `package.json` if you don't already have one:

```json
{
  "type": "module",
  "dependencies": {
    "@anthropic-ai/sdk": "^0.30.0"
  }
}
```

Vercel will run `npm install` on deploy.

## Cost

Per translation, with Claude Haiku 4.5:
- ~£0.0005 to £0.002 (a fraction of a penny)
- 1,000 translations = roughly £0.50 to £2

## Privacy

The function does not log, store, or persist the letter text. It is sent to
the Anthropic API and immediately discarded once the response is returned.
Anthropic's API does not use API traffic for training.

## Alternative hosts

- **Netlify Functions**: rename the file, change `export default` to `exports.handler`. Same code.
- **Cloudflare Workers**: rewrite as a `fetch` handler. Same prompt, same shape.
- **AWS Lambda + API Gateway**: same handler signature works with minimal wrapping.

## Updating the system prompt

The system prompt sits at the top of `translate-letter.js`. Update it directly
and redeploy. There is no separate prompt store.
