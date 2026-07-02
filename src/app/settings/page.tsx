'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';

interface KeyStatus {
  anthropic_configured: boolean; anthropic_preview: string | null;
  openai_configured: boolean; openai_preview: string | null;
  gemini_configured: boolean; gemini_preview: string | null;
  openrouter_configured: boolean; openrouter_preview: string | null; openrouter_model: string | null;
  apify_configured: boolean; apify_preview: string | null;
}

/* ─────────────────────────────────────────────────────
   Generic key section component
   ───────────────────────────────────────────────────── */
function KeySection({
  title,
  description,
  fieldKey,
  preview,
  configured,
  required,
  placeholder,
  onSave,
  extraField,
}: {
  title: string;
  description: string | React.ReactNode;
  fieldKey: string;
  preview: string | null;
  configured: boolean;
  required?: boolean;
  placeholder?: string;
  onSave: (key: string, value: string) => Promise<void>;
  extraField?: React.ReactNode;
}) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (!value.trim()) return;
    setSaving(true);
    await onSave(fieldKey, value.trim());
    setValue('');
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="p-5 rounded-xl bg-surface flex flex-col gap-3"
      style={{ border: '1px solid var(--mist)', boxShadow: 'var(--shadow-xs)' }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-ink" style={{ fontFamily: 'var(--font-display)' }}>{title}</h2>
            {required && <span className="pill pill-failed text-xs">required</span>}
          </div>
          <p className="text-xs text-ink-muted mt-0.5 max-w-md leading-relaxed">{description}</p>
        </div>
        <span className={`pill flex-shrink-0 ml-4 ${configured ? 'pill-ready' : 'pill-not-set'}`}>
          {configured ? '✓ Active' : 'Not set'}
        </span>
      </div>

      {configured && preview && (
        <code className="text-xs text-ink-subtle bg-canvas px-3 py-1.5 rounded-lg font-mono self-start">
          {preview}
        </code>
      )}

      {extraField}

      <div className="flex gap-2">
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder || (configured ? 'Enter new key to update…' : 'Paste your API key…')}
          className="flex-1 px-3 py-2 text-sm rounded-lg bg-canvas text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 border"
          style={{ borderColor: 'var(--mist-strong)', '--tw-ring-color': 'var(--accent)' } as React.CSSProperties}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          aria-label={`${title} API key`}
        />
        <button
          onClick={handleSave}
          disabled={saving || !value.trim()}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50 flex-shrink-0"
          style={{ background: saved ? 'var(--success)' : 'var(--accent)' }}
        >
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   Model picker (for OpenRouter)
   ───────────────────────────────────────────────────── */
