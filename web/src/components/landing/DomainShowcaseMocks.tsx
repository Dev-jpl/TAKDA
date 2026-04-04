"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendUp, 
  Wallet, 
  Receipt, 
  Bell, 
  CalendarPlus, 
  FileText, 
  Question,
  CaretRight
} from '@phosphor-icons/react';

// --- VITAL REGISTRY (Health & Progress) ---
export const VitalShowcase = () => (
  <div className="p-6 space-y-8">
    <div className="grid grid-cols-2 gap-4">
        {/* Calorie Ring Mock */}
        <div className="bg-background-secondary p-5 rounded-3xl border border-border-primary relative overflow-hidden flex flex-col items-center justify-center">
            <svg className="w-24 h-24 transform -rotate-90">
                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-background-tertiary" />
                <motion.circle 
                    initial={{ strokeDashoffset: 251.2 }}
                    animate={{ strokeDashoffset: 251.2 - (251.2 * 0.75) }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray="251.2"
                    className="text-status-high" 
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-black text-text-primary">1,840</span>
                <span className="text-[8px] font-bold text-text-tertiary uppercase">kCal</span>
            </div>
            <p className="mt-4 text-[9px] font-black text-text-tertiary uppercase tracking-widest">Daily Progress</p>
        </div>

        {/* Macros Table */}
        <div className="space-y-3">
            {[
                { label: "Protein", val: "140g", perc: 85, color: "var(--modules-aly)" },
                { label: "Carbs", val: "210g", perc: 60, color: "var(--modules-track)" },
                { label: "Fats", val: "65g", perc: 45, color: "var(--modules-knowledge)" },
            ].map((m, i) => (
                <div key={i} className="space-y-1">
                    <div className="flex justify-between text-[8px] font-black uppercase text-text-tertiary tracking-widest">
                        <span>{m.label}</span>
                        <span>{m.val}</span>
                    </div>
                    <div className="h-1 w-full bg-background-tertiary rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${m.perc}%` }}
                            transition={{ duration: 1, delay: i * 0.1 }}
                            className="h-full" 
                            style={{ backgroundColor: m.color }}
                        />
                    </div>
                </div>
            ))}
        </div>
    </div>

    {/* Weight Progress Chart Mock */}
    <div className="bg-background-secondary p-5 rounded-3xl border border-border-primary overflow-hidden">
        <header className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-black text-text-primary uppercase tracking-widest flex items-center gap-2">
                <TrendUp size={14} className="text-status-success" />
                Weight Restoration
            </span>
            <span className="text-[9px] font-bold text-text-tertiary">LVL_04 // STABLE</span>
        </header>
        <div className="h-20 flex items-end gap-1 px-2">
            {[30, 45, 35, 60, 55, 75, 40, 85, 65, 90].map((h, i) => (
                <motion.div 
                    key={i} 
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: i * 0.05 }}
                    className="flex-1 bg-gradient-to-t from-modules-aly/5 to-modules-aly/40 rounded-t-sm"
                />
            ))}
        </div>
    </div>
  </div>
);

