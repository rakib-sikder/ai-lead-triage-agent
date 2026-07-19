# LeadPilot — AI Lead Triage Agent

An agentic workflow that classifies inbound leads, scores intent, and drafts a personalized
reply — automatically skipping cold/spam leads so you're not paying an LLM to write emails
nobody needs.

## How it works

Each lead goes through a two-step, conditionally-branching pipeline:

1. **Classify** — Claude scores the lead (`hot` / `warm` / `cold` / `spam`, 1-10 quality,
   reasoning, suggested next action) via a forced tool call, so the output is always valid
   structured JSON, never free-text to parse.
2. **Draft (conditional)** — only `hot` and `warm` leads get a second call that drafts a
   personalized reply referencing their actual message. `cold`/`spam` leads are skipped —
   this is the cost-aware part of the "agent": it decides whether the next step is worth
   running rather than always doing both steps for every lead.

Progress streams to the UI in real time (NDJSON) as each lead moves through
classifying → drafting → done, so you can watch the agent work lead-by-lead.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS · `@anthropic-ai/sdk` (tool-use
forced structured output) · `papaparse` (CSV import/export)

## Getting started

```bash
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), click **"Load sample leads"** (or add
your own / upload a CSV with `name,email,company,message` columns), then **"Run agent"**.

## Notes for production use

- Leads are processed sequentially to keep the on-screen trace readable and avoid bursty
  rate-limit spikes; batch/parallelize with a concurrency limit if you need higher throughput.
- Nothing is persisted server-side — results live in the browser tab and export to CSV.
  Add a database if you need a durable inbox/CRM view.
- Add auth before exposing this publicly, since anyone with the URL can spend your API credits.
