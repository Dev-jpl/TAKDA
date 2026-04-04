"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { CaretRight } from '@phosphor-icons/react';
import { IconResolver } from './IconResolver';

interface SpaceCardProps {
  name: string;
  category?: string;
  icon?: string;
  color: string;
  hubsCount?: number;
  onPress: () => void;
  onLongPress?: () => void;
}

export const SpaceCard: React.FC<SpaceCardProps> = ({ 
  name, 
  category, 
  icon = 'Folder', 
  color, 
  hubsCount = 0, 
  onPress,
}) => {
  return (
    <motion.button 
      layout
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onPress}
      className="w-full bg-background-secondary border border-border-primary rounded-2xl p-5 flex items-center gap-5 text-left group transition-all hover:bg-background-tertiary/50 hover:border-modules-aly/30"
    >
      <div 
        className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105"
        style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
      >
        <IconResolver icon={icon} size={28} color={color} weight="duotone" />
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-lg leading-tight text-text-primary group-hover:text-modules-aly transition-colors truncate">
          {name}
        </h3>
        <p className="text-xs text-text-tertiary mt-1 font-medium tracking-wide">
          {category || 'Life Domain'} • {hubsCount} Working Hubs
        </p>
      </div>
      
      <div className="text-text-tertiary/40 group-hover:text-modules-aly transition-all translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100">
        <CaretRight size={20} weight="bold" />
      </div>
    </motion.button>
  );
};
