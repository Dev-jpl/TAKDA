"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { 
  ChartLineUp, 
  PencilSimple, 
  Database, 
  PaperPlaneRight, 
  Gear 
} from '@phosphor-icons/react';

export type ModuleKey = 'track' | 'annotate' | 'knowledge' | 'deliver' | 'automate';

interface ModuleSwitcherProps {
  activeModule: ModuleKey;
  onModuleChange: (module: ModuleKey) => void;
}

const modules = [
  { key: 'track' as ModuleKey, label: 'Track', icon: ChartLineUp, color: 'var(--modules-track)' },
  { key: 'annotate' as ModuleKey, label: 'Annotate', icon: PencilSimple, color: 'var(--modules-annotate)' },
  { key: 'knowledge' as ModuleKey, label: 'Knowledge', icon: Database, color: 'var(--modules-knowledge)' },
  { key: 'deliver' as ModuleKey, label: 'Deliver', icon: PaperPlaneRight, color: 'var(--modules-deliver)' },
  { key: 'automate' as ModuleKey, label: 'Automate', icon: Gear, color: 'var(--modules-automate)' },
];

export const ModuleSwitcher: React.FC<ModuleSwitcherProps> = ({ activeModule, onModuleChange }) => {
  return (
    <div className="flex items-center gap-1 p-1 bg-background-secondary border border-border-primary rounded-2xl w-fit mb-8">
      {modules.map(({ key, label, icon: Icon, color }) => {
        const isActive = activeModule === key;
        return (
          <button
            key={key}
            onClick={() => onModuleChange(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all relative group ${
              isActive 
                ? "text-text-primary" 
                : "text-text-tertiary hover:text-text-secondary hover:bg-background-tertiary/50"
            }`}
          >
            {isActive && (
              <motion.div 
                layoutId="active-module-pill"
                className="absolute inset-0 bg-background-tertiary border border-border-primary rounded-xl shadow-sm z-0"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <div 
              className="relative z-10 p-1.5 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
              style={{ backgroundColor: isActive ? `${color}15` : 'transparent' }}
            >
              <Icon 
                size={16} 
                weight={isActive ? "fill" : "regular"} 
                style={{ color: isActive ? color : 'currentColor' }} 
              />
            </div>
            <span className="relative z-10 text-xs font-bold uppercase tracking-wider">
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
