# AEO Diagnostic

AI Engine Optimization Report Card for checking whether free-tier AI providers recommend a product when shoppers ask category-level buying questions.

## What It Does

A brand owner enters:

1. A shopper query, such as `best magnesium supplement for seniors`
2. A product name
3. A brand name

The app queries every configured free provider in parallel with the same prompt, token budget, temperature, and timeout. It scores the responses, extracts likely competitors, and returns a report card with:

- Overall A-F visibility grade
- Per-engine 0-100 score
- Mention, rank, and sentiment diagnostics
- Competitor tags
- Five action items for improving AI visibility
- Raw response toggles for reviewer transparency
- Provider readiness badges so reviewers can see which free engines are configured before running

## Stack

| Layer | Tech |
| --- | --- |
| App | Next.js App Router |
| Language | TypeScript |
| APIs | Google Gemini, GroqCloud, OpenRouter |
| Styling | CSS custom properties |
| Tests | Vitest |
| Deploy | Vercel |

## Run Locally

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

On macOS/Linux:

```bash
cp .env.example .env.local
npm run dev
```

Fill `.env.local` with at least one provider key:

```bash
GEMINI_API_KEY=...
GROQ_API_KEY=...
OPENROUTER_API_KEY=...
```

Free-key and optional-provider signup links:

- Gemini: `https://aistudio.google.com/app/apikey`
- Groq: `https://console.groq.com/keys`
- OpenRouter: `https://openrouter.ai/keys`
## Verify

```bash
npm run typecheck
npm test
npm run build
```

## Deploy to Vercel

```bash
npx vercel
```

Add the same environment variables in the Vercel project settings:

- `GEMINI_API_KEY`
- `GROQ_API_KEY`
- `OPENROUTER_API_KEY`
- Optional model overrides: `GEMINI_MODEL`, `GROQ_MODEL`, `OPENROUTER_MODEL`

## Project Structure

```text
src/
  app/
    api/analyze/route.ts
    api/providers/route.ts
    globals.css
    layout.tsx
    page.tsx
  components/
    ActionItems.tsx
    EngineCard.tsx
    OverallScore.tsx
    ScoreRing.tsx
  lib/
    analyze.test.ts
    analyze.ts
  types/
    index.ts
```

## Scoring

Each engine is scored 0-100:

| Factor | Max points |
| --- | ---: |
| Brand name mentioned | 30 |
| Product name mentioned | 20 |
| Ranked in a recommendation list | 30 |
| Positive sentiment near mention | 20 |
| Neutral sentiment near mention | 5 |

Overall score is the average of configured engine scores. Failed configured engines receive score `0` but do not block successful engines.

## Fair-Run Settings

Providers do not expose the same internal reasoning controls, and they will not take the same wall-clock time. The app keeps the comparison fair by applying the same external constraints to every configured provider:

- Same shopper prompt
- Same 700 output-token response budget
- Same low temperature
- Same 45 second request timeout
- Same deterministic scoring algorithm
