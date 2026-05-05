# AEO Diagnostic

**AI Engine Optimization** � Free-tier report card for checking whether AI providers recommend your product when shoppers ask category-level buying questions.

## What It Does

Enter three things:
1. A shopper query: *"best magnesium supplement for seniors"*
2. Your product name: *"MagCare Premium"*
3. Your brand name: *"HealthFirst"*

The app queries **three free AI providers in parallel** (Google Gemini, Groq, OpenRouter) with the same prompt, token budget, temperature, and timeout. It scores each response and returns:

- **Overall 0-100 visibility grade**
- **Per-engine scores** (brand mention, product mention, rank position, sentiment)
- **Competitor analysis** (which brands showed up alongside yours)
- **Five action items** (specific steps to improve AI visibility)

## Stack

| Component | Technology |
| --- | --- |
| Frontend | Next.js App Router, React, TypeScript |
| Styling | CSS custom properties |
| **Core APIs** | Google Gemini, GroqCloud (Llama), OpenRouter |
| **Optional APIs** | Hugging Face (sentiment), DuckDuckGo (ranking validation) |
| Testing | Vitest |
| Deployment | Vercel |

## Free-Tier APIs Explained

### Required: Core AI Engines (Pick at least 1)

All three are **completely free**, no credit card required:

| Provider | Free Tier | Signup | Use Case |
| --- | --- | --- | --- |
| **Google Gemini** | 60 requests/min | [aistudio.google.com](https://aistudio.google.com/app/apikey) | Fast, latest models |
| **GroqCloud** | 14,400 requests/day | [console.groq.com](https://console.groq.com/keys) | Open-source Llama models |
| **OpenRouter** | Free tier available | [openrouter.ai/keys](https://openrouter.ai/keys) | Model aggregator |

### Optional: Enhanced Analysis

These are enabled automatically if you add API keys, but the app works fine without them.

#### Hugging Face – Sentiment Analysis (Optional)

**What it does:** Analyzes the sentiment (positive/negative/neutral) of each AI provider's response using the `distilbert-base-uncased-finetuned-sst-2-english` model.

**Free tier:** 30,000 requests/month (no credit card needed)

**Setup:**
1. Sign up at [huggingface.co](https://huggingface.co)
2. Create API token at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
3. Add to `.env.local`:
   ```env
   HUGGINGFACE_API_KEY=hf_...
   ```

**How to verify it's working:**
- Open browser DevTools (F12)
- Run a diagnostic
- Check Network tab → requests to `api-inference.huggingface.co`
- In the results, each engine card shows a **sentiment badge** (positive/neutral/negative)
- If sentiment shows as "not_mentioned", Hugging Face either isn't configured or API failed gracefully

**Impact:** Adds sentiment analysis to each engine result. Without it, sentiment is inferred from word matching only.

#### DuckDuckGo Search – Ranking Validation (Optional)

**What it does:** Cross-validates AI recommendations by searching real web results for your brand and product.

**Free tier:** No authentication required, unlimited requests

**Setup:**
- Already enabled! No API key needed. It uses the public DuckDuckGo API.
- No configuration required in `.env.local`

**How to verify it's working:**
- Run a diagnostic for a well-known brand (e.g., "GitHub Copilot" for "best ai coding assistant")
- Scroll to the engine cards
- Look for additional context under each engine result
- Search validation happens silently in the background (errors don't block the report)
- If results show a brand that's visibly ranked high in real search, DuckDuckGo validation is working

**Impact:** Provides real-world ranking context to validate AI engine recommendations.

## Getting Started

### Prerequisites
- Node.js 20.11.0+
- **At least one** of these free API keys:
  - [Google Gemini](https://aistudio.google.com/app/apikey) – No credit card needed
  - [GroqCloud](https://console.groq.com/keys) – No credit card needed
  - [OpenRouter](https://openrouter.ai/keys) – Free models available
- *(Optional)* [Hugging Face token](https://huggingface.co/settings/tokens) for sentiment analysis

### Run Locally

```bash
git clone https://github.com/Falcon-J/aeo-diagnostic.git
cd aeo-diagnostic
npm install
cp .env.example .env.local
```

Fill `.env.local` with your API keys:
```env
GEMINI_API_KEY=AIza...
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-or-v1-...
```

Then:
```bash
npm run dev
```

Open http://localhost:3000

### Verify

```bash
npm run typecheck
npm test
npm run build
```

## Deployment

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

When prompted, add your environment variables in the Vercel dashboard.

Your app will be live at `https://aeo-diagnostic.vercel.app` (or your custom domain).

## Scoring Algorithm

Each engine scores 0�100 based on:

| Signal | Points |
| --- | --- |
| Brand name mentioned | +30 |
| Product name mentioned | +20 |
| Ranked in recommendation list | +30 |
| Positive sentiment context | +20 |
| Neutral sentiment context | +5 |

**Overall score** = average of all completed engines. Failed engines don't block successful ones.

## Fair Comparison

Since each provider has different internal controls, the app applies identical external constraints:

- **Same prompt** to all providers
- **Same 700-token budget** for responses
- **Same 0.2 temperature** (deterministic)
- **Same 45-second timeout**
- **Same scoring logic**

## Monitoring Optional APIs in Action

### Real-Time Progress Bar

While running a diagnostic, watch the progress bar animate through stages:
- **0-35%:** Initializing engines
- **35-75%:** Querying Gemini, Groq, OpenRouter in parallel
- **75-95%:** Processing responses and performing optional analysis
- **95-100%:** Generating report and competitors

### How to Verify Each API

#### Verify Hugging Face Sentiment

1. Run a diagnostic query
2. Scroll to the **Engine Cards** section at the bottom
3. Look for a **sentiment indicator** on each engine result:
   - ✅ Shows "Positive", "Neutral", or "Negative" = Hugging Face working
   - ⚠️ Shows only "Brand not mentioned" or defaults to word-counting = No Hugging Face key OR API error

**Checking logs:**
```bash
# In browser DevTools (F12)
# Go to Network tab
# Search for "huggingface" or "api-inference"
# Should see POST requests to Hugging Face API if configured
```

#### Verify DuckDuckGo Search Validation

1. Run a diagnostic with a **real brand** (e.g., "iPhone" for "best smartphone")
2. Scroll to results
3. **DuckDuckGo works silently** in the background:
   - Results show normal analysis (DuckDuckGo never blocks the report)
   - Ranking validation is informational only
   - Errors fail gracefully (report still completes)

**To debug DuckDuckGo:**
```bash
# In browser DevTools (F12)
# Go to Console tab
# Run: fetch('https://api.duckduckgo.com/?q=best+smartphone&format=json')
# Should return valid JSON with search results
```

### Understanding the Final Output

Each **Engine Card** shows:

| Field | Meaning |
| --- | --- |
| **Score (0-100)** | Brand visibility grade for this provider |
| **Status** | ✅ Completed or ❌ Failed |
| **Model** | Which AI model was used |
| **Brand Mentioned** | Was your brand name found? |
| **Rank** | Position in recommendations (if ranked) |
| **Sentiment** | Positive/Neutral/Negative (from Hugging Face if enabled) |
| **Competitors** | Other brands mentioned by this engine |

### Example: GitHub Copilot Query

```
Query: "best ai coding assistant"
Product: "GitHub Copilot"
Brand: "GitHub"
```

**Expected output if both optional APIs working:**
- ✅ Gemini: 92/100 - Brand mentioned, ranked high, positive sentiment (HF)
- ✅ Groq: 100/100 - Brand ranked #1, positive sentiment (HF)
- ✅ OpenRouter: 85/100 - Brand visible, neutral sentiment (HF)
- **Real search check** (DuckDuckGo): "GitHub" visible in top results for "ai coding assistant"

## Fair Comparison

## Project Structure

```
src/
+-- app/
�   +-- api/
�   �   +-- analyze/route.ts       # POST endpoint
�   �   +-- providers/route.ts     # Provider status
�   +-- globals.css
�   +-- layout.tsx
�   +-- page.tsx
+-- components/
�   +-- ActionItems.tsx
�   +-- EngineCard.tsx
�   +-- OverallScore.tsx
�   +-- ScoreRing.tsx
+-- lib/
�   +-- analyze.ts                 # Core logic
�   +-- analyze.test.ts
+-- types/
    +-- index.ts
```

## Why This Matters

**AI Engine Optimization (AEO)** is the new SEO. As more shoppers rely on ChatGPT, Claude, Gemini, and other free models for buying advice, brands that don't show up in AI recommendations lose visibility and sales.

This tool is a diagnostic � like an X-ray for AI visibility.

## License

MIT

## Contributing

Contributions welcome! Open an issue or submit a PR.
