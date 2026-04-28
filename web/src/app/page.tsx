"use client";

import React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkle, 
  ArrowRight, 
  Binoculars, 
  ChartLineUp, 
  Database,
  CaretDown
} from '@phosphor-icons/react';
import Link from 'next/link';
import { ModuleShowcase } from '@/components/landing/ModuleShowcase';
import { SocialProofRegistry, AccessRegistry } from '@/components/landing/MarketingSections';
import { LandingNavbar } from '@/components/layout/LandingNavbar';
import { ASSISTANT_NAME } from '@/constants/brand';

const features = [
  {
    title: "Task Tracking",
    desc: "Keep every project, task, and deadline organized across all areas of your life.",
    icon: Database,
    color: "var(--modules-track)",
    span: "md:col-span-2"
  },
  {
    title: "Knowledge Base",
    desc: "Save documents, links, and notes — and actually find them later.",
    icon: Binoculars,
    color: "var(--modules-knowledge)",
    span: "md:col-span-1"
  },
  {
    title: `${ASSISTANT_NAME} — your AI companion`,
    desc: `Ask ${ASSISTANT_NAME} anything. They know your tasks, your schedule, and what matters most.`,
    icon: Sparkle,
    color: "var(--modules-aly)",
    span: "md:col-span-1"
  },
  {
    title: "Automations",
    desc: "Set up workflows that handle the repetitive stuff so you can focus on what matters.",
    icon: ChartLineUp,
    color: "var(--modules-track)",
    span: "md:col-span-2"
  },
  {
    title: "Progress Insights",
    desc: "See how you're moving across your goals, habits, and projects.",
    icon: Database,
    color: "var(--modules-knowledge)",
    span: "md:col-span-1"
  },
  {
    title: "Works everywhere",
    desc: "Web and mobile — your data stays in sync wherever you are.",
    icon: Sparkle,
    color: "var(--modules-aly)",
    span: "md:col-span-2"
  }
];

interface KnowledgeNode {
  id: number;
  initialX: number;
  initialY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  animateX: number[];
  animateY: number[];
  duration: number;
  delay: number;
  colorIndex: number;
}

const generateInitialNodes = (): KnowledgeNode[] => Array.from({ length: 15 }).map((_, i) => ({
  id: i,
  initialX: Math.random() * 100,
  initialY: Math.random() * 100,
  x: Math.random() * 100,
  y: Math.random() * 100,
  vx: (Math.random() - 0.5) * 0.05,
  vy: (Math.random() - 0.5) * 0.05,
  animateX: [],
  animateY: [],
  duration: 0,
  delay: 0,
  colorIndex: i % 3
}));

const ConnectedNodes = () => {
  const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
  const requestRef = React.useRef<number>(0);

  useEffect(() => {
    // Initialize nodes on client mount to avoid hydration mismatch
    // Wrapping in a timeout/RAF to satisfy the cascading render lint rule
    const initialTimer = setTimeout(() => {
      setNodes(generateInitialNodes());
    }, 0);

    const animate = () => {
      setNodes(prevNodes => {
        if (prevNodes.length === 0) return prevNodes;
        return prevNodes.map(node => {
          let nextX = node.x + node.vx;
          let nextY = node.y + node.vy;

          // Wrap around logic
          if (nextX > 100) nextX = 0;
          if (nextX < 0) nextX = 100;
          if (nextY > 100) nextY = 0;
          if (nextY < 0) nextY = 100;

          return { ...node, x: nextX, y: nextY };
        });
      });
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(requestRef.current);
      clearTimeout(initialTimer);
    };
  }, []);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <svg className="w-full h-full opacity-30">
        {nodes.map((node, i) => (
          nodes.slice(i + 1).map(other => {
            const dx = node.x - other.x;
            const dy = node.y - other.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 15) { // Proximity threshold
              return (
                <line
                  key={`${node.id}-${other.id}`}
                  x1={`${node.x}%`}
                  y1={`${node.y}%`}
                  x2={`${other.x}%`}
                  y2={`${other.y}%`}
                  stroke={node.colorIndex === 0 ? 'var(--modules-aly)' : node.colorIndex === 1 ? 'var(--modules-track)' : 'var(--modules-knowledge)'}
                  strokeWidth="0.5"
                  strokeOpacity={1 - dist / 15}
                />
              );
            }
            return null;
          })
        ))}
      </svg>
      {nodes.map((node) => (
        <div
          key={node.id}
          className="absolute w-1.5 h-1.5 rounded-full"
          style={{ 
            left: `${node.x}%`,
            top: `${node.y}%`,
            backgroundColor: node.colorIndex === 0 ? 'var(--modules-aly)' : node.colorIndex === 1 ? 'var(--modules-track)' : 'var(--modules-knowledge)',
            boxShadow: `0 0 15px ${node.colorIndex === 0 ? 'var(--modules-aly)' : node.colorIndex === 1 ? 'var(--modules-track)' : 'var(--modules-knowledge)'}`,
            opacity: 0.4
          }}
        />
      ))}
    </div>
  );
};

