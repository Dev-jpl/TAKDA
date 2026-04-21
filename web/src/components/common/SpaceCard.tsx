"use client";

import React from 'react';
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
    <button
      onClick={onPress}
      className="w-full bg-background-secondary border border-border-primary rounded-xl p-5 flex items-center gap-4 text-left group transition-all hover:bg-background-tertiary/50 hover:border-border-primary/80"
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
      >
        <IconResolver icon={icon} size={24} color={color} weight="duotone" />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-sm leading-tight text-text-primary truncate">
          {name}
        </h3>
        <p className="text-xs text-text-tertiary mt-1 tracking-wide">
          {category || 'Life Domain'} &middot; {hubsCount} hubs
        </p>
      </div>

      <CaretRight size={16} className="text-text-tertiary/40 group-hover:text-text-tertiary shrink-0 transition-colors" />
    </button>
  );
};
