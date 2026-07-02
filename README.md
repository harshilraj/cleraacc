# Content Studio

A single-tenant web app for writing Instagram and LinkedIn posts with AI assistance. Powered by Claude (Anthropic), Supabase, and Next.js.

## Features

- **AI Chat** — Ask for drafts grounded in your knowledge base, voice samples, and competitor/inspiration links
- **Knowledge Base** — Competitor links, inspiration links, past writing samples, and hard writing rules
- **Kanban Pipeline** — Drag-and-drop content board (Idea → Drafted → Review → Scheduled → Posted)
- **Extraction** — Automatic link scraping via Jina Reader (free) with Apify fallback
- **Login Gate** — Simple password-protected single-user access

---

## Setup

### 1. Supabase — Run the migration

1. Open your Supabase project: https://supabase.com/dashboard/project/sbcbeiyirpowdiqajqhd
2. Go to **SQL Editor** → **New query**
3. Paste the contents of `supabase/migrations/001_initial_schema.sql`
4. Click **Run**

This creates 5 tables (`sources`, `pipeline_cards`, `chat_messages`, `app_settings`, `generation_runs`) and seeds 3 default writing instructions.

### 2. Get your Supabase service role key

1. In Supabase: **Settings** → **API** → copy **service_role** key
2. Add it to your environment variables as `SUPABASE_SERVICE_ROLE_KEY`

> **Important**: The service role key bypasses Row Level Security and must NEVER be used as a `NEXT_PUBLIC_` variable.

### 3. Generate a session secret

```bash
openssl rand -hex 32
```

Copy the output and use it as `SESSION_SECRET`.

### 4. Environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

Required variables:
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `SESSION_SECRET` | Random 32+ char string for cookie signing |
| `APP_USERNAME` | Login username (default: `cleraacc`) |
| `APP_PASSWORD` | Login password (default: `harshilcleraa`) |

API keys for Anthropic and Apify are stored **in-app** via the Settings page — they are NOT env vars.

### 5. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Log in with `cleraacc` / `harshilcleraa` (or your custom env vars).

### 6. Add your Anthropic API key

Go to **Settings** in the app and paste your Anthropic API key. Without this, generation will not work.

---

## Deploying to Vercel

1. Push this repo to GitHub
2. Import into Vercel
3. Add all environment variables in the Vercel dashboard (Settings → Environment Variables)
4. Deploy

The app builds cleanly with `npm run build` — no additional Vercel configuration needed.

---

## Architecture

```
src/
  app/
    page.tsx                 # Workspace (chat + right rail)
    login/page.tsx           # Login gate
    sources/page.tsx         # Knowledge base & link extraction
    pipeline/page.tsx        # Kanban board
    settings/page.tsx        # API key management
    api/
      auth/login/route.ts    # Session creation
      auth/logout/route.ts   # Session destruction
      chat/route.ts          # AI generation endpoint
      sources/route.ts       # Sources CRUD
      sources/extract/route.ts # Re-trigger extraction
      pipeline/route.ts      # Cards list + create
      pipeline/[id]/route.ts # Card update + delete
      pipeline/reorder/route.ts # Batch drag-and-drop persist
      settings/route.ts      # API key storage (masked)
  lib/
    session.ts               # iron-session config
    supabase.ts              # Server-side DB client
    extraction.ts            # Jina + Apify + Claude summarizer
    generation.ts            # Retrieval + prompt assembly + parsing
  components/
    layout/Nav.tsx, AppShell.tsx
    chat/DraftCard.tsx, QuickAddModal.tsx
  middleware.ts              # Auth guard for all routes
  types/database.ts          # TypeScript interfaces
supabase/migrations/
  001_initial_schema.sql     # All tables + triggers + seed data
```

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS v4 + CSS custom properties
- **Database**: Supabase Postgres
- **AI**: Anthropic Claude (claude-opus-4-5 for generation, haiku for summaries)
- **Auth**: iron-session (HMAC-signed httpOnly cookie)
- **Scraping**: Jina Reader (free) → Apify fallback
- **Drag-and-drop**: @dnd-kit/core + @dnd-kit/sortable
