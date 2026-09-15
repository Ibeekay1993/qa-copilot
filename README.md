# QA Copilot

Personal, evidence-first customer-support QA workspace with three input modes: **Paste**, **Listen**, and **Camera**.

## Modes

- **Paste** — paste a conversation or ticket transcript.
- **Listen** — capture a bounded call segment through the personal device microphone, transcribe it server-side, and evaluate it.
- **Camera** — capture screen positions while scrolling a conversation; captured frames are supplied to the vision evaluation path.

All three modes feed the same QA evaluation model. The human QA officer remains the final decision maker.

## Architecture

React + TypeScript + Vite frontend; Supabase Edge Functions for AI calls; PostgreSQL/RLS for evaluation storage; OpenAI Responses API for structured QA analysis and an OpenAI transcription endpoint for audio.

## Security

Do not place AI provider secrets in browser environment variables. Use Supabase Edge Function secrets. Use this tool only where your organisation's customer-data, recording, monitoring, and BYOD policies permit it. Raw screenshots/audio should be ephemeral unless an explicit retention policy exists.

See [SECURITY.md](SECURITY.md).

## Local development

```bash
npm install
cp .env.example .env
npm run build
npm run dev
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for the frontend. Configure `OPENAI_API_KEY` and optional model settings as Supabase Edge Function secrets.

## Status

Initial MVP architecture. Before production use, complete provider/model verification, organisation-specific rubric ingestion, persistent human-review workflow, rate limiting, CSP, audit logging, retention controls, automated tests, and security review.
