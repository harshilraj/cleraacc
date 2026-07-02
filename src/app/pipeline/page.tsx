'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AppShell from '@/components/layout/AppShell';
import QuickAddModal from '@/components/chat/QuickAddModal';
import type { PipelineCard, PipelineStatus, PipelinePlatform } from '@/types/database';

const COLUMNS: { status: PipelineStatus; label: string; color: string }[] = [
  { status: 'idea',      label: 'Idea',      color: 'var(--col-idea)' },
  { status: 'drafted',   label: 'Drafted',   color: 'var(--col-drafted)' },
  { status: 'review',    label: 'Review',    color: 'var(--col-review)' },
  { status: 'scheduled', label: 'Scheduled', color: 'var(--col-scheduled)' },
  { status: 'posted',    label: 'Posted',    color: 'var(--col-posted)' },
];

const CHAR_LIMITS: Record<PipelinePlatform, number> = {
  instagram: 2200,
  linkedin: 3000,
  both: 2200,
};

// ──────────────────────────────────────────────────────────
// Sortable Card
// ──────────────────────────────────────────────────────────
function KanbanCard({
  card,
  onUpdate,
  onDelete,
  isDragging = false,
}: {
  card: PipelineCard;
  onUpdate: (id: string, updates: Partial<PipelineCard>) => void;
  onDelete: (id: string) => void;
  isDragging?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(card.content);
  const [copied, setCopied] = useState(false);
  const [showSources, setShowSources] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: card.id });
  const charLimit = CHAR_LIMITS[card.platform];
  const isOver = content.length > charLimit;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  async function handleSave() {
    onUpdate(card.id, { content });
    setEditing(false);
  }

  async function handleCopy() {
    const text = [content, card.hashtags?.join(' ')].filter(Boolean).join('\n\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl p-3 bg-surface flex flex-col gap-2 cursor-grab active:cursor-grabbing ${isDragging ? 'card-dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className={`pill text-xs ${card.platform === 'instagram' ? 'badge-ig' : card.platform === 'linkedin' ? 'badge-li' : 'badge-both'}`}>
          {card.platform === 'instagram' ? 'IG' : card.platform === 'linkedin' ? 'LI' : 'Both'}
        </span>
        <span className={`text-xs font-mono ${isOver ? 'char-warn' : 'text-ink-subtle'}`}>
          {content.length}/{charLimit}
        </span>
      </div>

      {/* Content */}
      {editing ? (
        <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            autoFocus
            className="w-full text-xs text-ink bg-canvas px-2 py-1.5 rounded-lg border resize-none focus:outline-none focus:ring-2"
            style={{ borderColor: 'var(--mist-strong)', '--tw-ring-color': 'var(--accent)' } as React.CSSProperties}
            onPointerDown={(e) => e.stopPropagation()}
          />
          <div className="flex gap-1">
            <button onClick={handleSave} className="text-xs px-2 py-1 text-white rounded-md" style={{ background: 'var(--accent)' }}>Save</button>
            <button onClick={() => { setContent(card.content); setEditing(false); }} className="text-xs px-2 py-1 text-ink-muted rounded-md bg-mist">Cancel</button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-ink leading-relaxed line-clamp-4">{content}</p>
      )}

      {card.hashtags && card.hashtags.length > 0 && !editing && (
        <p className="text-xs text-accent/70 line-clamp-1">{card.hashtags.slice(0, 5).join(' ')}</p>
      )}

      {card.created_via === 'chat' && card.source_ids && card.source_ids.length > 0 && (
        <button
          className="text-left text-xs text-ink-subtle hover:text-accent transition-colors"
          onClick={(e) => { e.stopPropagation(); setShowSources(!showSources); }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          Based on {card.source_ids.length} source{card.source_ids.length !== 1 ? 's' : ''} {showSources ? '▲' : '▼'}
        </button>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 border-t pt-2" style={{ borderColor: 'var(--mist)' }}>
        <button
          id={`edit-card-${card.id}`}
          onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex-1 text-xs text-ink-muted hover:text-ink py-1 rounded-md hover:bg-mist transition-colors"
          aria-label="Edit card"
        >
          Edit
        </button>
        <select
          value={card.status}
          onChange={(e) => {
            e.stopPropagation();
            onUpdate(card.id, { status: e.target.value as PipelineStatus });
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="text-xs bg-canvas border rounded px-1.5 py-0.5 text-ink-muted hover:text-ink focus:outline-none cursor-pointer max-w-[80px]"
          style={{ borderColor: 'var(--mist-strong)' }}
          aria-label="Move card stage"
        >
          {COLUMNS.map((col) => (
            <option key={col.status} value={col.status}>
              {col.label}
            </option>
          ))}
        </select>
        <button
          id={`copy-card-${card.id}`}
          onClick={(e) => { e.stopPropagation(); handleCopy(); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="px-2 py-1 text-xs text-ink-muted hover:text-ink rounded-md hover:bg-mist transition-colors"
          aria-label="Copy to clipboard"
        >
          {copied ? '✓' : (
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.1"/><path d="M2 7H1.5a1 1 0 01-1-1V1.5a1 1 0 011-1H6a1 1 0 011 1V2" stroke="currentColor" strokeWidth="1.1"/></svg>
          )}
        </button>
        <button
          id={`delete-card-${card.id}`}
          onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="px-2 py-1 text-xs text-danger/60 hover:text-danger rounded-md hover:bg-danger/10 transition-colors"
          aria-label="Delete card"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Droppable Column Wrapper
// ──────────────────────────────────────────────────────────
function DroppableColumn({
  col,
  children,
}: {
  col: { status: PipelineStatus; label: string; color: string };
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id: col.status });

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col gap-2 rounded-xl p-3"
      style={{
        width: '260px',
        minHeight: '200px',
        background: col.color,
        border: '1px solid var(--mist)',
        flexShrink: 0,
      }}
      id={`col-${col.status}`}
    >
      {children}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Pipeline page
// ──────────────────────────────────────────────────────────
export default function PipelinePage() {
  const [cards, setCards] = useState<PipelineCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filterPlatform, setFilterPlatform] = useState<string>('');
  const [filterSearch, setFilterSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState<PipelineStatus | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function loadCards() {
    const params = new URLSearchParams();
    if (filterPlatform) params.set('platform', filterPlatform);
    if (filterSearch) params.set('search', filterSearch);
    const res = await fetch(`/api/pipeline?${params}`);
    if (res.ok) {
      const { cards: data } = await res.json();
      setCards(data);
    }
    setLoading(false);
  }

  useEffect(() => { loadCards(); }, [filterPlatform, filterSearch]); // eslint-disable-line

  function getCardsForColumn(status: PipelineStatus) {
    return cards.filter((c) => c.status === status).sort((a, b) => a.position - b.position);
  }

  async function handleUpdate(id: string, updates: Partial<PipelineCard>) {
    const originalCards = [...cards];
    
    // Apply optimistic updates locally
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );

    try {
      const res = await fetch(`/api/pipeline/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        throw new Error('Update failed');
      }
    } catch (err) {
      // Revert on failure
      setCards(originalCards);
      alert('Failed to update card. Reverting changes.');
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/pipeline/${id}`, { method: 'DELETE' });
    setCards((prev) => prev.filter((c) => c.id !== id));
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const activeCard = cards.find((c) => c.id === active.id);
    if (!activeCard) return;

    // Determine target column: over might be a column droppable or another card
    const overCard = cards.find((c) => c.id === over.id);
    const overColumn = overCard?.status || (COLUMNS.find((col) => col.status === over.id)?.status);

    if (!overColumn) return;

    // Build updated positions
    const updatedCards = cards.map((c) => {
      if (c.id === active.id) return { ...c, status: overColumn as PipelineStatus };
      return c;
    });

    // Re-sort and assign positions within each column
    const allUpdates: Array<{ id: string; status: string; position: number }> = [];
    for (const col of COLUMNS) {
      const colCards = updatedCards
        .filter((c) => c.status === col.status)
        .sort((a, b) => {
          if (a.id === active.id) return -1;
          if (b.id === active.id) return 1;
          return a.position - b.position;
        });

      colCards.forEach((card, idx) => {
        allUpdates.push({ id: card.id, status: col.status, position: idx });
      });
    }

    const originalCards = [...cards];

    // Optimistic update
    setCards(updatedCards.map((c) => {
      const u = allUpdates.find((u) => u.id === c.id);
      return u ? { ...c, status: u.status as PipelineStatus, position: u.position } : c;
    }));

    // Persist
    try {
      const res = await fetch('/api/pipeline/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: allUpdates }),
      });
      if (!res.ok) {
        throw new Error('Reorder failed');
      }
    } catch (err) {
      setCards(originalCards);
      alert('Failed to save card positions. Reverting changes.');
    }
  }

  async function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeCard = cards.find((c) => c.id === active.id);
    const overCard = cards.find((c) => c.id === over.id);
    const overColumn = COLUMNS.find((col) => col.status === over.id);

    if (!activeCard) return;

    const targetStatus = overCard?.status || overColumn?.status;
    if (!targetStatus || activeCard.status === targetStatus) return;

    // Optimistic column change
    setCards((prev) =>
      prev.map((c) => c.id === active.id ? { ...c, status: targetStatus } : c)
    );
  }

  const activeCard = cards.find((c) => c.id === activeId);

  return (
    <AppShell>
      <div className="flex flex-col h-full" style={{ height: 'calc(100vh - var(--nav-h))' }}>
        {/* Filter bar */}
        <div
          className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: 'var(--mist)', background: 'var(--surface)' }}
        >
          <h1 className="text-sm font-semibold text-ink mr-2" style={{ fontFamily: 'var(--font-display)' }}>
            Pipeline
          </h1>
          <input
            id="pipeline-search"
            type="search"
            placeholder="Search cards…"
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="px-3 py-1.5 rounded-lg border text-sm text-ink bg-canvas placeholder:text-ink-subtle focus:outline-none focus:ring-2 w-48"
            style={{ borderColor: 'var(--mist-strong)', '--tw-ring-color': 'var(--accent)' } as React.CSSProperties}
          />
          <select
            id="pipeline-filter-platform"
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className="px-3 py-1.5 rounded-lg border text-sm text-ink bg-canvas focus:outline-none"
            style={{ borderColor: 'var(--mist-strong)' }}
            aria-label="Filter by platform"
          >
            <option value="">All platforms</option>
            <option value="instagram">Instagram</option>
            <option value="linkedin">LinkedIn</option>
            <option value="both">Both</option>
          </select>
          <span className="text-xs text-ink-subtle ml-auto">{cards.length} card{cards.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Kanban board */}
        <div className="flex-1 overflow-x-auto p-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-3 h-full" style={{ minWidth: 'max-content' }}>
              {COLUMNS.map((col) => {
                const colCards = getCardsForColumn(col.status);
                return (
                  <DroppableColumn key={col.status} col={col}>
                    {/* Column header */}
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
                          {col.label}
                        </span>
                        <span className="text-xs text-ink-subtle bg-surface px-1.5 py-0.5 rounded-full">
                          {colCards.length}
                        </span>
                      </div>
                      <button
                        id={`add-card-${col.status}`}
                        onClick={() => setShowAddModal(col.status)}
                        className="w-6 h-6 rounded-md flex items-center justify-center text-ink-muted hover:text-accent hover:bg-surface transition-colors text-base leading-none"
                        aria-label={`Add card to ${col.label}`}
                        title={`Add to ${col.label}`}
                      >
                        +
                      </button>
                    </div>

                    {/* Cards */}
                    <SortableContext
                      items={colCards.map((c) => c.id)}
                      strategy={verticalListSortingStrategy}
                      id={col.status}
                    >
                      <div className="flex flex-col gap-2 flex-1">
                        {loading ? (
                          <div className="h-16 rounded-xl bg-surface/60 animate-pulse" />
                        ) : colCards.length === 0 ? (
                          <div
                            className="flex-1 rounded-xl border-2 border-dashed flex items-center justify-center text-xs text-ink-subtle"
                            style={{ borderColor: 'var(--mist-strong)', minHeight: '60px' }}
                            id={col.status}
                          >
                            Drop here
                          </div>
                        ) : (
                          colCards.map((card) => (
                            <KanbanCard
                              key={card.id}
                              card={card}
                              onUpdate={handleUpdate}
                              onDelete={handleDelete}
                              isDragging={activeId === card.id}
                            />
                          ))
                        )}
                      </div>
                    </SortableContext>
                  </DroppableColumn>
                );
              })}
            </div>

            {/* Drag overlay */}
            <DragOverlay>
              {activeCard && (
                <div className="rounded-xl p-3 bg-surface card-dragging w-64"
                  style={{ border: '1px solid var(--mist)', boxShadow: 'var(--shadow-lg)' }}>
                  <p className="text-xs text-ink line-clamp-3">{activeCard.content}</p>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {showAddModal && (
        <QuickAddModal
          onClose={() => { setShowAddModal(null); loadCards(); }}
          defaultStatus={showAddModal}
        />
      )}
    </AppShell>
  );
}
