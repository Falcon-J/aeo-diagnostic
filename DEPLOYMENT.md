# AEO Diagnostic — Deployment Guide

## Public GitHub Repository

After pushing to GitHub, your repo will be at:
```
https://github.com/Falcon-J/aeo-diagnostic
```

## Deploy to Vercel (Free)

### Step 1: Push to GitHub
```bash
git remote add origin https://github.com/Falcon-J/aeo-diagnostic.git
git branch -M main
git push -u origin main
```

### Step 2: Import to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click **"New Project"**
3. Select your GitHub repo: `aeo-diagnostic`
4. Vercel auto-detects Next.js — click **Deploy**

### Step 3: Add Environment Variables

In Vercel dashboard → Project Settings → Environment Variables, add:

```
GEMINI_API_KEY=AIza...
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-or-v1-...
```

Optional model overrides:
```
GEMINI_MODEL=gemini-2.5-flash-lite
GROQ_MODEL=llama-3.1-8b-instant
OPENROUTER_MODEL=openrouter/free
```

### Step 4: Redeploy

Click **"Deployments"** → **"Redeploy"** on the latest deployment.

Your app is now live at:
```
https://aeo-diagnostic.vercel.app
```

---

## Local Testing Before Deployment

```bash
npm install
cp .env.example .env.local
# Fill .env.local with your API keys
npm run build
npm start
```

Then open `http://localhost:3000`.

---

## What Your Public Links Will Be

| Asset | Link |
| --- | --- |
| **GitHub Repo** | `https://github.com/Falcon-J/aeo-diagnostic` |
| **Live App** | `https://aeo-diagnostic.vercel.app` |
| **Video Script** | `/VIDEO_SCRIPT.md` (in repo) |

---

## For Your Video

Show these URLs at the end:
- **GitHub**: `github.com/Falcon-J/aeo-diagnostic`
- **Live App**: `aeo-diagnostic.vercel.app`