export default function LandingPage() {
  const [isInitiated, setIsInitiated] = useState(false);
  const [activeSection, setActiveSection] = useState('intro');

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitiated(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -60% 0px',
      threshold: 0
    };

    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          if (id) setActiveSection(id);
        }
      });
    }, observerOptions);

    const sections = ['intro', 'intelligence', 'social', 'features', 'access'];
    sections.forEach((id) => {
      const section = document.getElementById(id);
      if (section) sectionObserver.observe(section);
    });

    return () => sectionObserver.disconnect();
  }, [isInitiated]);

  return (
    <main className="relative min-h-screen bg-background-primary text-text-primary selection:bg-modules-aly/30 overflow-x-hidden">
      {/* Background Micro-animations & Grid */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Subtle Grid Lines */}
        <div 
          className="absolute inset-0 opacity-[0.15]" 
          style={{ 
            backgroundImage: `
              linear-gradient(to right, var(--border-primary) 1px, transparent 1px),
              linear-gradient(to bottom, var(--border-primary) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            maskImage: 'radial-gradient(ellipse at center, black, transparent 80%)'
          }} 
        />

        {/* Lighting Effects */}
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.15, 0.25, 0.15],
            x: [0, 50, 0],
            y: [0, 30, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-5%] left-[10%] w-[40%] h-[40%] bg-modules-aly/20 rounded-full blur-[140px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
            x: [0, -50, 0],
            y: [0, -30, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 5 }}
          className="absolute top-[20%] right-[10%] w-[35%] h-[35%] bg-modules-track/20 rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] bg-modules-knowledge/15 rounded-full blur-[160px]" 
        />
        {/* Connected Intelligence Matrix */}
        <ConnectedNodes />

        {/* Center Spotlight */}
        <div className="absolute inset-x-0 top-0 h-[800px] bg-gradient-to-b from-modules-aly/5 via-transparent to-transparent pointer-events-none" />

        {/* Bottom Subtle Grid */}
        <div 
          className="absolute inset-x-0 bottom-0 h-[800px] opacity-[0.18]" 
          style={{ 
            backgroundImage: `
              linear-gradient(to right, var(--border-primary) 1px, transparent 1px),
              linear-gradient(to bottom, var(--border-primary) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            maskImage: 'linear-gradient(to top, black, transparent)'
          }} 
        />

        {/* OS Scanning Lines & Data Streams */}
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
          {/* Horizontal Scan Lines */}
          <motion.div 
            animate={{ y: ['0%', '1000%'] }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="w-full h-[1px] bg-gradient-to-r from-transparent via-modules-aly/20 to-transparent opacity-30"
          />
          <motion.div 
            animate={{ y: ['0%', '1000%'] }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear", delay: 7 }}
            className="w-full h-[1px] bg-gradient-to-r from-transparent via-modules-track/20 to-transparent opacity-20"
          />

          {/* Vertical Data Streams */}
          <motion.div 
            animate={{ x: ['0%', '1000%'] }}
            transition={{ duration: 35, repeat: Infinity, ease: "linear", delay: 3 }}
            className="h-full w-[1px] bg-gradient-to-b from-transparent via-modules-knowledge/20 to-transparent opacity-20 absolute top-0 left-0"
          />
          <motion.div 
            animate={{ x: ['0%', '1000%'] }}
            transition={{ duration: 45, repeat: Infinity, ease: "linear", delay: 12 }}
            className="h-full w-[1px] bg-gradient-to-b from-transparent via-modules-aly/10 to-transparent opacity-15 absolute top-0 left-0"
          />
        </div>
      </div>

      {/* Navigation Navbar */}
      <LandingNavbar activeSection={activeSection} />

      {/* Hero Terminal */}
      <section id="intro" className="relative px-6 overflow-hidden min-h-screen flex items-center justify-center pt-20">
        <div className="max-w-7xl mx-auto text-center relative z-10 w-full">
          <AnimatePresence mode="wait">
            {!isInitiated ? (
              <motion.div
                key="intro"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -40, scale: 0.95 }}
                transition={{ duration: 1.2, ease: "circOut" }}
                className="flex flex-col items-center justify-center"
              >
                <motion.div
                  initial={{ opacity: 0, letterSpacing: "1.2em" }}
                  animate={{ opacity: 1, letterSpacing: "0.6em" }}
                  transition={{ duration: 1.8, ease: "easeOut" }}
                  className="relative mb-8"
                >
                  <h1 className="text-[64px] sm:text-[84px] md:text-[150px] font-black leading-none tracking-tighter text-text-primary drop-shadow-[0_0_30px_rgba(186,117,23,0.1)]">
                    TAKDA<span className="text-modules-aly">.</span>
                  </h1>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 1.2 }}
                  className="flex flex-wrap justify-center gap-x-6 gap-y-3 mb-10"
                >
                  {["Task", "Annotate", "Knowledge", "Deliver", "Automate"].map((word, i) => (
                    <motion.span 
                      key={word}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1 + (i * 0.2), duration: 0.8 }}
                      className="text-[11px] md:text-sm font-black uppercase tracking-[0.25em] text-modules-aly"
                    >
                      {word}{i < 4 && <span className="ml-6 opacity-20 text-text-primary">.</span>}
                    </motion.span>
                  ))}
                </motion.div>

                <motion.p
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 0.6 }}
                   transition={{ delay: 1.8, duration: 1.5 }}
                   className="max-w-md mx-auto text-text-tertiary text-[10px] md:text-xs font-bold tracking-[0.1em] uppercase leading-[1.8]"
                >
                  One place for your tasks, notes, projects, and life. <br />
                  Powered by an AI that actually knows your context.
                </motion.p>
                
                {/* Initiation Progress Scannline */}
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "min(240px, 60vw)" }}
                    transition={{ delay: 0.2, duration: 4.8, ease: "linear" }}
                    className="h-[1px] bg-modules-aly/50 mt-12 md:mt-16 relative"
                  >
                  <motion.div 
                    animate={{ left: ["0%", "100%"] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[-3px] w-6 h-6 bg-modules-aly/15 rounded-full blur-lg"
                  />
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="main-ui"
                initial={{ opacity: 0, y: 50, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-border-primary bg-background-tertiary/50 text-[11px] font-bold uppercase tracking-widest text-modules-aly mb-10 shadow-inner">
                  <Sparkle size={16} weight="fill" />
                  <span>Your personal AI life assistant</span>
                </div>
                <h2 className="text-4xl sm:text-6xl md:text-7xl lg:text-[100px] font-black leading-[0.95] tracking-tighter mb-8 md:mb-10">
                  Work Smart. Live Well. <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-text-primary via-text-secondary to-text-tertiary">Stay Connected.</span>
                </h2>
                <p className="max-w-2xl mx-auto text-text-tertiary text-base sm:text-xl md:text-2xl font-medium leading-[1.6] mb-10 md:mb-14 opacity-80 px-4 md:px-0">
                  TAKDA is your AI‑powered Life OS, blending productivity with personal care. 
                  It organizes tasks, tracks projects, and even remembers the little things that make life meaningful.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
                  <Link href="/auth" className="w-full sm:w-auto flex items-center justify-center gap-3 bg-modules-aly text-white px-8 py-4 rounded-2xl font-bold text-base shadow-xl shadow-modules-aly/20 hover:scale-[1.02] active:scale-[0.98] transition-all group">
                    Get started free
                    <ArrowRight size={18} weight="bold" className="group-hover:translate-x-1.5 transition-transform" />
                  </Link>
                  <a href="#features" className="w-full sm:w-auto flex items-center justify-center gap-3 bg-background-tertiary border border-border-primary text-text-primary px-8 py-4 rounded-2xl font-bold text-base hover:bg-background-tertiary/80 transition-all">
                    See what's inside
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-text-tertiary/40"
        >
          <span className="text-[9px] font-black uppercase tracking-[0.3em]">Explore</span>
          <CaretDown size={20} />
        </motion.div>
      </section>

      {/* Module Showcase Interaction */}
      <section id="intelligence" className="min-h-screen flex items-center justify-center py-12 md:py-20 px-4 md:px-6">
        <ModuleShowcase />
      </section>

      {/* Social Proof Success Log */}
      <section id="social" className="min-h-screen flex items-center justify-center py-16 md:py-24 px-4 md:px-6 bg-background-secondary/30">
        <SocialProofRegistry />
      </section>

      {/* Features Grid */}
      <section id="features" className="min-h-screen flex items-center justify-center py-12 md:py-16 px-4 md:px-6 bg-background-primary/30 relative overflow-hidden">
         {/* Subtle Background Accent */}
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-modules-aly/5 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl mx-auto w-full">
          {/* Section Header */}
          <div className="mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-[1px] bg-modules-aly/40" />
                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-modules-aly">What&apos;s inside TAKDA</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter leading-none">
                Everything you need. <br />
                <span className="text-text-primary/40">Nothing you don&apos;t.</span>
              </h2>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                viewport={{ once: true }}
                className={`bg-background-tertiary border border-border-primary p-7 rounded-[28px] group hover:border-modules-aly/30 transition-all hover:shadow-2xl hover:shadow-modules-aly/5 flex flex-col justify-between min-h-[220px] ${feature.span}`}
              >
                <div>
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 border transition-all group-hover:scale-105"
                    style={{ backgroundColor: `${feature.color}10`, borderColor: `${feature.color}20` }}
                  >
                    <feature.icon size={24} style={{ color: feature.color }} weight="duotone" />
                  </div>
                  <h3 className="text-xl font-black mb-2 tracking-tight">{feature.title}</h3>
                  <p className="text-text-tertiary font-medium leading-normal text-xs md:text-sm max-w-[280px]">
                    {feature.desc}
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-border-primary/30 pt-4">
                  <div className="flex gap-1.5">
                    {[1, 2, 3].map((dot) => (
                      <div key={dot} className="w-1 h-1 rounded-full bg-border-primary group-hover:bg-modules-aly/40 transition-colors" />
                    ))}
                  </div>
                  <ArrowRight size={16} className="text-text-tertiary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final Access Enrollment */}
      <section id="access" className="min-h-screen flex items-center justify-center py-20 md:py-32 px-4 md:px-6">
        <AccessRegistry />
      </section>

      {/* Footer Branding */}
      <footer className="py-12 md:py-20 border-t border-border-primary px-4 md:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="flex items-center gap-3 opacity-50">
            <Sparkle size={20} color="var(--text-tertiary)" weight="fill" />
            <span className="text-[10px] font-bold tracking-[0.4em] text-text-tertiary">TAKDA LIFE OS</span>
          </div>
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest flex gap-8">
            <span>Privacy</span>
            <span>Terms</span>
            <span>© 2026</span>
          </p>
        </div>
      </footer>
    </main>
  );
}
