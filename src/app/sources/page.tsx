'use client';

import { useState, useEffect, useCallback, useRef, DragEvent } from 'react';
import AppShell from '@/components/layout/AppShell';
import type { Source, SourceKind, SourcePlatform } from '@/types/database';

const TABS = [
  { key: 'competitor_link', label: 'Competitor links', isLink: true,  allowFile: true  },
  { key: 'inspired_link',   label: 'Inspired links',   isLink: true,  allowFile: true  },
  { key: 'knowledge_base',  label: 'Knowledge base',   isLink: false, allowFile: true  },
  { key: 'voice_sample',    label: 'My voice',          isLink: false, allowFile: true  },
  { key: 'instruction',     label: 'Instructions',      isLink: false, allowFile: false },
] as const;

type TabKey = typeof TABS[number]['key'];

const STATUS_PILL: Record<string, string> = {
  pending: 'pill-pending',
  ready:   'pill-ready',
  failed:  'pill-failed',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Extracting…',
  ready:   'Ready',
  failed:  'Failed',
};

const ACCEPT_TEXT = '.txt,.md,.csv,.json,.html,.xml';
const ACCEPT_AUDIO = '.mp3,.wav,.m4a,.ogg,.webm,.flac';
const ACCEPT_ALL = `${ACCEPT_TEXT},.pdf,${ACCEPT_AUDIO}`;

/* ─────────────────────────────────────────────────────
   File drop zone component
   ───────────────────────────────────────────────────── */
