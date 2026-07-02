'use client';

import { useState } from 'react';
import type { DraftCard as DraftCardType, PipelinePlatform } from '@/types/database';

interface Props {
  draft: DraftCardType;
  onPushed?: () => void;
}

const CHAR_LIMITS: Record<PipelinePlatform, number> = {
  instagram: 2200,
  linkedin: 3000,
  both: 2200,
};

export default function DraftCard({ draft, onPushed }: Props) {
  const [pushed, setPushed] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const fullText = [draft.hook, draft.body, draft.hashtags?.join(' ')].filter(Boolean).join('\n\n');
  const charLimit = CHAR_LIMITS[draft.platform];
  const charCount = fullText.length;
  const isOverLimit = charCount > charLimit;

  async function handlePush() {
    if (pushing || pushed) return;
    setPushing(true);
    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: draft.platform,
          status: 'idea',
          content: draft.body,
          hashtags: draft.hashtags,
          source_ids: draft.source_ids,
          created_via: 'chat',
        }),
      });
      if (res.ok) {
        setPushed(true);
        onPushed?.();
      }
    } finally {
      setPushing(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3 bg-surface"
      style={{ border: '1px solid var(--mist)', boxShadow: 'var(--shadow-sm)' }}
    >
      {/* Platform badge + char count */}
      <div className="flex items-center justify-between">
        <span className={`pill text-xs font-medium ${draft.platform === 'instagram' ? 'badge-ig' : draft.platform === 'linkedin' ? 'badge-li' : 'badge-both'}`}>
          {draft.platform === 'instagram' ? 'Instagram' : draft.platform === 'linkedin' ? 'LinkedIn' : 'Both'}
        </span>
        <span className={`text-xs font-mono ${isOverLimit ? 'char-warn' : 'text-ink-subtle'}`}>
          {charCount.toLocaleString()} / {charLimit.toLocaleString()}
        </span>
      </div>

      {/* Content sections */}
      {draft.hook && (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-ink-subtle uppercase tracking-wider">Hook</span>
          <p className="text-sm text-ink font-medium leading-snug">{draft.hook}</p>
        </div>
      )}

      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium text-ink-subtle uppercase tracking-wider">Body</span>
        <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{draft.body}</p>
      </div>

      {draft.hashtags && draft.hashtags.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-ink-subtle uppercase tracking-wider">Hashtags</span>
          <p className="text-sm text-accent/80 leading-relaxed">{draft.hashtags.join(' ')}</p>
        </div>
      )}

      {draft.source_ids.length > 0 && (
        <p className="text-xs text-ink-subtle">
          Based on {draft.source_ids.length} source{draft.source_ids.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: 'var(--mist)' }}>
        <button
          id={`push-pipeline-${draft.id}`}
          onClick={handlePush}
          disabled={pushing || pushed}
          className="flex-1 py-1.5 rounded-lg text-xs font-medium text-white transition-all disabled:opacity-70"
          style={{ background: pushed ? 'var(--success)' : 'var(--accent)' }}
        >
          {pushed ? '✓ In Pipeline' : pushing ? 'Pushing…' : 'Push to Pipeline'}
        </button>

        <button
          id={`copy-draft-${draft.id}`}
          onClick={handleCopy}
          className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors text-ink-muted hover:text-ink hover:border-mist-strong"
          style={{ borderColor: 'var(--mist)' }}
          title="Copy to clipboard"
        >
          {copied ? '✓' : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <rect x="4" y="4" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M2.5 8H2a1 1 0 01-1-1V2a1 1 0 011-1h5a1 1 0 011 1v.5" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
          )}
        </button>

        <button
          id={`regenerate-${draft.id}`}
          onClick={() => setRegenerating(true)}
          disabled={regenerating}
          className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors text-ink-muted hover:text-ink hover:border-mist-strong"
          style={{ borderColor: 'var(--mist)' }}
          title="Regenerate"
          aria-label="Regenerate draft"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M1 6a5 5 0 005 5 5 5 0 004.9-4M11 6a5 5 0 00-5-5 5 5 0 00-4.9 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            <path d="M9 2v3h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
