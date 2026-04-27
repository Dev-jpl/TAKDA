"use client";

import React from 'react';
import { Sparkle } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserProfile } from '@/contexts/UserProfileContext';

interface AlyFABProps {
  onClick: () => void;
  isOpen: boolean;
}

export const AlyFAB: React.FC<AlyFABProps> = ({ onClick, isOpen }) => {
  const { assistantName } = useUserProfile();
  return (
    <AnimatePresence>
      {!isOpen && (
        <motion.div
            className="fixed bottom-8 right-8 z-100"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
            <button
                onClick={onClick}
                className="relative group p-4 rounded-3xl shadow-2xl bg-modules-aly hover:scale-110 active:scale-95 transition-all duration-500 overflow-hidden"
            >
                {/* Pulse Effect */}
                <motion.div
                    animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 bg-white rounded-full pointer-events-none"
                />

                <div className="relative flex items-center gap-2">
                    <Sparkle 
                        size={28} 
                        className="text-white transition-colors duration-500" 
                        weight="duotone" 
                    />
                </div>

                {/* Hint Badge */}
                <div className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-modules-track opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-modules-track border-2 border-modules-aly"></span>
                </div>
            </button>

            {/* Action Tooltip */}
            <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="px-3 py-1.5 bg-background-secondary border border-border-primary rounded-lg shadow-xl shadow-black/40">
                    <p className="text-[10px] font-bold text-text-primary uppercase tracking-widest whitespace-nowrap flex items-center gap-2">
                        <Sparkle size={12} className="text-modules-aly" />
                        Ask {assistantName}
                    </p>
                </div>
            </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
