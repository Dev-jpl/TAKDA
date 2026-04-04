"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkle } from '@phosphor-icons/react';
import Link from 'next/link';

interface LandingNavbarProps {
  activeSection?: string;
}

export function LandingNavbar({ activeSection }: LandingNavbarProps) {
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
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between relative z-10 pointer-events-auto transform-gpu">
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
      </div>
    </nav>
  );
}
