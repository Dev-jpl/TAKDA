"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChartLineUp, 
  Folder, 
  Brain, 
  Sparkle, 
  Cpu, 
  DotsThreeCircle
} from '@phosphor-icons/react';
import { 
  TrackShowcase, 
  VaultShowcase, 
  AnnotateShowcase, 
  AutomateShowcase, 
  AlyShowcase 
} from './ShowcaseTerminals';
import {
  VitalShowcase,
  LedgerShowcase,
  NexusShowcase
} from './DomainShowcaseMocks';

const coreModules = [
  { id: 'track', name: 'Track', icon: ChartLineUp, color: 'var(--modules-track)', domain: 'Core OS' },
  { id: 'vault', name: 'Vault', icon: Folder, color: 'var(--modules-knowledge)', domain: 'Knowledge' },
  { id: 'annotate', name: 'Annotate', icon: Brain, color: 'var(--modules-annotate)', domain: 'Intelligence' },
  { id: 'automate', name: 'Automate', icon: Cpu, color: 'var(--modules-automate)', domain: 'Process' },
  { id: 'aly', name: 'Aly', icon: Sparkle, color: 'var(--modules-aly)', domain: 'Intelligence' },
];

const domainModules = [
  { id: 'vital', name: 'Vital', icon: ChartLineUp, color: 'var(--status-high)', domain: 'Health' },
  { id: 'ledger', name: 'Ledger', icon: Folder, color: 'var(--modules-knowledge)', domain: 'Finance' },
  { id: 'nexus', name: 'Nexus', icon: Cpu, color: 'var(--modules-automate)', domain: 'Automation' },
];

const allModules = [...coreModules, ...domainModules];

