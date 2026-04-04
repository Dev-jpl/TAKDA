"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { 
  PuzzlePiece, 
  CaretRight,
  Clock,
  SquaresFour
} from '@phosphor-icons/react';

interface HubCardProps {
  name: string;
  description?: string;
  tasksCount?: number;
  onPress: () => void;
}

export const HubCard: React.FC<HubCardProps> = ({ 
  name, 
  description, 
  tasksCount = 0, 
  onPress 
}) => {
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onPress}
      className="w-full bg-background-secondary border border-border-primary rounded-2xl p-5 flex flex-col gap-4 text-left group transition-all hover:bg-background-tertiary hover:border-modules-track/40 shadow-sm"
    >
      <div className="flex items-center justify-between w-full">
        <div className="w-10 h-10 rounded-xl bg-modules-track/10 border border-modules-track/20 flex items-center justify-center text-modules-track group-hover:scale-110 transition-transform">
          <PuzzlePiece size={22} weight="duotone" />
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background-tertiary border border-border-primary text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
          <Clock size={12} />
          <span>Active</span>
        </div>
      </div>

      <div className="flex-1">
        <h3 className="font-bold text-lg text-text-primary group-hover:text-modules-track transition-colors">{name}</h3>
        <p className="text-xs text-text-tertiary mt-1 line-clamp-2 leading-relaxed">
          {description || "Identify and coordinate mission-critical objectives within this context."}
        </p>
      </div>

      <div className="pt-4 mt-auto border-t border-border-primary/50 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-text-tertiary font-bold text-[10px] uppercase tracking-widest">
          <SquaresFour size={14} />
          <span>{tasksCount} Missions</span>
        </div>
        <CaretRight size={18} className="text-text-tertiary group-hover:text-modules-track group-hover:translate-x-1 transition-all" />
      </div>
    </motion.button>
  );
};
