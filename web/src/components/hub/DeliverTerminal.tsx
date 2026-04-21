"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PaperPlaneRight,
  Plus,
  Trash,
  CheckCircle,
  Megaphone,
  Question,
  Gavel,
  X,
} from '@phosphor-icons/react';
import { Delivery, DeliveryCreate } from '@/services/deliver.service';

interface DeliverTerminalProps {
  deliveries: Delivery[];
  loading: boolean;
  onCreate: (data: Partial<DeliveryCreate>) => void;
  onDelete: (id: string) => void;
}

const DISPATCH_TYPES = [
  { id: 'delivered', label: 'Delivered', icon: CheckCircle,    color: '#1D9E75' },
  { id: 'decision',  label: 'Decision',  icon: Gavel,          color: '#BA7517' },
  { id: 'update',    label: 'Update',    icon: Megaphone,      color: '#7F77DD' },
  { id: 'question',  label: 'Question',  icon: Question,       color: '#E24B4A' },
];

const inputCls = "w-full bg-background-tertiary border border-border-primary rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-modules-deliver/40 placeholder:text-text-tertiary transition-colors";

export const DeliverTerminal: React.FC<DeliverTerminalProps> = ({
  deliveries, loading, onCreate, onDelete,
}) => {
  const [content,     setContent]     = useState('');
  const [type,        setType]        = useState('update');
  const [isAdding,    setIsAdding]    = useState(false);

  function handleSubmit() {
    if (!content.trim()) return;
    onCreate({ content, type });
    setContent('');
    setIsAdding(false);
  }

  return (
    <div className="p-4 space-y-4">

      {/* ── Add form ────────────────────────────────────────────────── */}
      {isAdding ? (
        <div className="bg-background-primary border border-border-primary rounded-xl p-4 space-y-3">
          <textarea
            autoFocus
            placeholder="Describe the outcome or update…"
            value={content}
            onChange={e => setContent(e.target.value)}
            className={`${inputCls} h-24 resize-none`}
          />

          <div className="flex flex-wrap gap-1.5">
            {DISPATCH_TYPES.map(d => {
              const Icon     = d.icon;
              const isActive = type === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setType(d.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                    isActive
                      ? 'bg-background-secondary border-border-primary text-text-primary'
                      : 'border-transparent text-text-tertiary hover:bg-background-tertiary'
                  }`}
                >
                  <Icon size={12} weight={isActive ? 'fill' : 'bold'} style={{ color: isActive ? d.color : 'currentColor' }} />
                  {d.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSubmit}
              disabled={!content.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-modules-deliver text-white text-xs font-bold disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              <PaperPlaneRight size={13} weight="bold" />
              Post
            </button>
            <button
              onClick={() => { setIsAdding(false); setContent(''); }}
              className="p-2 rounded-xl text-text-tertiary hover:bg-background-tertiary transition-colors"
            >
              <X size={13} weight="bold" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border-primary text-text-tertiary hover:bg-background-tertiary hover:text-text-primary transition-all text-xs font-bold"
        >
          <Plus size={13} weight="bold" />
          Add outcome
        </button>
      )}

      {/* ── List ────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-16 bg-background-tertiary rounded-xl animate-pulse border border-border-primary" />
          ))}
        </div>
      ) : deliveries.length === 0 ? (
        <div className="py-12 text-center">
          <PaperPlaneRight size={28} className="mx-auto text-text-tertiary/20 mb-3" />
          <p className="text-xs text-text-tertiary">No outcomes posted yet.</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {deliveries.map(delivery => {
            const info = DISPATCH_TYPES.find(d => d.id === delivery.type) || DISPATCH_TYPES[2];
            const Icon = info.icon;
            return (
              <motion.div
                key={delivery.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="relative p-4 bg-background-primary border border-border-primary rounded-xl group hover:border-modules-deliver/30 transition-colors overflow-hidden"
              >
                <div className="absolute left-0 top-0 h-full w-0.5 transition-colors" style={{ backgroundColor: info.color + '60' }} />

                <div className="flex items-start gap-3 pl-1">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center border shrink-0"
                    style={{ backgroundColor: `${info.color}10`, borderColor: `${info.color}25` }}
                  >
                    <Icon size={14} color={info.color} weight="duotone" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: info.color }}>
                        {info.label}
                      </span>
                      <span className="text-[9px] text-text-tertiary">
                        {new Date(delivery.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-text-primary leading-relaxed">{delivery.content}</p>
                  </div>

                  <button
                    onClick={() => onDelete(delivery.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                  >
                    <Trash size={13} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
};
