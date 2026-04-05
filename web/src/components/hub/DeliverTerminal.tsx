"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PaperPlaneRight, 
  Plus, 
  Trash, 
  Sparkle,
  CheckCircle,
  Megaphone,
  Question,
  Gavel
} from '@phosphor-icons/react';
import { Delivery, DeliveryCreate } from '@/services/deliver.service';

interface DeliverTerminalProps {
  deliveries: Delivery[];
  loading: boolean;
  onCreate: (data: Partial<DeliveryCreate>) => void;
  onDelete: (id: string) => void;
}

const DISPATCH_TYPES = [
  { id: 'delivered', label: 'Delivered', icon: CheckCircle, color: '#1D9E75' },
  { id: 'decision', label: 'Decision', icon: Gavel, color: '#BA7517' },
  { id: 'update', label: 'Update', icon: Megaphone, color: '#7F77DD' },
  { id: 'question', label: 'Question', icon: Question, color: '#E24B4A' },
];

export const DeliverTerminal: React.FC<DeliverTerminalProps> = ({ 
  deliveries, 
  loading, 
  onCreate, 
  onDelete 
}) => {
  const [content, setContent] = useState('');
  const [type, setType] = useState('update');
  const [isExpanding, setIsExpanding] = useState(false);

  const handleSubmit = () => {
    if (!content.trim()) return;
    onCreate({ content, type });
    setContent('');
    setIsExpanding(false);
  };

  return (
    <div className="space-y-6">
      {/* Create Dispatch Interface */}
      <div className="bg-background-secondary border border-border-primary rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 bg-background-tertiary/20 flex items-center justify-between border-b border-border-primary/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-modules-deliver/10 flex items-center justify-center border border-modules-deliver/20">
              <PaperPlaneRight size={18} className="text-modules-deliver" weight="fill" />
            </div>
            <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest leading-none mt-0.5">
              Dispatch Intelligence
            </span>
          </div>
          {!isExpanding && (
            <button 
              onClick={() => setIsExpanding(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-modules-deliver text-white text-[10px] font-bold uppercase tracking-widest hover:bg-modules-deliver/90 transition-all active:translate-y-0.5"
            >
              <Plus size={14} weight="bold" />
              Initialize Dispatch
            </button>
          )}
        </div>

        <AnimatePresence>
          {isExpanding && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-6 space-y-6">
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-text-tertiary uppercase tracking-widest ml-1">Dispatch Context</label>
                  <textarea 
                    autoFocus
                    placeholder="Describe mission output or critical update..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full bg-background-tertiary border border-border-primary rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-modules-deliver/50 focus:border-modules-deliver/50 transition-all font-medium h-24 resize-none placeholder:text-text-tertiary/30"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2 p-1.5 bg-background-tertiary/50 rounded-xl border border-border-primary/50">
                    {DISPATCH_TYPES.map(dispatch => {
                      const isActive = type === dispatch.id;
                      const Icon = dispatch.icon;
                      return (
                        <button
                          key={dispatch.id}
                          onClick={() => setType(dispatch.id)}
                          className={`
                            flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all
                            ${isActive 
                              ? 'bg-background-secondary text-text-primary shadow-sm border border-border-primary' 
                              : 'text-text-tertiary hover:text-text-secondary'}
                          `}
                        >
                          <Icon size={14} weight={isActive ? "fill" : "bold"} style={{ color: isActive ? dispatch.color : 'currentColor' }} />
                          {dispatch.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setIsExpanding(false)}
                      className="px-4 py-2 text-[10px] font-bold text-text-tertiary hover:text-text-primary transition-colors"
                    >
                      Abort
                    </button>
                    <button 
                      onClick={handleSubmit}
                      disabled={!content.trim()}
                      className={`
                        px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg
                        ${!content.trim() 
                          ? 'bg-background-tertiary text-text-tertiary cursor-not-allowed' 
                          : 'bg-modules-deliver text-white hover:bg-modules-deliver/90 shadow-modules-deliver/20'}
                      `}
                    >
                      Deploy Dispatch
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Deliveries Grid */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center bg-background-secondary/30 rounded-3xl border border-dashed border-border-primary">
            <Sparkle size={32} className="text-modules-deliver/20 animate-pulse mb-4" />
            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Synchronizing Dispatches...</p>
          </div>
        ) : deliveries.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center bg-background-secondary/30 rounded-3xl border border-dashed border-border-primary">
            <PaperPlaneRight size={48} className="text-text-tertiary/10 mb-4" />
            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">No Intelligence Dispatched In This Hub</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {deliveries.map((delivery) => {
                const dispatchInfo = DISPATCH_TYPES.find(d => d.id === delivery.type) || DISPATCH_TYPES[2];
                const Icon = dispatchInfo.icon;
                return (
                  <motion.div 
                    key={delivery.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group bg-background-secondary border border-border-primary p-6 rounded-2xl relative overflow-hidden transition-all hover:border-modules-deliver/30 hover:shadow-xl hover:shadow-modules-deliver/5"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => onDelete(delivery.id)}
                        className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg text-text-tertiary transition-all"
                      >
                        <Trash size={16} />
                      </button>
                    </div>

                    <div className="flex items-start gap-4">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 shadow-sm"
                        style={{ backgroundColor: `${dispatchInfo.color}10`, borderColor: `${dispatchInfo.color}20` }}
                      >
                        <Icon size={20} color={dispatchInfo.color} weight="duotone" />
                      </div>
                      
                      <div className="space-y-3 pt-0.5 w-full">
                        <div className="flex items-center gap-3">
                          <span 
                            className="text-[9px] font-black uppercase tracking-widest"
                            style={{ color: dispatchInfo.color }}
                          >
                            {dispatchInfo.label}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-text-tertiary/30" />
                          <span className="text-[9px] text-text-tertiary font-bold uppercase tracking-widest">
                            {new Date(delivery.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <p className="text-sm text-text-primary leading-relaxed font-medium">
                          {delivery.content}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
