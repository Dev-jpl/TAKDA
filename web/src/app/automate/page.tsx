"use client";

import React, { useState } from 'react';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { motion } from 'framer-motion';
import { 
  TreeStructure, 
  Sparkle, 
  Plus, 
  GitMerge, 
  ClockClockwise, 
  CodeBlock,
  PlayCircle,
  Database
} from '@phosphor-icons/react';

// Using the established module color for Automate
const AUTOMATE_TEXT = 'text-amber-500';

export default function AutomatePage() {
  const { assistantName } = useUserProfile();
  const [isHoveringCanvas, setIsHoveringCanvas] = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background-primary">
      {/* Global Header */}
      <header className="p-8 border-b border-border-primary shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-text-primary flex items-center gap-3">
            <TreeStructure size={28} weight="duotone" className={AUTOMATE_TEXT} />
            Automate
          </h1>
          <p className="text-[10px] font-bold text-text-tertiary mt-1 uppercase tracking-[0.2em]">
            Cross-App Workflow Engine
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border-primary text-text-tertiary hover:text-text-primary hover:bg-background-secondary transition-all">
            <ClockClockwise size={16} />
            <span className="text-xs font-bold">Execution Logs</span>
          </button>
          <button className="flex items-center justify-center gap-2 bg-amber-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-amber-600/20 hover:scale-[1.02] transition-all active:scale-95">
            <Plus size={16} weight="bold" />
            <span>New Workflow</span>
          </button>
        </div>
      </header>

      {/* Main Canvas Area */}
      <main className="flex-1 flex bg-[url('/grid-pattern.svg')] lg:p-6 overflow-hidden relative">
        {/* Sidenav for Nodes */}
        <aside className="w-64 bg-background-secondary/80 backdrop-blur-xl border border-border-primary rounded-2xl p-4 flex flex-col gap-6 m-4 ml-0 hidden lg:flex shadow-2xl relative z-10">
          <div>
            <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest pl-2 mb-3 mt-2">Triggers</h3>
            <div className="flex flex-col gap-2">
              <div className="p-3 bg-background-tertiary border border-border-primary rounded-xl flex items-center gap-3 cursor-grab hover:border-amber-500/50 transition-all opacity-50">
                <ClockClockwise size={18} className="text-blue-500" />
                <span className="text-xs font-bold text-text-secondary">Schedule</span>
              </div>
              <div className="p-3 bg-background-tertiary border border-border-primary rounded-xl flex items-center gap-3 cursor-grab hover:border-amber-500/50 transition-all opacity-50">
                <Database size={18} className="text-emerald-500" />
                <span className="text-xs font-bold text-text-secondary">Webhook</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest pl-2 mb-3">Actions</h3>
            <div className="flex flex-col gap-2">
              <div className="p-3 bg-background-tertiary border border-border-primary rounded-xl flex items-center gap-3 cursor-grab hover:border-amber-500/50 transition-all opacity-50">
                <Sparkle size={18} className="text-amber-500" />
                <span className="text-xs font-bold text-text-secondary">{assistantName} Synthesis</span>
              </div>
              <div className="p-3 bg-background-tertiary border border-border-primary rounded-xl flex items-center gap-3 cursor-grab hover:border-amber-500/50 transition-all opacity-50">
                <GitMerge size={18} className="text-purple-500" />
                <span className="text-xs font-bold text-text-secondary">Hub Router</span>
              </div>
              <div className="p-3 bg-background-tertiary border border-border-primary rounded-xl flex items-center gap-3 cursor-grab hover:border-amber-500/50 transition-all opacity-50">
                <CodeBlock size={18} className="text-orange-500" />
                <span className="text-xs font-bold text-text-secondary">Custom Code</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Placeholder Canvas */}
        <div 
          className="flex-1 rounded-2xl border-2 border-dashed border-border-primary bg-background-primary/50 flex flex-col items-center justify-center p-12 text-center transition-all m-4"
          onMouseEnter={() => setIsHoveringCanvas(true)}
          onMouseLeave={() => setIsHoveringCanvas(false)}
        >
          <motion.div 
            animate={{ scale: isHoveringCanvas ? 1.05 : 1, opacity: isHoveringCanvas ? 1 : 0.6 }} 
            className="w-24 h-24 rounded-[32px] bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-6 shadow-xl shadow-amber-500/5"
          >
            <TreeStructure size={48} weight="duotone" className={AUTOMATE_TEXT} />
          </motion.div>
          <h2 className="text-xl font-bold text-text-primary tracking-tight">The Global Automation Canvas is evolving.</h2>
          <p className="text-sm text-text-tertiary mt-2 max-w-md leading-relaxed mx-auto">
            You will soon be able to build intelligent, n8n-style node workflows that bridge data universally across all your Apps, Spaces, and Hubs.
          </p>
          <button className="mt-8 px-8 py-3 rounded-2xl bg-background-secondary border border-border-primary text-text-tertiary text-xs font-black tracking-widest uppercase flex items-center gap-2 hover:bg-background-tertiary hover:text-text-primary transition-all">
            <PlayCircle size={18} />
            Explore Beta Nodes
          </button>
        </div>
      </main>
    </div>
  );
}
