'use client';

import { useState, useEffect, useRef } from 'react';
import AppShell from '@/components/layout/AppShell';
import DraftCard from '@/components/chat/DraftCard';
import QuickAddModal from '@/components/chat/QuickAddModal';
import type { ChatMessage, DraftCard as DraftCardType, PipelinePlatform } from '@/types/database';

interface MessageDisplay {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  drafts?: DraftCardType[];
  created_at: string;
}

interface SourceCounts {
  competitor_link: number;
  inspired_link: number;
  knowledge_base: number;
  voice_sample: number;
}

export default function WorkspacePage() {
  const [messages, setMessages] = useState<MessageDisplay[]>([]);
  const [input, setInput] = useState('');
  const [platform, setPlatform] = useState<PipelinePlatform>('linkedin');
  const [loading, setLoading] = useState(false);
  const [sourceCounts, setSourceCounts] = useState<SourceCounts>({ competitor_link: 0, inspired_link: 0, knowledge_base: 0, voice_sample: 0 });
  const [recentCards, setRecentCards] = useState<{ id: string; content: string; status: string; platform: string }[]>([]);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHistory();
    loadSourceCounts();
    loadRecentCards();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadHistory() {
    const res = await fetch('/api/chat');
    if (!res.ok) return;
    const { messages: msgs } = await res.json() as { messages: ChatMessage[] };

    const displayed: MessageDisplay[] = msgs.map((m) => {
      if (m.role === 'assistant') {
        try {
          const parsed = JSON.parse(m.content);
          return { id: m.id, role: 'assistant', content: '', drafts: parsed.drafts, created_at: m.created_at };
        } catch { /* fall through */ }
      }
      return { id: m.id, role: m.role, content: m.content, created_at: m.created_at };
    });
    setMessages(displayed);
  }

  async function loadSourceCounts() {
    const res = await fetch('/api/sources');
    if (!res.ok) return;
    const { sources } = await res.json();
    const counts: SourceCounts = { competitor_link: 0, inspired_link: 0, knowledge_base: 0, voice_sample: 0 };
    for (const s of sources) {
      if (s.kind in counts && s.status === 'ready') counts[s.kind as keyof SourceCounts]++;
    }
    setSourceCounts(counts);
  }

  async function loadRecentCards() {
    const res = await fetch('/api/pipeline');
    if (!res.ok) return;
    const { cards } = await res.json();
    setRecentCards((cards as typeof recentCards).slice(0, 5));
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    setError('');

    const userMsg: MessageDisplay = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    const query = input.trim();
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: query, platform }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Generation failed');
        setLoading(false);
        return;
      }

      const assistantMsg: MessageDisplay = {
        id: Date.now().toString() + '-a',
        role: 'assistant',
        content: '',
        drafts: data.drafts,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      await loadRecentCards();
    } catch {
      setError('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  }

  const PLATFORM_OPTIONS: { value: PipelinePlatform; label: string }[] = [
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'both', label: 'Both' },
  ];

  return (
    <AppShell>
      <div className="flex h-full" style={{ height: 'calc(100vh - var(--nav-h))' }}>
        {/* Chat panel */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-dim)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5h-2v-2h2v2zm0-4h-2c0-3.25 3-3 3-5 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 2.5-3 2.75-3 5z" fill="var(--accent)" fillOpacity=".3"/>
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-ink text-sm" style={{ fontFamily: 'var(--font-display)' }}>
                    Start writing
                  </p>
                  <p className="text-xs text-ink-subtle mt-1 max-w-xs">
                    Ask for content — e.g. &ldquo;3 LinkedIn posts about why most automation agencies fail to retain clients.&rdquo;
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`msg-in flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'user' ? (
                  <div
                    className="max-w-lg px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm text-white"
                    style={{ background: 'var(--accent)' }}
                  >
                    {msg.content}
                  </div>
                ) : msg.drafts ? (
                  <div className="flex flex-col gap-3 max-w-2xl w-full">
                    <p className="text-xs text-ink-subtle px-1">Generated {msg.drafts.length} draft{msg.drafts.length !== 1 ? 's' : ''}</p>
                    {msg.drafts.map((draft) => (
                      <DraftCard
                        key={draft.id}
                        draft={draft}
                        onPushed={loadRecentCards}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="max-w-lg px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm text-ink bg-surface"
                    style={{ border: '1px solid var(--mist)', boxShadow: 'var(--shadow-xs)' }}>
                    {msg.content}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex justify-start msg-in">
                <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-surface flex items-center gap-2"
                  style={{ border: '1px solid var(--mist)', boxShadow: 'var(--shadow-xs)' }}>
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-ink-subtle animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                  </span>
                  <span className="text-xs text-ink-subtle">Generating drafts…</span>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-danger/10 text-danger text-xs rounded-xl px-4 py-3 text-center">
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div
            className="border-t px-4 py-3 flex flex-col gap-2"
            style={{ borderColor: 'var(--mist)', background: 'var(--surface)' }}
          >
            <form onSubmit={handleSend} className="flex gap-2">
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as PipelinePlatform)}
                className="px-2 py-2 rounded-lg border text-xs font-medium bg-canvas text-ink-muted focus:outline-none flex-shrink-0"
                style={{ borderColor: 'var(--mist-strong)' }}
                aria-label="Target platform"
              >
                {PLATFORM_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <textarea
                id="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask for content… e.g. '3 LinkedIn posts about client retention in agencies'"
                className="flex-1 px-3 py-2 rounded-lg border text-sm text-ink bg-canvas placeholder:text-ink-subtle focus:outline-none focus:ring-2 resize-none"
                style={{ borderColor: 'var(--mist-strong)', '--tw-ring-color': 'var(--accent)', minHeight: '40px', maxHeight: '120px' } as React.CSSProperties}
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e as unknown as React.FormEvent);
                  }
                }}
              />
              <button
                id="chat-send-btn"
                type="submit"
                disabled={loading || !input.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white flex-shrink-0 transition-all disabled:opacity-50"
                style={{ background: 'var(--accent)' }}
              >
                Send
              </button>
            </form>
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-ink-subtle">Shift+Enter for newline</p>
              <button
                id="quick-add-btn"
                onClick={() => setShowQuickAdd(true)}
                className="flex items-center gap-1 text-xs text-ink-muted hover:text-accent transition-colors"
              >
                <span className="text-base leading-none">+</span>
                <span>Quick add to pipeline</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right rail */}
        <aside
          className="flex-shrink-0 flex flex-col border-l overflow-y-auto py-4 px-4 gap-6 hidden lg:flex"
          style={{ width: 'var(--rail-w)', borderColor: 'var(--mist)', background: 'var(--surface-alt)' }}
          aria-label="Sidebar"
        >
          {/* Sources available */}
          <div>
            <h2 className="text-xs font-semibold text-ink-subtle uppercase tracking-wider mb-3">
              Sources
            </h2>
            <div className="flex flex-col gap-1.5">
              {[
                { label: 'Competitor links', key: 'competitor_link' as const, color: 'hsl(325 70% 40%)' },
                { label: 'Inspired links', key: 'inspired_link' as const, color: 'hsl(210 70% 40%)' },
                { label: 'Knowledge base', key: 'knowledge_base' as const, color: 'hsl(245 60% 50%)' },
                { label: 'My voice', key: 'voice_sample' as const, color: 'hsl(152 60% 36%)' },
              ].map(({ label, key, color }) => (
                <div key={key} className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg"
                  style={{ background: 'var(--mist)' }}>
                  <span className="text-ink-muted">{label}</span>
                  <span className="font-semibold" style={{ color }}>{sourceCounts[key]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent pipeline activity */}
          <div>
            <h2 className="text-xs font-semibold text-ink-subtle uppercase tracking-wider mb-3">
              Recent pipeline
            </h2>
            {recentCards.length === 0 ? (
              <p className="text-xs text-ink-subtle">No cards yet</p>
            ) : (
              <div className="flex flex-col gap-2">
                {recentCards.map((card) => (
                  <div key={card.id} className="p-2.5 rounded-lg bg-surface text-xs"
                    style={{ border: '1px solid var(--mist)', boxShadow: 'var(--shadow-xs)' }}>
                    <p className="text-ink line-clamp-2">{card.content}</p>
                    <div className="flex gap-1 mt-1.5">
                      <span className={`pill ${card.platform === 'instagram' ? 'badge-ig' : card.platform === 'linkedin' ? 'badge-li' : 'badge-both'} text-xs`}>
                        {card.platform === 'instagram' ? 'IG' : card.platform === 'linkedin' ? 'LI' : 'Both'}
                      </span>
                      <span className="pill pill-pending text-xs">{card.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {showQuickAdd && <QuickAddModal onClose={() => { setShowQuickAdd(false); loadRecentCards(); }} />}
    </AppShell>
  );
}