const OPENROUTER_MODELS = [
  { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet (Recommended)' },
  { value: 'anthropic/claude-opus-4', label: 'Claude Opus 4' },
  { value: 'openai/gpt-4o', label: 'GPT-4o' },
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini (Fast)' },
  { value: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash (Fast)' },
  { value: 'google/gemini-pro-1.5', label: 'Gemini 1.5 Pro' },
  { value: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
  { value: 'mistralai/mistral-large', label: 'Mistral Large' },
];

function ModelPicker({
  currentModel,
  onSave,
}: {
  currentModel: string | null;
  onSave: (key: string, value: string) => Promise<void>;
}) {
  const [model, setModel] = useState(currentModel || 'anthropic/claude-3.5-sonnet');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (currentModel) setModel(currentModel);
  }, [currentModel]);

  async function handleSave() {
    setSaving(true);
    await onSave('openrouter_model', model);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="flex gap-2 items-center">
      <select
        value={model}
        onChange={(e) => setModel(e.target.value)}
        className="flex-1 px-3 py-2 rounded-lg border text-sm text-ink bg-canvas focus:outline-none focus:ring-2"
        style={{ borderColor: 'var(--mist-strong)', '--tw-ring-color': 'var(--accent)' } as React.CSSProperties}
        aria-label="OpenRouter model"
      >
        {OPENROUTER_MODELS.map((m) => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>
      <button
        onClick={handleSave}
        disabled={saving}
        className="px-3 py-2 rounded-lg text-xs font-medium text-white flex-shrink-0 transition-all"
        style={{ background: saved ? 'var(--success)' : 'var(--ink-subtle)' }}
      >
        {saved ? '✓' : saving ? '…' : 'Set model'}
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   Provider priority badge
   ───────────────────────────────────────────────────── */
function ActiveProviderBadge({ status }: { status: KeyStatus }) {
  let label = 'None — add an API key below';
  let ok = false;

  if (status.anthropic_configured) { label = 'Anthropic Claude (claude-opus-4-5)'; ok = true; }
  else if (status.openai_configured) { label = 'OpenAI (gpt-4o)'; ok = true; }
  else if (status.gemini_configured) { label = 'Google Gemini (gemini-2.0-flash)'; ok = true; }
  else if (status.openrouter_configured) { label = `OpenRouter (${status.openrouter_model || 'claude-3.5-sonnet'})`; ok = true; }

  return (
    <div className="flex items-center gap-3 p-4 rounded-xl"
      style={{ background: ok ? 'hsl(152 60% 40% / 0.08)' : 'hsl(0 72% 55% / 0.08)', border: `1px solid ${ok ? 'hsl(152 60% 40% / 0.2)' : 'hsl(0 72% 55% / 0.2)'}` }}>
      <span className="text-xl">{ok ? '⚡' : '⚠️'}</span>
      <div>
        <p className="text-xs font-semibold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
          Active AI provider
        </p>
        <p className="text-xs mt-0.5" style={{ color: ok ? 'var(--success)' : 'var(--danger)' }}>
          {label}
        </p>
        {ok && (
          <p className="text-xs text-ink-subtle mt-0.5">
            Priority order: Anthropic → OpenAI → Gemini → OpenRouter
          </p>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   Settings page
   ───────────────────────────────────────────────────── */
export default function SettingsPage() {
  const [status, setStatus] = useState<KeyStatus>({
    anthropic_configured: false, anthropic_preview: null,
    openai_configured: false, openai_preview: null,
    gemini_configured: false, gemini_preview: null,
    openrouter_configured: false, openrouter_preview: null, openrouter_model: null,
    apify_configured: false, apify_preview: null,
  });
  const [loading, setLoading] = useState(true);

  async function fetchStatus() {
    const res = await fetch('/api/settings');
    if (res.ok) setStatus(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchStatus(); }, []);

  async function handleSave(key: string, value: string) {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    await fetchStatus();
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
            Settings
          </h1>
          <p className="text-sm text-ink-muted mt-1">Configure AI providers and scraping tools.</p>
        </div>

        <div className="flex flex-col gap-4">
          {loading ? (
            <div className="h-32 rounded-xl bg-mist animate-pulse" />
          ) : (
            <>
              {/* Active provider indicator */}
              <ActiveProviderBadge status={status} />

              {/* ── AI Providers ── */}
              <div className="pt-2">
                <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wider mb-3 px-1">
                  AI Providers — add at least one
                </p>
                <div className="flex flex-col gap-3">
                  <KeySection
                    title="Anthropic (Claude)"
                    description={<>Recommended. Highest quality drafts. Get your key at <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">console.anthropic.com</a>.</>}
                    fieldKey="anthropic_api_key"
                    preview={status.anthropic_preview}
                    configured={status.anthropic_configured}
                    onSave={handleSave}
                  />
                  <KeySection
                    title="OpenAI (ChatGPT — GPT-4o)"
                    description={<>Uses gpt-4o for drafts, gpt-4o-mini for summaries, Whisper for voice file transcription. Get your key at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">platform.openai.com</a>.</>}
                    fieldKey="openai_api_key"
                    preview={status.openai_preview}
                    configured={status.openai_configured}
                    onSave={handleSave}
                  />
                  <KeySection
                    title="Google Gemini"
                    description={<>Uses gemini-2.0-flash. Fast and cheap. Get your key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">aistudio.google.com</a>.</>}
                    fieldKey="gemini_api_key"
                    preview={status.gemini_preview}
                    configured={status.gemini_configured}
                    onSave={handleSave}
                  />
                  <KeySection
                    title="OpenRouter (any model)"
                    description={<>Access 200+ models through one key. Select which model below. Get your key at <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">openrouter.ai</a>.</>}
                    fieldKey="openrouter_api_key"
                    preview={status.openrouter_preview}
                    configured={status.openrouter_configured}
                    onSave={handleSave}
                    extraField={
                      <ModelPicker
                        currentModel={status.openrouter_model}
                        onSave={handleSave}
                      />
                    }
                  />
                </div>
              </div>

              {/* ── Scraping ── */}
              <div className="pt-2">
                <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wider mb-3 px-1">
                  Scraping (optional)
                </p>
                <KeySection
                  title="Apify"
                  description={<>Fallback scraper when Jina Reader fails on paywalled or login-gated content. Get your token at <a href="https://console.apify.com/account/integrations" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">apify.com</a>.</>}
                  fieldKey="apify_api_token"
                  preview={status.apify_preview}
                  configured={status.apify_configured}
                  onSave={handleSave}
                />
              </div>

              {/* ── Credentials note ── */}
              <div className="p-4 rounded-xl text-sm"
                style={{ background: 'var(--accent-dim)', border: '1px solid hsl(245 70% 62% / 0.2)' }}>
                <p className="font-semibold text-accent mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                  Login credentials
                </p>
                <p className="text-ink-muted text-xs leading-relaxed">
                  Set via environment variables{' '}
                  <code className="font-mono bg-surface px-1.5 py-0.5 rounded">APP_USERNAME</code> and{' '}
                  <code className="font-mono bg-surface px-1.5 py-0.5 rounded">APP_PASSWORD</code>.
                  Defaults: <code className="font-mono bg-surface px-1.5 py-0.5 rounded">cleraacc</code> /{' '}
                  <code className="font-mono bg-surface px-1.5 py-0.5 rounded">harshilcleraa</code>.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