function FileDropZone({
  onFile,
  accept,
  compact,
}: {
  onFile: (file: File) => void;
  accept: string;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }

  return (
    <div
      className="relative rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
      style={{
        padding: compact ? '12px 16px' : '20px 16px',
        border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--mist-strong)'}`,
        background: dragging ? 'var(--accent-dim)' : 'var(--canvas)',
      }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-label="Drop file or click to upload"
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ color: 'var(--ink-subtle)' }}>
        <path d="M10 2v10m0-10L7 5m3-3l3 3M4 14v2a2 2 0 002 2h8a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <p className="text-xs text-ink-muted text-center">
        {compact ? (
          <>Drop file or <span className="text-accent font-medium">browse</span></>
        ) : (
          <><span className="text-accent font-medium">Click to upload</span> or drag & drop</>
        )}
      </p>
      {!compact && (
        <p className="text-xs text-ink-subtle">
          PDF · TXT · MD · CSV · MP3 · WAV · M4A · FLAC and more
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   Upload progress/result banner
   ───────────────────────────────────────────────────── */
function UploadBanner({
  state,
  filename,
  error,
  chars,
}: {
  state: 'uploading' | 'success' | 'error';
  filename?: string;
  error?: string;
  chars?: number;
}) {
  if (state === 'uploading') {
    return (
      <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-xs text-ink-muted bg-mist">
        <span className="inline-block w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />
        Extracting text from <strong>{filename}</strong>…
      </div>
    );
  }
  if (state === 'success') {
    return (
      <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-xs text-success"
        style={{ background: 'hsl(152 60% 40% / 0.1)', border: '1px solid hsl(152 60% 40% / 0.2)' }}>
        ✓ Extracted {chars?.toLocaleString()} characters from <strong>{filename}</strong>
      </div>
    );
  }
  return (
    <div className="rounded-xl px-4 py-3 text-xs text-danger"
      style={{ background: 'hsl(0 72% 55% / 0.1)', border: '1px solid hsl(0 72% 55% / 0.2)' }}>
      <strong>Upload failed:</strong> {error}
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   Source card
   ───────────────────────────────────────────────────── */
function SourceCard({ source, onDelete, onReExtract, onTextSave }: {
  source: Source;
  onDelete: (id: string) => void;
  onReExtract: (id: string) => void;
  onTextSave: (id: string, text: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editText, setEditText] = useState(source.raw_text || '');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const isLink = source.kind === 'competitor_link' || source.kind === 'inspired_link';

  async function handleSave() {
    setSaving(true);
    await onTextSave(source.id, editText);
    setSaving(false);
    setEditing(false);
  }

  const charCount = source.raw_text?.length || 0;

  return (
    <div className="rounded-xl p-4 bg-surface flex flex-col gap-2"
      style={{ border: '1px solid var(--mist)', boxShadow: 'var(--shadow-xs)' }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {source.url ? (
            <a href={source.url} target="_blank" rel="noopener noreferrer"
              className="text-sm font-medium text-accent truncate block hover:underline">
              {source.url}
            </a>
          ) : (
            <p className="text-sm text-ink font-medium line-clamp-1">
              {source.raw_text?.slice(0, 80) || '(empty)'}…
            </p>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`pill ${STATUS_PILL[source.status]}`}>{STATUS_LABELS[source.status]}</span>
            {charCount > 0 && <span className="text-xs text-ink-subtle">{charCount.toLocaleString()} chars</span>}
            {source.extraction_method && <span className="text-xs text-ink-subtle">via {source.extraction_method}</span>}
            <span className="text-xs text-ink-subtle">{new Date(source.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {source.status !== 'pending' && (
            <button onClick={() => setExpanded((v) => !v)}
              className="px-2 py-1 rounded-lg text-xs text-ink-muted hover:text-ink hover:bg-mist transition-colors"
              aria-label={expanded ? 'Collapse' : 'Expand'}>
              {expanded ? '▲' : '▼'}
            </button>
          )}
          {isLink && (
            <button onClick={() => onReExtract(source.id)}
              className="px-2 py-1 rounded-lg text-xs text-ink-muted hover:text-ink hover:bg-mist transition-colors"
              aria-label="Re-extract" title="Re-extract">↻</button>
          )}
          <button onClick={() => onDelete(source.id)}
            className="px-2 py-1 rounded-lg text-xs text-danger/70 hover:text-danger hover:bg-danger/10 transition-colors"
            aria-label="Delete">✕</button>
        </div>
      </div>

      {source.status === 'failed' && source.error_message && (
        <div className="rounded-lg px-3 py-2 text-xs"
          style={{ background: 'hsl(0 72% 55% / 0.08)', border: '1px solid hsl(0 72% 55% / 0.2)', color: 'var(--danger)' }}>
          <strong>Extraction failed:</strong> {source.error_message}
          <p className="mt-1 text-ink-muted">Expand to paste content manually or upload a file.</p>
        </div>
      )}

      {expanded && (
        <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: 'var(--mist)' }}>
          {source.summary && !editing && (
            <div className="text-xs text-ink-subtle bg-canvas rounded-lg px-3 py-2">
              <strong className="text-ink-muted">Summary:</strong> {source.summary}
            </div>
          )}
          {editing ? (
            <>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 rounded-lg border text-xs text-ink bg-canvas resize-y focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--mist-strong)', '--tw-ring-color': 'var(--accent)' } as React.CSSProperties}
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs text-ink-muted border rounded-lg" style={{ borderColor: 'var(--mist)' }}>Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 text-xs text-white rounded-lg" style={{ background: 'var(--accent)' }}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-ink whitespace-pre-wrap bg-canvas rounded-lg px-3 py-2 max-h-48 overflow-y-auto leading-relaxed">
                {source.raw_text || '(no content yet)'}
              </p>
              <button onClick={() => { setEditText(source.raw_text || ''); setEditing(true); }}
                className="self-start text-xs text-ink-muted hover:text-accent transition-colors px-1">
                Edit / paste content
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   Sources page
   ───────────────────────────────────────────────────── */
export default function SourcesPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('competitor_link');
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);

  // Link form
  const [url, setUrl] = useState('');
  const [platform, setPlatform] = useState<SourcePlatform>('both');
  const [adding, setAdding] = useState(false);

  // Text form
  const [textContent, setTextContent] = useState('');

  // Input mode: 'text' | 'file'
  const [inputMode, setInputMode] = useState<'text' | 'file'>('text');

  // Upload state
  const [uploadState, setUploadState] = useState<null | { state: 'uploading' | 'success' | 'error'; filename?: string; error?: string; chars?: number }>(null);

  // Polling
  const [polling, setPolling] = useState(false);

  const currentTab = TABS.find((t) => t.key === activeTab)!;
  const tabSources = sources.filter((s) => s.kind === activeTab);

  const loadSources = useCallback(async () => {
    const res = await fetch('/api/sources');
    if (res.ok) {
      const { sources: data } = await res.json();
      setSources(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadSources(); }, [loadSources]);

  // Auto-poll while any source is pending
  useEffect(() => {
    const hasPending = sources.some((s) => s.status === 'pending');
    if (hasPending && !polling) {
      setPolling(true);
      const interval = setInterval(async () => {
        const res = await fetch('/api/sources');
        if (res.ok) {
          const { sources: data } = await res.json();
          setSources(data);
          if (!data.some((s: Source) => s.status === 'pending')) {
            clearInterval(interval);
            setPolling(false);
          }
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [sources, polling]);

  // Reset upload state when tab changes
  useEffect(() => {
    setUploadState(null);
    setInputMode('text');
    setUrl('');
    setTextContent('');
  }, [activeTab]);

  async function handleAddLink() {
    if (!url.trim() || adding) return;
    setAdding(true);
    await fetch('/api/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: activeTab as SourceKind, platform, url: url.trim() }),
    });
    setUrl('');
    setAdding(false);
    loadSources();
  }

  async function handleAddText() {
    if (!textContent.trim() || adding) return;
    setAdding(true);
    await fetch('/api/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: activeTab as SourceKind, platform: 'n/a', raw_text: textContent.trim() }),
    });
    setTextContent('');
    setAdding(false);
    loadSources();
  }

  async function handleFileUpload(file: File) {
    setUploadState({ state: 'uploading', filename: file.name });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('kind', activeTab);
    formData.append('platform', 'n/a');
    formData.append('summarize', 'true');

    try {
      const res = await fetch('/api/sources/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        setUploadState({ state: 'success', filename: file.name, chars: data.chars });
        await loadSources();
        setTimeout(() => setUploadState(null), 4000);
      } else {
        setUploadState({ state: 'error', filename: file.name, error: data.error });
      }
    } catch {
      setUploadState({ state: 'error', filename: file.name, error: 'Network error — please try again.' });
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/sources?id=${id}`, { method: 'DELETE' });
    loadSources();
  }

  async function handleReExtract(id: string) {
    await fetch('/api/sources/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId: id }),
    });
    setSources((prev) => prev.map((s) => s.id === id ? { ...s, status: 'pending' } : s));
  }

  async function handleTextSave(id: string, text: string) {
    await fetch('/api/sources', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, raw_text: text }),
    });
    loadSources();
  }

  const PLATFORM_OPTIONS: { value: SourcePlatform; label: string }[] = [
    { value: 'both', label: 'Both' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'linkedin', label: 'LinkedIn' },
  ];

  const totalReady = sources.filter((s) => s.status === 'ready').length;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-ink" style={{ fontFamily: 'var(--font-display)' }}>Sources</h1>
            <p className="text-sm text-ink-muted mt-1">
              {totalReady} ready source{totalReady !== 1 ? 's' : ''} available for generation
              {polling && <span className="ml-2 text-warning text-xs animate-pulse">● syncing…</span>}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mb-5 border-b overflow-x-auto" style={{ borderColor: 'var(--mist)' }}>
          {TABS.map((tab) => {
            const count = sources.filter((s) => s.kind === tab.key).length;
            return (
              <button
                key={tab.key}
                id={`tab-${tab.key}`}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px`}
                style={{
                  borderColor: activeTab === tab.key ? 'var(--accent)' : 'transparent',
                  color: activeTab === tab.key ? 'var(--accent)' : 'var(--ink-muted)',
                }}
              >
                {tab.label}
                {count > 0 && <span className="ml-1.5 opacity-60">({count})</span>}
              </button>
            );
          })}
        </div>

        {/* Add form */}
        <div className="rounded-xl p-4 mb-4 bg-surface flex flex-col gap-3"
          style={{ border: '1px solid var(--mist)', boxShadow: 'var(--shadow-xs)' }}>

          {currentTab.isLink ? (
            /* URL input + optional file upload for link tabs */
            <div className="flex flex-col gap-3">
              {/* Tab switcher for link tabs */}
              <div className="flex gap-1 p-1 rounded-lg bg-canvas w-fit" style={{ border: '1px solid var(--mist)' }}>
                <button
                  onClick={() => setInputMode('text')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors`}
                  style={{ background: inputMode === 'text' ? 'var(--surface)' : 'transparent', color: inputMode === 'text' ? 'var(--accent)' : 'var(--ink-muted)', boxShadow: inputMode === 'text' ? 'var(--shadow-xs)' : 'none' }}
                >
                  🔗 URL
                </button>
                <button
                  onClick={() => setInputMode('file')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors`}
                  style={{ background: inputMode === 'file' ? 'var(--surface)' : 'transparent', color: inputMode === 'file' ? 'var(--accent)' : 'var(--ink-muted)', boxShadow: inputMode === 'file' ? 'var(--shadow-xs)' : 'none' }}
                >
                  📎 File
                </button>
              </div>

              {inputMode === 'text' ? (
                <div className="flex gap-2">
                  <input
                    id={`url-input-${activeTab}`}
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.instagram.com/p/… or LinkedIn post URL"
                    className="flex-1 px-3 py-2 rounded-lg border text-sm text-ink bg-canvas placeholder:text-ink-subtle focus:outline-none focus:ring-2"
                    style={{ borderColor: 'var(--mist-strong)', '--tw-ring-color': 'var(--accent)' } as React.CSSProperties}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
                  />
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as SourcePlatform)}
                    className="px-3 py-2 rounded-lg border text-sm text-ink bg-canvas focus:outline-none"
                    style={{ borderColor: 'var(--mist-strong)' }}
                    aria-label="Platform"
                  >
                    {PLATFORM_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                  <button
                    id={`add-source-btn-${activeTab}`}
                    onClick={handleAddLink}
                    disabled={adding || !url.trim()}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50"
                    style={{ background: 'var(--accent)' }}
                  >
                    {adding ? 'Adding…' : 'Add'}
                  </button>
                </div>
              ) : (
                <FileDropZone onFile={handleFileUpload} accept={ACCEPT_ALL} />
              )}
            </div>
          ) : (
            /* Text/file tabs (knowledge_base, voice_sample, instruction) */
            <div className="flex flex-col gap-3">
              {currentTab.allowFile && (
                <div className="flex gap-1 p-1 rounded-lg bg-canvas w-fit" style={{ border: '1px solid var(--mist)' }}>
                  <button
                    onClick={() => setInputMode('text')}
                    className="px-3 py-1 rounded-md text-xs font-medium transition-colors"
                    style={{ background: inputMode === 'text' ? 'var(--surface)' : 'transparent', color: inputMode === 'text' ? 'var(--accent)' : 'var(--ink-muted)', boxShadow: inputMode === 'text' ? 'var(--shadow-xs)' : 'none' }}
                  >
                    ✏️ Paste text
                  </button>
                  <button
                    onClick={() => setInputMode('file')}
                    className="px-3 py-1 rounded-md text-xs font-medium transition-colors"
                    style={{ background: inputMode === 'file' ? 'var(--surface)' : 'transparent', color: inputMode === 'file' ? 'var(--accent)' : 'var(--ink-muted)', boxShadow: inputMode === 'file' ? 'var(--shadow-xs)' : 'none' }}
                  >
                    📎 Upload file
                  </button>
                </div>
              )}

              {inputMode === 'file' && currentTab.allowFile ? (
                <div className="flex flex-col gap-2">
                  <FileDropZone onFile={handleFileUpload} accept={ACCEPT_ALL} />
                  <p className="text-xs text-ink-subtle px-1">
                    PDF, TXT, MD, CSV, MP3, WAV, M4A, FLAC, OGG, WEBM (max 25 MB)
                    {activeTab === 'voice_sample' && ' · Audio files are transcribed via OpenAI Whisper (requires OpenAI key in Settings)'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <textarea
                    id={`text-input-${activeTab}`}
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder={
                      activeTab === 'knowledge_base' ? 'Paste general context, facts, or notes about your business…'
                      : activeTab === 'voice_sample' ? 'Paste a sample of your own writing or past captions…'
                      : 'Paste a writing rule or instruction…'
                    }
                    rows={4}
                    className="w-full px-3 py-2.5 rounded-lg border text-sm text-ink bg-canvas placeholder:text-ink-subtle focus:outline-none focus:ring-2 resize-none"
                    style={{ borderColor: 'var(--mist-strong)', '--tw-ring-color': 'var(--accent)' } as React.CSSProperties}
                  />
                  <div className="flex justify-end">
                    <button
                      id={`add-text-btn-${activeTab}`}
                      onClick={handleAddText}
                      disabled={adding || !textContent.trim()}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50"
                      style={{ background: 'var(--accent)' }}
                    >
                      {adding ? 'Adding…' : 'Add'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Upload feedback */}
          {uploadState && (
            <UploadBanner
              state={uploadState.state}
              filename={uploadState.filename}
              error={uploadState.error}
              chars={uploadState.chars}
            />
          )}
        </div>

        {/* Source list */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-mist animate-pulse" />)}
          </div>
        ) : tabSources.length === 0 ? (
          <div className="text-center py-12 text-ink-subtle text-sm">
            No {currentTab.label.toLowerCase()} yet — add your first one above.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {tabSources.map((source) => (
              <SourceCard
                key={source.id}
                source={source}
                onDelete={handleDelete}
                onReExtract={handleReExtract}
                onTextSave={handleTextSave}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
