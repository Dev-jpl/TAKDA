"use client";

import React from 'react';
import { motion } from 'framer-motion';
import {
  Sparkle,
  Quotes,
  CheckCircle,
  ShieldCheck,
  RocketLaunch,
  ArrowRight,
  Brain,
  Database
} from '@phosphor-icons/react';
import Link from 'next/link';
import { ASSISTANT_NAME } from '@/constants/brand';

// Social Proof Registry (Testimonials & Global Stats)
export const SocialProofRegistry = () => {
    const syncs = [
      {
        user: "Sarah M.",
        role: "Product Designer",
        text: `TAKDA completely changed how I manage my work and personal life. Everything I need is in one place — and ${ASSISTANT_NAME} actually gets things done.`,
        color: "var(--modules-knowledge)"
      },
      {
        user: "James K.",
        role: "Software Engineer",
        text: `${ASSISTANT_NAME} surfaced patterns in my habits I never noticed. It's like having a thoughtful assistant who actually pays attention.`,
        color: "var(--modules-aly)"
      },
      {
        user: "Mia R.",
        role: "Freelance Consultant",
        text: "I track my fitness, finances, and projects all in one app. TAKDA cut my daily planning time in half.",
        color: "var(--modules-track)"
      }
    ];

    return (
        <section className="py-16 md:py-32 px-4 md:px-6 border-y border-border-primary/20 bg-background-primary relative overflow-hidden">
            <div className="max-w-7xl mx-auto relative z-10">
                <header className="mb-12 md:mb-20 text-center">
                    <h2 className="text-xs font-black text-modules-track uppercase tracking-[0.4em] mb-4">What people are saying</h2>
                    <h3 className="text-3xl md:text-5xl font-black tracking-tight text-text-primary mb-8">Real people. Real results.</h3>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {syncs.map((sync, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="p-8 bg-background-secondary/50 border border-border-primary rounded-[32px] relative group hover:border-text-primary/30 transition-all shadow-2xl shadow-black/40"
                        >
                            <Quotes size={48} weight="fill" className="absolute top-6 right-8 text-text-tertiary opacity-5" />
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-background-tertiary border border-border-primary flex items-center justify-center shadow-lg">
                                    <Sparkle size={20} style={{ color: sync.color }} weight="fill" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-text-primary uppercase tracking-widest">{sync.user}</h4>
                                    <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest mt-0.5">{sync.role}</p>
                                </div>
                            </div>
                            <p className="text-text-secondary leading-relaxed font-medium italic italic">
                                &quot;{sync.text}&quot;
                            </p>
                        </motion.div>
                    ))}
                </div>

                {/* Global Metrics Row */}
                <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-12 py-12 border-t border-border-primary/30">
                    {[
                        { label: "Tasks completed", value: "48,102+", icon: RocketLaunch },
                        { label: "Uptime", value: "99.4%", icon: Brain },
                        { label: "Files stored", value: "1.4M", icon: Database },
                        { label: "User rating", value: "4.9 / 5", icon: ShieldCheck }
                    ].map((m, i) => (
                        <div key={i} className="text-center group">
                            <m.icon size={28} className="mx-auto mb-4 text-text-tertiary group-hover:text-modules-aly transition-colors" weight="duotone" />
                            <h5 className="text-2xl md:text-3xl font-black text-text-primary mb-1">{m.value}</h5>
                            <p className="text-[9px] font-black text-text-tertiary uppercase tracking-[0.2em]">{m.label}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

// Access Registry (Pricing/Waitlist)
export const AccessRegistry = () => {
    return (
        <section className="py-16 md:py-32 px-4 md:px-6 relative bg-background-primary overflow-hidden">
            <div className="max-w-7xl mx-auto">
                <header className="mb-12 md:mb-20 text-center max-w-2xl mx-auto">
                    <h2 className="text-xs font-black text-modules-aly uppercase tracking-[0.4em] mb-4">Pricing</h2>
                    <h3 className="text-3xl md:text-5xl font-black tracking-tight text-text-primary mb-8">Simple, honest pricing</h3>
                    <p className="text-text-tertiary font-medium leading-relaxed text-sm md:text-base">
                        Start free. Upgrade when you&apos;re ready. No surprises.
                    </p>
                </header>

                <div className="flex md:grid md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto overflow-x-auto pb-8 md:pb-0 no-scrollbar snap-x px-4 md:px-0">
                    {/* Free Tier */}
                    <motion.div
                        whileHover={{ y: -10 }}
                        className="p-8 md:p-10 bg-background-secondary/30 border border-border-primary rounded-[32px] md:rounded-[40px] flex flex-col relative overflow-hidden group shadow-sm shadow-black min-w-[280px] md:min-w-0 snap-center"
                    >
                        <div className="absolute top-0 right-0 p-6 md:p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Sparkle size={100} />
                        </div>
                        <div className="mb-8 md:mb-10">
                            <h4 className="text-base md:text-lg font-black uppercase tracking-[0.3em] text-text-primary mb-2">Free</h4>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl md:text-4xl font-black tracking-tighter text-text-primary">$0</span>
                                <span className="text-[9px] md:text-[10px] font-bold text-text-tertiary uppercase tracking-widest">/ month</span>
                            </div>
                        </div>
                        <ul className="space-y-3 md:space-y-4 mb-10 md:mb-16 flex-1">
                            {[
                                "Unlimited tasks & habits",
                                "1GB Vault storage",
                                "Annotate reflections",
                                "Basic AI assistant",
                                "Community support"
                            ].map((f, i) => (
                                <li key={i} className="flex items-center gap-3 text-[11px] md:text-xs text-text-secondary font-medium">
                                    <CheckCircle size={16} className="text-status-success" weight="fill" />
                                    {f}
                                </li>
                            ))}
                        </ul>
                        <Link href="/auth" className="flex items-center justify-center gap-3 py-3.5 md:py-4 bg-background-tertiary border border-border-primary rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-[0.25em] md:tracking-[0.3em] hover:bg-background-tertiary/80 transition-all">
                            Get started free
                        </Link>
                    </motion.div>

                    {/* Pro Tier */}
                    <motion.div
                        whileHover={{ y: -10 }}
                        className="p-8 md:p-10 bg-modules-aly/5 border-2 border-modules-aly/40 rounded-[32px] md:rounded-[40px] flex flex-col relative overflow-hidden group shadow-2xl shadow-modules-aly/10 min-w-[280px] md:min-w-0 snap-center"
                    >
                        <div className="absolute top-0 right-0 p-6 md:p-8 text-modules-aly/10 animate-pulse">
                            <Brain size={100} weight="fill" />
                        </div>
                        <div className="mb-8 md:mb-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-modules-aly rounded-full text-[8px] font-black uppercase tracking-widest text-white mb-4">
                                Most popular
                            </div>
                            <h4 className="text-base md:text-lg font-black uppercase tracking-[0.3em] text-text-primary mb-2">Pro</h4>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl md:text-4xl font-black tracking-tighter text-modules-aly">$14</span>
                                <span className="text-[9px] md:text-[10px] font-bold text-text-tertiary uppercase tracking-widest">/ month</span>
                            </div>
                        </div>
                        <ul className="space-y-3 md:space-y-4 mb-10 md:mb-16 flex-1">
                            {[
                                "Everything in Free",
                                `Full ${ASSISTANT_NAME} AI assistant`,
                                "Unlimited Vault storage",
                                "Advanced insights & summaries",
                                "Priority support"
                            ].map((f, i) => (
                                <li key={i} className="flex items-center gap-3 text-[11px] md:text-xs text-text-primary font-bold">
                                    <CheckCircle size={16} className="text-modules-aly" weight="fill" />
                                    {f}
                                </li>
                            ))}
                        </ul>
                        <Link href="/auth" className="flex items-center justify-center gap-3 py-3.5 md:py-4 bg-modules-aly text-white rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-[0.25em] md:tracking-[0.3em] shadow-xl shadow-modules-aly/20 hover:scale-[1.03] active:scale-[0.98] transition-all group">
                            Get started
                            <ArrowRight size={16} weight="bold" className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};
