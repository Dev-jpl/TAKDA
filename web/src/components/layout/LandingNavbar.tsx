import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkle, List, X } from '@phosphor-icons/react';
import Link from 'next/link';

interface LandingNavbarProps {
  activeSection?: string;
}

export function LandingNavbar({ activeSection }: LandingNavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const sections = [
    { name: 'Intro', id: 'intro', href: '/#intro' },
    { name: 'Intelligence', id: 'intelligence', href: '/#intelligence' },
    { name: 'Social', id: 'social', href: '/#social' },
    { name: 'Features', id: 'features', href: '/#features' },
    { name: 'Access', id: 'access', href: '/#access' }
  ];

  return (
    <nav className="fixed top-0 w-full z-[100] h-32 pointer-events-none">
      {/* Layer 0: Progressive Soft Blur Background (Strictly Behind) */}
      <div 
        className="absolute inset-0 bg-background-primary/5 backdrop-blur-xl pointer-events-none z-0"
        style={{
          maskImage: 'linear-gradient(to bottom, black 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)'
        }}
      />
      
      {/* Layer 1: Interactive Content (Strictly In Front) */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between relative z-10 pointer-events-auto transform-gpu">
        <Link href="/" className="flex items-center gap-3 group cursor-pointer">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-modules-aly/10 flex items-center justify-center border-[0.5px] border-modules-aly/20 group-hover:border-modules-aly/40 transition-all">
              <Sparkle size={20} color="var(--modules-aly)" weight="fill" />
            </div>
            <span className="text-[11px] font-medium tracking-[0.5em] text-text-primary">TAKDA</span>
          </motion.div>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-10">
          {sections.map((item) => {
            const isActive = activeSection === item.id;
            
            return (
              <motion.a
                key={item.name}
                href={item.href}
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.95 }}
                className={`text-[10px] font-medium uppercase tracking-widest transition-all relative group ${
                  isActive ? 'text-text-primary' : 'text-text-primary/40 hover:text-text-primary/70'
                }`}
              >
                {item.name}
                <motion.span 
                  initial={false}
                  animate={{ 
                    width: isActive ? '100%' : '0%',
                    opacity: isActive ? 1 : 0 
                  }}
                  className="absolute -bottom-1 left-0 h-[1.5px] bg-modules-aly rounded-full transition-all duration-300"
                />
                {!isActive && (
                  <motion.span 
                    className="absolute -bottom-1 left-0 w-0 h-[1px] bg-modules-aly/40 group-hover:w-full transition-all duration-300 rounded-full"
                  />
                )}
              </motion.a>
            );
          })}
          
          <Link href="/auth">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 bg-text-primary text-background-primary px-6 py-2 rounded-full font-medium text-[10px] uppercase tracking-widest shadow-none"
            >
              Launch OS
            </motion.div>
          </Link>
        </div>

        {/* Mobile Hamburger Trigger */}
        <button 
          onClick={() => setIsMenuOpen(true)}
          className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-background-tertiary border border-border-primary text-text-primary active:scale-95 transition-all"
        >
          <List size={20} weight="bold" />
        </button>
      </div>

      {/* Mobile Side Drawer Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-background-primary/40 backdrop-blur-md z-[110] pointer-events-auto"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-[280px] bg-background-secondary border-l border-border-primary z-[120] pointer-events-auto flex flex-col p-8"
            >
              <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-3">
                  <Sparkle size={20} className="text-modules-aly" weight="fill" />
                  <span className="text-xs font-black tracking-[0.3em] text-text-primary">REGISTRY</span>
                </div>
                <button 
                  onClick={() => setIsMenuOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-background-tertiary text-text-tertiary hover:text-text-primary transition-colors"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>

              <div className="flex flex-col gap-6 px-2">
                {sections.map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <Link 
                      key={item.id}
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`relative transition-all flex items-center group ${
                        isActive 
                          ? 'text-modules-aly font-medium tracking-widest' 
                          : 'text-text-tertiary font-medium hover:text-text-primary tracking-[0.15em]'
                      }`}
                    >
                      <div className={`absolute -left-4 w-1.5 h-1.5 rounded-full bg-modules-aly shadow-[0_0_10px_rgba(255,107,38,0.8)] transition-all ${
                        isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
                      }`} />
                      <span className="text-xs uppercase">{item.name}</span>
                    </Link>
                  );
                })}
              </div>

              <div className="mt-auto">
                <Link 
                  href="/auth"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full py-4 bg-modules-aly text-white rounded-2xl font-bold text-center tracking-widest text-xs uppercase shadow-xl shadow-modules-aly/20 block"
                >
                  Initiate Terminal
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}