// --- LEDGER REGISTRY (Finance) ---
export const LedgerShowcase = () => (
  <div className="p-6 space-y-6">
    <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
            <Wallet size={24} className="text-modules-knowledge" />
            <div>
                <h4 className="text-xs font-black text-text-primary uppercase">Financial Registry</h4>
                <p className="text-[8px] text-text-tertiary font-bold tracking-[0.2em]">Oversight Cycle: 04</p>
            </div>
        </div>
        <div className="px-3 py-1 bg-modules-knowledge/10 border border-modules-knowledge/30 rounded-lg">
            <span className="text-[10px] font-black text-modules-knowledge">$14,802.40</span>
        </div>
    </div>

    {/* Expense Logs */}
    <div className="space-y-3">
        {[
            { tag: "Housing", val: "-$2,100", date: "04.01", icon: Receipt },
            { tag: "Food", val: "-$84.20", date: "04.02", icon: Receipt },
            { tag: "Subscriptions", val: "-$14.99", date: "04.03", icon: Receipt },
        ].map((e, i) => (
            <motion.div 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-3 bg-background-secondary/50 rounded-xl border border-border-primary/50 flex items-center justify-between group hover:border-modules-knowledge/30 transition-all cursor-pointer"
            >
                <div className="flex items-center gap-3">
                    <e.icon size={14} className="text-text-tertiary" />
                    <span className="text-[10px] font-bold text-text-secondary">{e.tag}</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-[10px] font-mono font-bold text-urgent">{e.val}</span>
                    <span className="text-[8px] font-mono text-text-tertiary opacity-50">{e.date}</span>
                </div>
            </motion.div>
        ))}
    </div>

    {/* Bill Reminder Mock */}
    <div className="bg-urgent/5 border border-urgent/20 p-4 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
            <Bell size={18} className="text-urgent animate-bounce" />
            <div>
                <p className="text-[10px] font-black text-text-primary uppercase">Mission Essential: Bill Payment</p>
                <p className="text-[8px] text-urgent font-bold uppercase tracking-widest mt-0.5">Due in 14 hours</p>
            </div>
        </div>
        <CaretRight size={14} className="text-urgent" />
    </div>
  </div>
);

// --- NEXUS REGISTRY (Automation & Events) ---
export const NexusShowcase = () => (
  <div className="p-6 h-full flex flex-col">
    <div className="flex-1 space-y-6">
        {/* Automated Event */}
        <div className="bg-background-tertiary/50 border border-border-primary rounded-2xl p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 py-2 group-hover:scale-110 transition-transform">
                <CalendarPlus size={48} />
            </div>
            <h4 className="text-[10px] font-black text-modules-aly uppercase tracking-widest mb-3 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-modules-aly animate-pulse" />
                Auto-Registry: Event Sync
            </h4>
            <p className="text-[11px] font-bold text-text-primary mb-2">Technical Coordination Sync</p>
            <p className="text-[9px] text-text-tertiary font-bold uppercase">14:00 - 15:30 // VIRTUAL_TERMINAL</p>
        </div>

        {/* Automated Report */}
        <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-modules-automate/5 border border-modules-automate/20 rounded-2xl flex flex-col items-center justify-center text-center">
                <FileText size={20} className="text-modules-automate mb-3" />
                <h5 className="text-[9px] font-black text-text-primary uppercase mb-1">Weekly Report</h5>
                <p className="text-[8px] text-text-tertiary font-bold">GENERATED_LOG_04</p>
            </div>
            <div className="p-4 bg-background-secondary border border-border-primary rounded-2xl flex flex-col items-center justify-center text-center">
                <Question size={20} className="text-text-tertiary mb-3" />
                <h5 className="text-[9px] font-black text-text-primary uppercase mb-1">Knowledge Quiz</h5>
                <p className="text-[8px] text-text-tertiary font-bold">6_QUESTIONS_REMAIN</p>
            </div>
        </div>

        {/* Automation Status */}
        <div className="mt-4 p-4 border border-border-primary/50 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[8px] font-black text-text-tertiary uppercase tracking-widest">Nexus Thread Activity</span>
                <span className="text-[8px] font-bold text-status-success">ACTIVE</span>
            </div>
            <div className="flex gap-1 h-3 items-end">
                {[40, 70, 45, 90, 60, 30, 85, 55, 95, 75, 40, 60].map((h, i) => (
                    <motion.div 
                        key={i}
                        animate={{ height: [`${h}%`, `${Math.min(100, h + 20)}%`, `${h}%`] }}
                        transition={{ repeat: Infinity, duration: 2, delay: i * 0.1 }}
                        className="flex-1 bg-modules-automate rounded-t-[1px] opacity-40" 
                    />
                ))}
            </div>
        </div>
    </div>
  </div>
);
