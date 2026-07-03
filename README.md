# Content Studio

A single-tenant web app for writing all socials content with AI assistance.

## Features

- **AI Chat** — Ask for drafts grounded in your knowledge base, voice samples, and competitor/inspiration links
- **Knowledge Base** — Competitor links, inspiration links, past writing samples, and hard writing rules
- **Kanban Pipeline** — Drag-and-drop content board (Idea → Drafted → Review → Scheduled → Posted)
- **Extraction** — Automatic link scraping via Jina Reader (free) with Apify fallback
- **Login Gate** — Simple password-protected single-user access

---

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS v4 + CSS custom properties
- **Database**: Supabase Postgres
- **AI**: Anthropic Claude (claude-opus-4-5 for generation, haiku for summaries)
- **Auth**: iron-session (HMAC-signed httpOnly cookie)
- **Scraping**: Jina Reader (free) → Apify fallback
- **Drag-and-drop**: @dnd-kit/core + @dnd-kit/sortable
