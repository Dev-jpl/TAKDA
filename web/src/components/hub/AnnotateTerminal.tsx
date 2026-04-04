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
  Quotes
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
  { id: 'reflection', label: 'Reflection', icon: ChatTeardropText, color: 'var(--modules-aly)' },
  { id: 'insight', label: 'Insight', icon: Lightbulb, color: 'var(--status-warning)' },
  { id: 'objective', label: 'Objective', icon: Target, color: 'var(--modules-track)' },
  { id: 'note', label: 'General Note', icon: NoteIcon, color: 'var(--text-tertiary)' },
];

export const AnnotateTerminal: React.FC<AnnotateTerminalProps> = ({ 
  annotations, 
  documents, 
  loading, 
  onCreate, 
  onDelete 
}) => {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('reflection');
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
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryIcon = (catId: string) => {
    const cat = CATEGORIES.find(c => c.id === catId);
    const Icon = cat?.icon || NoteIcon;
    return <Icon size={18} style={{ color: cat?.color || 'inherit' }} weight="duotone" />;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Reflection Input */}
      <aside className="lg:col-span-1">
        <form 
          onSubmit={handleSubmit}
          className="bg-background-secondary border border-border-primary p-6 rounded-2xl sticky top-24 shadow-sm shadow-black/20"
        >
          <div className="flex items-center gap-2 mb-6">
            <Quotes size={20} className="text-modules-aly" weight="fill" />
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-[0.2em]">Identify Reflection</h3>
          </div>

          <textarea 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Record mission-critical oversight or insights..."
            className="w-full h-40 bg-background-tertiary border border-border-primary rounded-xl p-4 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-modules-aly/30 resize-none mb-6"
          />

          <div className="space-y-4 mb-8">
            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Context Category</p>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-bold transition-all ${
                    category === cat.id 
                      ? "bg-background-tertiary border-modules-aly text-text-primary" 
                      : "bg-transparent border-border-primary text-text-tertiary hover:border-text-tertiary/30"
                  }`}
                >
                  <cat.icon size={14} style={{ color: cat.color }} weight={category === cat.id ? "fill" : "regular"} />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Link Registry terminal</p>
            <select 
              value={documentId || ''}
              onChange={(e) => setDocumentId(e.target.value || null)}
              className="w-full bg-background-tertiary border border-border-primary rounded-xl px-4 py-2 text-[10px] font-bold focus:outline-none"
            >
              <option value="">No context Link</option>
              {documents.map(doc => (
                <option key={doc.id} value={doc.id}>{doc.name}</option>
              ))}
            </select>
          </div>

          <button 
            type="submit"
            disabled={submitting || !content.trim()}
            className="w-full py-4 bg-modules-aly text-white rounded-xl font-bold text-sm shadow-xl shadow-modules-aly/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100"
          >
            {submitting ? <CircleNotch size={18} className="animate-spin" /> : <Plus size={18} weight="bold" />}
            <span>Commence Log</span>
          </button>
        </form>
      </aside>

      {/* Reflection Registry */}
      <section className="lg:col-span-2">
        <div className="space-y-4">
          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="h-32 w-full bg-background-secondary rounded-2xl animate-pulse border border-border-primary" />
            ))
          ) : annotations.length === 0 ? (
            <div className="py-20 text-center bg-background-secondary/30 rounded-3xl border border-dashed border-border-primary/50">
              <Quotes size={48} className="mx-auto text-text-tertiary/10 mb-4" />
              <p className="text-text-tertiary font-bold uppercase text-[10px] tracking-widest">
                Registry Empty: No reflections identified.
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {annotations.map((note) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-background-secondary border border-border-primary p-6 rounded-2xl group relative hover:border-modules-aly/30 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-background-tertiary border border-border-primary flex items-center justify-center">
                        {getCategoryIcon(note.category || 'note')}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
                          {note.category || 'reflection'}
                        </p>
                        <p className="text-[9px] text-text-tertiary/60 font-bold uppercase">
                          {format(new Date(note.created_at), 'MMM dd, yyyy · HH:mm')}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => onDelete(note.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-text-tertiary hover:bg-status-urgent/10 hover:text-status-urgent transition-all"
                    >
                      <Trash size={16} />
                    </button>
                  </div>

                  <p className="text-sm text-text-primary leading-relaxed font-medium mb-4 whitespace-pre-wrap">
                    {note.content}
                  </p>

                  {note.document_id && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-background-tertiary border border-border-primary rounded-lg w-fit">
                      <LinkIcon size={12} className="text-modules-knowledge" />
                      <span className="text-[10px] font-bold text-text-secondary">
                        Linked Context: {documents.find(d => d.id === note.document_id)?.name || 'External Registry'}
                      </span>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </section>
    </div>
  );
};
