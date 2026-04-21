"use client";

import React, { useState } from 'react';
import {
  ChatTeardropText,
  Lightbulb,
  Target,
  Note as NoteIcon,
  Plus,
  Trash,
  Link as LinkIcon,
  CircleNotch,
  Quotes,
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Annotation } from '@/services/annotate.service';
import { KnowledgeDocument } from '@/services/knowledge.service';
import { format } from 'date-fns';

interface AnnotateTerminalProps {
  annotations: Annotation[];
  documents: KnowledgeDocument[];
  loading: boolean;
  onCreate: (data: { content: string; category: string; documentId?: string | null }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const CATEGORIES = [
  { id: 'reflection', label: 'Reflection', icon: ChatTeardropText, color: 'var(--modules-aly)'    },
  { id: 'insight',    label: 'Insight',    icon: Lightbulb,        color: 'var(--status-warning)'  },
  { id: 'objective',  label: 'Objective',  icon: Target,           color: 'var(--modules-track)'   },
  { id: 'note',       label: 'Note',       icon: NoteIcon,         color: 'var(--text-tertiary)'   },
];

const inputCls = "w-full bg-background-tertiary border border-border-primary rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-modules-aly/40 placeholder:text-text-tertiary transition-colors";

export const AnnotateTerminal: React.FC<AnnotateTerminalProps> = ({
  annotations, documents, loading, onCreate, onDelete,
}) => {
  const [content,    setContent]    = useState('');
  const [category,   setCategory]   = useState('reflection');
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await onCreate({ content, category, documentId });
      setContent('');
      setDocumentId(null);
    } finally { setSubmitting(false); }
  };

  function getCategoryIcon(catId: string) {
    const cat  = CATEGORIES.find(c => c.id === catId);
    const Icon = cat?.icon || NoteIcon;
    return <Icon size={14} style={{ color: cat?.color || 'inherit' }} weight="duotone" />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 lg:divide-x lg:divide-border-primary">

      {/* ── Input form ──────────────────────────────────────────────── */}
      <aside className="p-4 border-b border-border-primary lg:border-b-0">
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Write a note or reflection…"
            className={`${inputCls} h-28 resize-none`}
          />

          <div>
            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-2">Category</p>
            <div className="grid grid-cols-2 gap-1.5">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-[10px] font-bold transition-all ${
                    category === cat.id
                      ? 'bg-background-tertiary border-modules-aly/40 text-text-primary'
                      : 'border-border-primary text-text-tertiary hover:bg-background-tertiary hover:text-text-primary'
                  }`}
                >
                  <cat.icon size={12} style={{ color: cat.color }} weight={category === cat.id ? 'fill' : 'regular'} />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {documents.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-2">Link resource</p>
              <select
                value={documentId || ''}
                onChange={e => setDocumentId(e.target.value || null)}
                className={inputCls}
              >
                <option value="">None</option>
                {documents.map(doc => (
                  <option key={doc.id} value={doc.id}>{doc.name}</option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-modules-aly text-white text-xs font-bold disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {submitting ? <CircleNotch size={14} className="animate-spin" /> : <Plus size={14} weight="bold" />}
            Add Note
          </button>
        </form>
      </aside>

      {/* ── Notes list ──────────────────────────────────────────────── */}
      <section className="lg:col-span-2 p-4 space-y-3 overflow-y-auto">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-background-tertiary rounded-xl animate-pulse border border-border-primary" />
          ))
        ) : annotations.length === 0 ? (
          <div className="py-16 text-center">
            <Quotes size={28} className="mx-auto text-text-tertiary/20 mb-3" />
            <p className="text-xs text-text-tertiary">No notes yet.</p>
          </div>
        ) : (
          <AnimatePresence>
            {annotations.map(note => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="relative p-4 bg-background-primary border border-border-primary rounded-xl group hover:border-modules-aly/30 transition-colors overflow-hidden"
              >
                <div className="absolute left-0 top-0 h-full w-0.5 bg-modules-aly/40 group-hover:bg-modules-aly transition-colors" />

                <div className="flex items-start justify-between mb-2 pl-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-background-secondary border border-border-primary flex items-center justify-center">
                      {getCategoryIcon(note.category || 'note')}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
                        {note.category || 'note'}
                      </p>
                      <p className="text-[9px] text-text-tertiary/50">
                        {format(new Date(note.created_at), 'MMM d, yyyy · HH:mm')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onDelete(note.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash size={13} />
                  </button>
                </div>

                <p className="text-sm text-text-primary leading-relaxed pl-1 whitespace-pre-wrap">
                  {note.content}
                </p>

                {note.document_id && (
                  <div className="flex items-center gap-1.5 mt-3 px-2.5 py-1 bg-background-secondary border border-border-primary rounded-lg w-fit pl-1">
                    <LinkIcon size={11} className="text-modules-knowledge" />
                    <span className="text-[10px] text-text-secondary">
                      {documents.find(d => d.id === note.document_id)?.name || 'Linked resource'}
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </section>
    </div>
  );
};
