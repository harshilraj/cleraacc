-- ─────────────────────────────────────────────────────────────
-- Personal Content Studio — Initial Schema Migration
-- Run this in the Supabase SQL editor:
--   Dashboard → SQL Editor → New query → paste & run
-- ─────────────────────────────────────────────────────────────

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────── sources ───────────────────────────────
CREATE TABLE IF NOT EXISTS sources (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind              text NOT NULL CHECK (kind IN ('competitor_link','inspired_link','knowledge_base','voice_sample','instruction')),
  platform          text NOT NULL CHECK (platform IN ('instagram','linkedin','both','n/a')) DEFAULT 'both',
  url               text,
  raw_text          text,
  summary           text,
  status            text NOT NULL CHECK (status IN ('pending','ready','failed')) DEFAULT 'pending',
  extraction_method text CHECK (extraction_method IN ('jina','apify','manual')),
  error_message     text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────── pipeline_cards ────────────────────────
CREATE TABLE IF NOT EXISTS pipeline_cards (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform     text NOT NULL CHECK (platform IN ('instagram','linkedin','both')),
  status       text NOT NULL CHECK (status IN ('idea','drafted','review','scheduled','posted')) DEFAULT 'idea',
  content      text NOT NULL DEFAULT '',
  hashtags     text[],
  notes        text,
  source_ids   uuid[],
  created_via  text NOT NULL CHECK (created_via IN ('chat','manual')) DEFAULT 'manual',
  position     int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────── chat_messages ─────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role       text NOT NULL CHECK (role IN ('user','assistant')),
  content    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────── app_settings ──────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  id      int PRIMARY KEY DEFAULT 1,
  secrets jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT single_row CHECK (id = 1)
);

-- Seed the single settings row
INSERT INTO app_settings (id, secrets) VALUES (1, '{}')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────── generation_runs ───────────────────────
CREATE TABLE IF NOT EXISTS generation_runs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt       text NOT NULL,
  sources_used uuid[] NOT NULL DEFAULT '{}',
  cost_usd     numeric,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────── updated_at triggers ───────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'sources_updated_at') THEN
    CREATE TRIGGER sources_updated_at
      BEFORE UPDATE ON sources
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'pipeline_cards_updated_at') THEN
    CREATE TRIGGER pipeline_cards_updated_at
      BEFORE UPDATE ON pipeline_cards
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- ─────────────────── seed default instructions ─────────────
-- These are editable defaults — the user can delete or modify them in-app.
INSERT INTO sources (kind, platform, status, raw_text, summary)
VALUES
  ('instruction', 'n/a', 'ready',
   'No em dashes. Write with hyphens if needed, or restructure the sentence.',
   'Writing rule: avoid em dashes'),
  ('instruction', 'n/a', 'ready',
   'Avoid AI-sounding buzzwords: "game-changer", "leverage", "seamless", "unlock", "revolutionize", "delve", "cutting-edge".',
   'Writing rule: avoid buzzwords'),
  ('instruction', 'n/a', 'ready',
   'Write in a direct one-to-one voice — as if talking to a specific person, not broadcasting to a crowd.',
   'Writing rule: direct voice, not broadcast')
ON CONFLICT DO NOTHING;
