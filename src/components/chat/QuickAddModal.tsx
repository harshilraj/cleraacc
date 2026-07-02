'use client';

import { useState } from 'react';
import type { PipelinePlatform, PipelineStatus } from '@/types/database';

interface Props {
  onClose: () => void;
  defaultStatus?: PipelineStatus;
}

export default function QuickAddModal({ onClose, defaultStatus = 'idea' }: Props) {
  const [platform, setPlatform] = useState<PipelinePlatform>('linkedin');
  const [status, setStatus] = useState<PipelineStatus>(defaultStatus);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!content.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, status, content: content.trim(), created_via: 'manual' }),
      });
      if (res.ok) {
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  const STATUSES: PipelineStatus[] = ['idea', 'drafted', 'review', 'scheduled', 'posted'];
  const PLATFORMS: { value: PipelinePlatform; label: string }[] = [
    { value: 'instagram', label: 'Instagram' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'both', label: 'Both' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'hsl(220 15% 12% / 0.4)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Quick add to pipeline"
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6 flex flex-col gap-4"
        style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--mist)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
            Quick add to pipeline
          </h2>
          <button onClick={onClose} className="text-ink-subtle hover:text-ink transition-colors p-1 rounded-lg" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div className="flex gap-3">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs font-medium text-ink-muted uppercase tracking-wider">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as PipelinePlatform)}
              className="px-3 py-2 rounded-lg border text-sm text-ink bg-canvas focus:outline-none focus:ring-2"
              style={{ borderColor: 'var(--mist-strong)', '--tw-ring-color': 'var(--accent)' } as React.CSSProperties}
            >
              {PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs font-medium text-ink-muted uppercase tracking-wider">Column</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PipelineStatus)}
              className="px-3 py-2 rounded-lg border text-sm text-ink bg-canvas focus:outline-none focus:ring-2 capitalize"
              style={{ borderColor: 'var(--mist-strong)', '--tw-ring-color': 'var(--accent)' } as React.CSSProperties}
            >
              {STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-ink-muted uppercase tracking-wider">Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste your content here…"
            rows={6}
            className="w-full px-3 py-2.5 rounded-lg border text-sm text-ink bg-canvas placeholder:text-ink-subtle focus:outline-none focus:ring-2 resize-none"
            style={{ borderColor: 'var(--mist-strong)', '--tw-ring-color': 'var(--accent)' } as React.CSSProperties}
            autoFocus
          />
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-ink-muted hover:text-ink border hover:bg-mist transition-colors"
            style={{ borderColor: 'var(--mist)' }}
          >
            Cancel
          </button>
          <button
            id="quick-add-save-btn"
            onClick={handleSave}
            disabled={saving || !content.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            {saving ? 'Adding…' : 'Add to pipeline'}
          </button>
        </div>
      </div>
    </div>
  );
}
