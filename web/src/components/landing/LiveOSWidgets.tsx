"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkle, Pulse, Cpu } from '@phosphor-icons/react';

const logs = [
  "RESTORING_VAULT_SHARD_#481... [COMPLETE]",
  "IDENTIFIED_MISSION_CONTEXT_REDUNDANCY... [SYNCING]",
  "TEMPORAL_CYCLE_2026.04.03_ONLINE",
  "ALY_INTELLIGENCE_LAYER_ESTABLISHED",
  "TRACK_REGISTRY_VELOCITY: 1.4x",
  "COORDINATING_HUMAN_EXPERIENCE_CLARITY...",
  "ANNOTATE_REFLECTION_MATRIX_STABLE",
  "AUTOMATE_BRIEFING_SYNTHESIS_HUB_READY"
];

export const IntelligenceTicker = () => {
  return (
    <div className="w-full bg-modules-aly/5 border-y border-modules-aly/20 h-8 flex items-center overflow-hidden whitespace-nowrap relative z-[110]">
      <div className="absolute left-0 top-0 bottom-0 px-4 bg-background-primary border-r border-modules-aly/20 flex items-center gap-2 z-10">
        <Pulse size={12} className="text-modules-aly animate-pulse" />
        <span className="text-[8px] font-black tracking-widest text-modules-aly uppercase">Live Registry</span>
      </div>
      
      <motion.div 
        animate={{ x: [0, -1000] }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        className="flex items-center gap-12 pl-32"
      >
        {Array(3).fill(logs).flat().map((log, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-[9px] font-mono font-bold text-text-tertiary">
              {log}
            </span>
            <Sparkle size={8} className="text-modules-aly opacity-30" weight="fill" />
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export const SystemStatus = () => {
    return (
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="fixed bottom-8 left-8 z-[110] hidden xl:flex flex-col gap-1 p-4 bg-background-secondary/80 border border-border-primary rounded-2xl backdrop-blur-xl shadow-2xl shadow-black/40"
        >
            <div className="flex items-center gap-3 mb-2 border-b border-border-primary pb-2">
                <div className="w-2 h-2 rounded-full bg-status-success shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse" />
                <span className="text-[9px] font-black tracking-[0.3em] text-text-primary uppercase">Takda OS Status</span>
            </div>
            <div className="space-y-2">
                <div className="flex justify-between items-center gap-8">
                    <span className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest flex items-center gap-2"><Cpu size={10} /> Sync %</span>
                    <span className="text-[9px] font-mono font-black text-modules-aly">98.4%</span>
                </div>
                <div className="flex justify-between items-center gap-8">
                    <span className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest flex items-center gap-2 animate-pulse"><Pulse size={10} /> Velocity</span>
                    <span className="text-[9px] font-mono font-black text-modules-track">1.4x</span>
                </div>
                <div className="flex justify-between items-center gap-8 opacity-50">
                    <span className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest">Temporal</span>
                    <span className="text-[9px] font-mono font-black text-text-secondary">2026.04.03</span>
                </div>
            </div>
        </motion.div>
    )
}
