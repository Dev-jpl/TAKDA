"use client";

import React from 'react';
import {
  PuzzlePiece,
  CaretRight,
  CheckSquare,
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
  onPress,
}) => {
  return (
    <button
      onClick={onPress}
      className="w-full bg-background-secondary border border-border-primary rounded-xl p-5 flex flex-col gap-3 text-left group transition-all hover:bg-background-tertiary/50 hover:border-border-primary/80"
    >
      <div className="flex items-center justify-between w-full">
        <div className="w-10 h-10 rounded-xl bg-modules-track/10 border border-modules-track/20 flex items-center justify-center text-modules-track">
          <PuzzlePiece size={20} weight="duotone" />
        </div>
        <span className="px-2 py-0.5 rounded-lg bg-background-tertiary border border-border-primary text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
          Active
        </span>
      </div>

      <div className="flex-1">
        <h3 className="font-bold text-sm text-text-primary group-hover:text-modules-track transition-colors">{name}</h3>
        <p className="text-xs text-text-tertiary mt-1 line-clamp-2 leading-relaxed">
          {description || 'No description.'}
        </p>
      </div>

      <div className="pt-3 border-t border-border-primary/50 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-text-tertiary text-[10px] font-bold uppercase tracking-widest">
          <CheckSquare size={13} />
          <span>{tasksCount} Tasks</span>
        </div>
        <CaretRight size={15} className="text-text-tertiary/40 group-hover:text-modules-track transition-colors" />
      </div>
    </button>
  );
};
