# PROGRESS.md — Content Studio

## Status: Build phase complete, pending verification

---

## Phase 1 — Scaffold + Design System ✅
- Next.js 16 (App Router) + TypeScript + Tailwind v4
- Design token system written in `globals.css` — "Quiet Studio" palette
- Fonts: Plus Jakarta Sans (display) + Inter (body) from Google Fonts
- Root layout updated

## Phase 2 — Login Gate ✅
- `src/middleware.ts` — guards every route except `/login`
- `src/app/login/page.tsx` — clean form, inline error handling
- `src/app/api/auth/login/route.ts` — iron-session cookie (30-day TTL)
- `src/app/api/auth/logout/route.ts`
- `src/lib/session.ts` — shared iron-session config
- Defaults: `cleraacc` / `harshilcleraa` (overridable via env)

## Phase 3 — Supabase Schema ✅
- `supabase/migrations/001_initial_schema.sql`
  - Tables: sources, pipeline_cards, chat_messages, app_settings, generation_runs
  - updated_at triggers on sources + pipeline_cards
  - 3 seeded default instruction entries
  - Single app_settings row pre-inserted
- `src/lib/supabase.ts` — server-side client (service role key)
- `src/types/database.ts` — full TypeScript interfaces

## Phase 4 — Settings Page ✅
- `src/app/settings/page.tsx` — masked inputs, live status pills, env var note
- `src/app/api/settings/route.ts` — GET (masked preview) + POST (save)

## Phase 5 — Sources Page + Extraction ✅
- `src/app/sources/page.tsx` — 5 tabs, polling for extraction status
- `src/app/api/sources/route.ts` — GET / POST / DELETE / PATCH
- `src/app/api/sources/extract/route.ts` — re-trigger extraction
- `src/lib/extraction.ts`
  - Tier 1: Jina Reader (20s timeout, quality check, login-wall detection)
  - Tier 2: Apify fallback (instagram-post-scraper / website-content-crawler)
  - Claude Haiku summarization on success
  - Fails gracefully → status='failed' + error_message

## Phase 6 — Chat Workspace + Generation ✅
- `src/app/page.tsx` — two-column workspace, chat + right rail
- `src/app/api/chat/route.ts` — retrieval → Claude → draft parsing
- `src/components/chat/DraftCard.tsx` — hook/body/hashtags, push/copy/regen
- `src/components/chat/QuickAddModal.tsx` — bypass AI direct injection
- `src/lib/generation.ts`
  - Keyword-based retrieval (recency + overlap scoring)
  - System prompt assembly (instructions → voice → competitor → inspired → knowledge)
  - Platform-specific formatting rules
  - Draft parsing from <draft> JSON tags

## Phase 7 — Kanban Pipeline ✅
- `src/app/pipeline/page.tsx` — full DnD Kit board
- DragOverlay, optimistic updates, batch reorder persist
- `src/app/api/pipeline/route.ts` — list + create
- `src/app/api/pipeline/[id]/route.ts` — update + delete
- `src/app/api/pipeline/reorder/route.ts` — batch drag-and-drop

## Phase 8 — Polish + Docs ✅
- `src/components/layout/Nav.tsx` — active route highlighting, logout
- `src/components/layout/AppShell.tsx`
- `README.md` — full setup guide
- `.env.local` — seeded with Supabase credentials
- `.env.example` — template

---

## Remaining Steps for User

1. **Run SQL migration** → https://supabase.com/dashboard/project/sbcbeiyirpowdiqajqhd → SQL Editor
2. **Add service role key** to `.env.local` (get from Supabase Settings → API)
3. **Add Anthropic API key** in-app via /settings
4. **Start dev server**: `npm run dev`

---

## Known limitations / intentional omissions
- Generation is NOT streamed (full response then display) — streaming would require more complex client-side parsing
- Regenerate button on DraftCard currently just marks state; full regeneration requires re-sending the original message (v2 feature)
- Source polling interval is 3s — aggressive but fine for a single-user app
