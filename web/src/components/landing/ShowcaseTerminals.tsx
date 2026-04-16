"use client";

import React from 'react';
import {
  Sparkle,
  FileText,
  Folder,
  Brain,
  ChartLineUp,
  User,
  CaretRight
} from '@phosphor-icons/react';
import { motion } from 'framer-motion';

// Mock Track Terminal
export const TrackShowcase = () => (
  <div className="p-6 space-y-4 font-mono">
    <div className="flex items-center justify-between text-[10px] text-text-tertiary uppercase tracking-widest border-b border-border-primary pb-2">
      <span>Tasks</span>
      <span>Status</span>
    </div>
    {[
      { name: "Finish product brief", status: "Active", color: "var(--modules-track)" },
      { name: "Review team feedback", status: "Pending", color: "var(--status-high)" },
      { name: "Set up weekly review", status: "Done", color: "var(--status-success)" },
    ].map((m, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.1 }}
        className="flex items-center justify-between p-3 bg-background-secondary/50 rounded-lg border border-border-primary/50"
      >
        <div className="flex items-center gap-3">
          <ChartLineUp size={14} className="text-text-tertiary" />
          <span className="text-xs font-bold text-text-secondary">{m.name}</span>
        </div>
        <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: m.color }} />
            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: m.color }}>{m.status}</span>
        </div>
      </motion.div>
    ))}
  </div>
);

// Mock Vault Terminal
export const VaultShowcase = () => (
  <div className="p-6 space-y-4">
    <div className="flex items-center gap-3 mb-4">
        <Folder size={20} className="text-modules-knowledge" weight="fill" />
        <span className="text-xs font-bold text-text-primary uppercase tracking-widest">Vault / 2026 / Work</span>
    </div>
    <div className="grid grid-cols-2 gap-4">
      {[
        { name: "Q2_Strategy.pdf", size: "2.4 MB" },
        { name: "Meeting_Notes.docx", size: "1.1 MB" },
        { name: "deploy_script.py", size: "14 KB" },
        { name: "aly_config.json", size: "48 KB" },
      ].map((f, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1 }}
          className="p-3 bg-background-secondary/80 rounded-xl border border-border-primary flex items-center gap-3 group hover:border-modules-knowledge/30 transition-all cursor-pointer"
        >
          <FileText size={20} className="text-text-tertiary group-hover:text-modules-knowledge transition-colors" />
          <div className="overflow-hidden">
            <p className="text-[10px] font-bold text-text-primary truncate">{f.name}</p>
            <p className="text-[8px] text-text-tertiary font-bold uppercase">{f.size}</p>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

// Mock Annotate Terminal
export const AnnotateShowcase = () => (
  <div className="p-6 space-y-4">
    <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Recent reflections</span>
        <Brain size={18} className="text-modules-annotate animate-pulse" />
    </div>
    {[
      { text: "I notice I do my best work in the morning. Scheduling deep work before 11am has made a big difference.", cat: "Habits" },
      { text: "Finished the week 14% ahead of target. Keeping up the momentum into next sprint.", cat: "Progress" },
    ].map((r, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.1 }}
        className="p-4 bg-background-tertiary/50 border-l-2 border-modules-annotate rounded-r-xl space-y-2"
      >
        <p className="text-xs text-text-secondary leading-relaxed italic">&quot;{r.text}&quot;</p>
        <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-modules-annotate/10 text-modules-annotate text-[8px] font-bold uppercase tracking-tighter rounded border border-modules-annotate/20">{r.cat}</span>
        </div>
      </motion.div>
    ))}
  </div>
);

// Mock Automate Terminal
export const AutomateShowcase = () => (
  <div className="p-6">
    <div className="mb-8 text-center bg-modules-automate/5 border border-modules-automate/20 p-6 rounded-2xl">
        <Sparkle size={32} className="text-modules-automate mx-auto mb-4 animate-spin-slow" />
        <h4 className="text-sm font-bold text-text-primary uppercase tracking-widest">Daily briefing ready</h4>
        <p className="text-[10px] text-text-tertiary font-bold mt-1 uppercase">14 items summarized</p>
    </div>
    <div className="space-y-3">
        <div className="h-2 w-full bg-background-tertiary rounded-full overflow-hidden">
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: "85%" }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="h-full bg-modules-automate"
            />
        </div>
        <div className="flex justify-between text-[10px] text-text-tertiary font-bold uppercase tracking-widest">
            <span>Processing</span>
            <span className="text-modules-automate">85% COMPLETE</span>
        </div>
    </div>
  </div>
);

// Mock Aly Terminal
export const AlyShowcase = () => (
  <div className="p-6 flex flex-col h-full bg-background-tertiary/20">
    <div className="flex-1 space-y-6 overflow-hidden">
        <div className="flex justify-start items-start gap-3">
            <div className="w-6 h-6 rounded-lg bg-modules-aly/10 border border-modules-aly/30 flex items-center justify-center shrink-0">
                <Sparkle size={12} className="text-modules-aly" weight="fill" />
            </div>
            <div className="p-3 bg-background-secondary border border-border-primary rounded-2xl rounded-tl-none max-w-[80%]">
                <p className="text-[10px] text-text-secondary leading-relaxed font-medium">You have 3 overdue tasks and a meeting at 2pm. Want me to reschedule anything?</p>
            </div>
        </div>
        <div className="flex justify-end items-start gap-3">
            <div className="p-3 bg-modules-aly text-white rounded-2xl rounded-tr-none max-w-[80%] shadow-lg shadow-modules-aly/10">
                <p className="text-[10px] leading-relaxed font-bold">Yes, push the review to tomorrow morning.</p>
            </div>
            <div className="w-6 h-6 rounded-lg bg-background-secondary border border-border-primary flex items-center justify-center shrink-0">
                <User size={12} className="text-text-tertiary" />
            </div>
        </div>
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex justify-start items-start gap-3"
        >
            <div className="w-6 h-6 rounded-lg bg-modules-aly/10 border border-modules-aly/30 flex items-center justify-center shrink-0">
                <Sparkle size={12} className="text-modules-aly animate-pulse" />
            </div>
            <div className="p-3 bg-background-secondary border border-border-primary rounded-2xl rounded-tl-none">
                <div className="flex gap-1">
                    <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-1 h-1 rounded-full bg-text-tertiary" />
                    <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-1 h-1 rounded-full bg-text-tertiary" />
                    <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="w-1 h-1 rounded-full bg-text-tertiary" />
                </div>
            </div>
        </motion.div>
    </div>
    <div className="mt-4 p-3 bg-background-secondary border border-border-primary rounded-xl flex items-center justify-between text-text-tertiary">
        <span className="text-[10px] font-bold tracking-widest uppercase">Ask Aly anything...</span>
        <CaretRight size={14} />
    </div>
  </div>
);
