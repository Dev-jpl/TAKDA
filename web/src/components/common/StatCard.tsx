"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="bg-background-secondary border border-border-primary rounded-xl p-4 flex items-center gap-3 relative overflow-hidden group transition-all hover:border-border-primary/80"
    >
      <div 
        className="absolute left-0 top-0 w-1 h-full" 
        style={{ backgroundColor: color }} 
      />
      
      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-background-tertiary border border-border-primary text-text-primary group-hover:scale-110 transition-transform">
        {icon}
      </div>
      
      <div>
        <p className="text-[9px] text-text-tertiary uppercase tracking-[0.1em] mb-0.5 font-bold">
          {label}
        </p>
        <p className="text-sm font-bold text-text-primary flex items-center gap-1">
          <span style={{ color }}>{value}</span>
        </p>
      </div>
    </motion.div>
  );
};