export const ModuleShowcase = () => {
  const [activeTab, setActiveTab] = useState(allModules[0].id);

  const activeModule = allModules.find(m => m.id === activeTab) || allModules[0];

  return (
    <section id="intelligence" className="py-16 md:py-32 px-4 md:px-6 bg-background-primary relative">
        <div className="max-w-7xl mx-auto">
            <header className="mb-10 md:mb-16 text-center max-w-2xl mx-auto">
                <h2 className="text-xs font-black text-modules-aly uppercase tracking-[0.4em] mb-4">Glimpse into the Registry</h2>
                <h3 className="text-3xl md:text-5xl font-black tracking-tight text-text-primary mb-6">Interactive OS Oversight</h3>
                <p className="text-text-tertiary font-medium leading-relaxed text-sm md:text-base">
                    Identify and coordinate your mission-critical live intelligence through Takda&apos;s professional high-fidelity modules.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                {/* Module Selector Sidebar/Header */}
                <aside className="lg:col-span-4 flex lg:flex-col gap-4 lg:gap-8 min-h-0 lg:h-[600px] overflow-x-auto lg:overflow-y-auto pb-4 lg:pb-0 pr-2 lg:pr-4 custom-scrollbar snap-x no-scrollbar">
                    <div className="flex lg:flex-col gap-3 min-w-max lg:min-w-0 snap-start px-1 uppercase whitespace-nowrap">
                        <h5 className="hidden lg:block text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em] px-4 opacity-50">Core OS Registry</h5>
                        {coreModules.map((m) => (
                            <button
                                key={m.id}
                                onClick={() => setActiveTab(m.id)}
                                className={`p-4 md:px-5 lg:w-full rounded-2xl border text-left transition-all relative overflow-hidden group min-w-[140px] lg:min-w-0 ${
                                    activeTab === m.id 
                                        ? "bg-background-secondary border-border-primary shadow-xl" 
                                        : "bg-background-primary border-border-primary/30 lg:hover:border-border-primary/60 lg:hover:bg-background-secondary/50"
                                }`}
                            >
                                <div className="flex items-center gap-4 relative z-10">
                                    <div 
                                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                                            activeTab === m.id ? "bg-opacity-100 shadow-lg" : "bg-opacity-10 shadow-sm"
                                        }`}
                                        style={{ 
                                            backgroundColor: activeTab === m.id ? m.color : `${m.color}15`,
                                            color: activeTab === m.id ? 'white' : m.color
                                        }}
                                    >
                                        <m.icon size={16} weight={activeTab === m.id ? "fill" : "duotone"} />
                                    </div>
                                    <div>
                                        <h4 className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                                            activeTab === m.id ? "text-text-primary" : "text-text-tertiary group-hover:text-text-secondary"
                                        }`}>
                                            {m.name} OS
                                        </h4>
                                        <p className="hidden lg:block text-[9px] text-text-tertiary font-bold uppercase tracking-widest mt-0.5 opacity-50">
                                            {m.domain}
                                        </p>
                                    </div>
                                </div>
                                {activeTab === m.id && (
                                    <motion.div layoutId="active-bg" className="absolute inset-0 bg-gradient-to-r from-transparent via-background-tertiary/10 to-transparent" />
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="flex lg:flex-col gap-3 min-w-max lg:min-w-0 snap-start uppercase whitespace-nowrap">
                        <h5 className="hidden lg:block text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em] px-4 opacity-50">Specialized Domains</h5>
                        {domainModules.map((m) => (
                            <button
                                key={m.id}
                                onClick={() => setActiveTab(m.id)}
                                className={`p-4 md:px-5 lg:w-full rounded-2xl border text-left transition-all relative overflow-hidden group min-w-[140px] lg:min-w-0 ${
                                    activeTab === m.id 
                                        ? "bg-background-secondary border-border-primary shadow-xl" 
                                        : "bg-background-primary border-border-primary/30 lg:hover:border-border-primary/60 lg:hover:bg-background-secondary/50"
                                }`}
                            >
                                <div className="flex items-center gap-4 relative z-10">
                                    <div 
                                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                                            activeTab === m.id ? "bg-opacity-100 shadow-lg" : "bg-opacity-10 shadow-sm"
                                        }`}
                                        style={{ 
                                            backgroundColor: activeTab === m.id ? m.color : `${m.color}15`,
                                            color: activeTab === m.id ? 'white' : m.color
                                        }}
                                    >
                                        <m.icon size={16} weight={activeTab === m.id ? "fill" : "duotone"} />
                                    </div>
                                    <div>
                                        <h4 className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                                            activeTab === m.id ? "text-text-primary" : "text-text-tertiary group-hover:text-text-secondary"
                                        }`}>
                                            {m.name} Registry
                                        </h4>
                                        <p className="hidden lg:block text-[9px] text-text-tertiary font-bold uppercase tracking-widest mt-0.5 opacity-50">
                                            {m.domain} Oversight
                                        </p>
                                    </div>
                                </div>
                                {activeTab === m.id && (
                                    <motion.div layoutId="active-bg" className="absolute inset-0 bg-gradient-to-r from-transparent via-background-tertiary/10 to-transparent" />
                                )}
                            </button>
                        ))}
                    </div>
                </aside>

                {/* Interactive Terminal Interface */}
                <main className="lg:col-span-8">
                    <div className="relative group">
                        {/* Terminal Frame Aesthetic */}
                        <div className="bg-background-tertiary border border-border-primary rounded-3xl shadow-2xl overflow-hidden min-h-[300px] md:min-h-[400px] flex flex-col">
                            {/* Window Header */}
                            <header className="px-6 h-12 bg-background-secondary border-b border-border-primary flex items-center justify-between">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-urgent/20 border border-urgent/30 shadow-[0_0_8px_rgba(226,75,74,0.3)]" />
                                    <div className="w-3 h-3 rounded-full bg-status-high/20 border border-status-high/30" />
                                    <div className="w-3 h-3 rounded-full bg-status-success/20 border border-status-success/30" />
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1 bg-background-tertiary rounded-lg border border-border-primary">
                                    <activeModule.icon size={12} color={activeModule.color} weight="fill" />
                                    <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-[0.25em]">
                                        Takda_OS // {activeModule.name}.Intelligence
                                    </span>
                                </div>
                                <DotsThreeCircle size={20} className="text-text-tertiary" />
                            </header>

                            {/* Terminal Content */}
                            <div className="flex-1 bg-background-primary relative">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeTab}
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        transition={{ duration: 0.2 }}
                                        className="h-full"
                                    >
                                        {activeTab === 'track' && <TrackShowcase />}
                                        {activeTab === 'vault' && <VaultShowcase />}
                                        {activeTab === 'annotate' && <AnnotateShowcase />}
                                        {activeTab === 'automate' && <AutomateShowcase />}
                                        {activeTab === 'aly' && <AlyShowcase />}
                                        {activeTab === 'vital' && <VitalShowcase />}
                                        {activeTab === 'ledger' && <LedgerShowcase />}
                                        {activeTab === 'nexus' && <NexusShowcase />}
                                    </motion.div>
                                </AnimatePresence>
                                
                                {/* Overlay OS Texture */}
                                <div 
                                    className="absolute inset-0 pointer-events-none opacity-[0.03]" 
                                    style={{ 
                                        backgroundImage: `
                                            linear-gradient(to right, var(--border-primary) 1px, transparent 1px),
                                            linear-gradient(to bottom, var(--border-primary) 1px, transparent 1px)
                                        `,
                                        backgroundSize: '20px 20px'
                                    }} 
                                />
                            </div>
                        </div>

                        {/* Terminal Shadow/Glow */}
                        <div 
                            className="absolute -inset-4 rounded-[40px] opacity-10 blur-2xl z-[-1] transition-colors duration-700" 
                            style={{ backgroundColor: activeModule.color }}
                        />
                    </div>
                    
                    {/* Module Status Footer */}
                    <footer className="mt-8 flex items-center justify-between text-[8px] font-bold text-text-tertiary uppercase tracking-widest px-4 translate-y-2 opacity-50">
                        <div className="flex items-center gap-6">
                            <span className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-status-success" /> SYSTEM_STABLE</span>
                            <span className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-modules-aly animate-pulse" /> SYNC_ACTIVE</span>
                        </div>
                        <span>IDENTIFIED_MISSION_CONTEXT: HIGH</span>
                    </footer>
                </main>
            </div>
        </div>
    </section>
  );
};
