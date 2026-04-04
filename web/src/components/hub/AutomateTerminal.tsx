"use client";

import React, { useState } from 'react';
import { 
  Robot, 
  Lightning, 
  Calendar,
  Trash,
  CaretRight,
  Waveform,
  Sparkle,
  CircleNotch,
  FileText
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefing } from '@/services/automate.service';
import { format } from 'date-fns';

interface AutomateTerminalProps {
  briefings: Briefing[];
  loading: boolean;
  onGenerate: (type: 'daily' | 'weekly') => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const AutomateTerminal: React.FC<AutomateTerminalProps> = ({ 
  briefings, 
  loading, 
  onGenerate, 
  onDelete 
}) => {
  const [generating, setGenerating] = useState(false);
  const [selectedBriefing, setSelectedBriefing] = useState<Briefing | null>(null);

  // If no briefing selected, default to the most recent one
  React.useEffect(() => {
    if (!selectedBriefing && briefings.length > 0) {
      setSelectedBriefing(briefings[0]);
    }
  }, [briefings, selectedBriefing]);

  const handleGenerate = async (type: 'daily' | 'weekly') => {
    if (!confirm(`Sychronize mission-critical ${type} intelligence now? This will initiate the Aly engine.`)) return;
    setGenerating(true);
    try {
      await onGenerate(type);
    } finally {
      setGenerating(false);
    }
  };

  const renderBriefingContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      if (line.startsWith('###')) {
        return <h3 key={i} className="text-sm font-bold text-text-primary mt-6 mb-2 uppercase tracking-wider">{line.replace('###', '').trim()}</h3>;
      }
      if (line.startsWith('##')) {
        return <h2 key={i} className="text-base font-bold text-text-primary mt-8 mb-3 border-b border-border-primary pb-2 uppercase tracking-widest">{line.replace('##', '').trim()}</h2>;
      }
      if (line.startsWith('-') || line.startsWith('*')) {
        return <div key={i} className="flex gap-2 text-sm text-text-secondary mb-2 pl-4">
          <div className="w-1 h-1 rounded-full bg-modules-aly mt-2 shrink-0 shadow-[0_0_5px_var(--modules-aly)]" />
          <span>{line.substring(1).trim()}</span>
        </div>;
      }
      if (line.trim() === '') return <div key={i} className="h-4" />;
      return <p key={i} className="text-sm text-text-secondary leading-relaxed mb-4">{line}</p>;
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Briefing History */}
      <aside className="lg:col-span-1 space-y-6">
        <div className="bg-background-secondary border border-border-primary p-6 rounded-2xl shadow-sm shadow-black/20">
          <div className="flex items-center gap-2 mb-6">
            <Robot size={20} className="text-modules-aly" weight="fill" />
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-[0.2em]">Synthesis Engine</h3>
          </div>

          <div className="space-y-3">
            <button 
              onClick={() => handleGenerate('daily')}
              disabled={generating}
              className="w-full py-3 bg-modules-aly/10 border border-modules-aly/30 text-modules-aly rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-modules-aly/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {generating ? <CircleNotch size={14} className="animate-spin" /> : <Lightning size={14} weight="fill" />}
              Generate Daily Brief
            </button>
            <button 
              onClick={() => handleGenerate('weekly')}
              disabled={generating}
              className="w-full py-3 bg-background-tertiary border border-border-primary text-text-tertiary rounded-xl font-bold text-[10px] uppercase tracking-widest hover:border-text-tertiary transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Calendar size={14} weight="duotone" />
              Weekly Synthesis
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest px-2">Historical Records</p>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="h-14 bg-background-secondary rounded-xl animate-pulse" />)
            ) : briefings.length === 0 ? (
              <p className="px-2 py-4 text-[10px] text-text-tertiary/60 font-bold uppercase italic italic">Empty Archive.</p>
            ) : (
              briefings.map(b => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBriefing(b)}
                  className={`w-full p-4 rounded-xl border text-left transition-all group flex items-center justify-between ${
                    selectedBriefing?.id === b.id 
                      ? "bg-background-tertiary border-modules-aly shadow-lg" 
                      : "bg-background-secondary border-border-primary hover:border-text-tertiary/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Waveform size={14} weight="bold" className={selectedBriefing?.id === b.id ? "text-modules-aly" : "text-text-tertiary"} />
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${selectedBriefing?.id === b.id ? "text-text-primary" : "text-text-secondary"}`}>
                        {b.type} Intelligence
                      </p>
                      <p className="text-[8px] text-text-tertiary font-bold uppercase">
                        {format(new Date(b.created_at), 'MMM dd')}
                      </p>
                    </div>
                  </div>
                  <CaretRight size={12} className={`transition-transform ${selectedBriefing?.id === b.id ? "translate-x-1" : "opacity-0"}`} />
                </button>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Briefing Display */}
      <section className="lg:col-span-3">
        <AnimatePresence mode="wait">
          {!selectedBriefing ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-[600px] flex flex-col items-center justify-center bg-background-secondary/30 rounded-3xl border border-dashed border-border-primary/50"
            >
              <Sparkle size={48} className="text-text-tertiary/10 mb-4 animate-pulse" />
              <p className="text-text-tertiary font-bold uppercase text-[10px] tracking-widest">
                Initiate Synthesis to build mission reports.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={selectedBriefing.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-background-secondary border border-border-primary rounded-3xl shadow-xl shadow-black/20 overflow-hidden min-h-[600px] flex flex-col"
            >
              <header className="p-8 border-b border-border-primary bg-background-tertiary/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="px-3 py-1 bg-modules-aly/10 border border-modules-aly/30 rounded-lg">
                    <span className="text-[10px] font-bold text-modules-aly uppercase tracking-widest">
                      Takda Intelligence Report · {selectedBriefing.type}
                    </span>
                  </div>
                  <button 
                    onClick={() => onDelete(selectedBriefing.id)}
                    className="p-2 rounded-lg text-text-tertiary hover:bg-status-urgent/10 hover:text-status-urgent transition-all"
                  >
                    <Trash size={18} />
                  </button>
                </div>
                <h2 className="text-2xl font-bold text-text-primary tracking-tight">Intelligence Oversight Summary</h2>
                <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest mt-1">
                  Generated: {format(new Date(selectedBriefing.created_at), 'MMMM dd, yyyy · HH:mm')}
                </p>
              </header>

              <div className="p-8 lg:p-12 overflow-y-auto max-h-[700px] custom-scrollbar flex-1">
                <div className="prose prose-invert max-w-none">
                  {renderBriefingContent(selectedBriefing.content)}
                </div>
              </div>

              <footer className="p-6 border-t border-border-primary bg-background-tertiary/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkle size={14} className="text-modules-aly animate-pulse" />
                  <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Aly Synthesis Engine Status: Optimal</span>
                </div>
                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-2 text-[10px] font-bold text-text-tertiary hover:text-text-primary transition-all">
                    <FileText size={14} />
                    Export registry
                  </button>
                </div>
              </footer>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
};
