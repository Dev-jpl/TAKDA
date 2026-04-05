"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Rocket, 
  Heart, 
  Buildings, 
  Book, 
  Wallet, 
  Code, 
  Palette, 
  Flask, 
  Leaf, 
  Briefcase, 
  Globe,
  Plus
} from '@phosphor-icons/react';
import { Space, spacesService as spacesServiceType } from '@/services/spaces.service';

interface CreateSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (space: Space) => void;
  userId: string;
  spacesService: typeof spacesServiceType;
}

const CATEGORIES = [
  { id: 'professional', label: 'Professional' },
  { id: 'personal', label: 'Personal' },
  { id: 'health', label: 'Health' },
  { id: 'finance', label: 'Finance' },
  { id: 'growth', label: 'Growth' },
];

const ICONS = [
  { id: 'Buildings', icon: Buildings },
  { id: 'Briefcase', icon: Briefcase },
  { id: 'Heart', icon: Heart },
  { id: 'Wallet', icon: Wallet },
  { id: 'Book', icon: Book },
  { id: 'Code', icon: Code },
  { id: 'Palette', icon: Palette },
  { id: 'Flask', icon: Flask },
  { id: 'Leaf', icon: Leaf },
  { id: 'Globe', icon: Globe },
  { id: 'Rocket', icon: Rocket },
];

const COLORS = [
  { id: 'track', value: '#7F77DD', label: 'Track' },
  { id: 'aly', value: '#BA7517', label: 'Aly' },
  { id: 'knowledge', value: '#378ADD', label: 'Knowledge' },
  { id: 'deliver', value: '#D85A30', label: 'Deliver' },
  { id: 'success', value: '#1D9E75', label: 'Success' },
  { id: 'urgent', value: '#E24B4A', label: 'Urgent' },
];

export const CreateSpaceModal: React.FC<CreateSpaceModalProps> = ({ 
  isOpen, 
  onClose, 
  onCreated, 
  userId,
  spacesService 
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('personal');
  const [selectedIcon, setSelectedIcon] = useState('Buildings');
  const [selectedColor, setSelectedColor] = useState('track');
  const [description, setDescription] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);

  if (!isOpen) return null;

  const handleDeploy = async () => {
    if (!name.trim()) return;
    
    setIsDeploying(true);
    try {
      const colorValue = COLORS.find(c => c.id === selectedColor)?.value || '#7F77DD';
      const newSpace = await spacesService.createSpace(
        userId,
        name,
        category,
        description,
        selectedIcon,
        colorValue
      );
      onCreated(newSpace);
      onClose();
      // Reset state
      setName('');
      setCategory('personal');
      setSelectedIcon('Buildings');
      setSelectedColor('track');
      setDescription('');
    } catch (err) {
      console.error('Deployment failure:', err);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-background-primary/80 backdrop-blur-sm"
      />

      {/* Modal Content */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-xl bg-background-secondary border border-border-primary/50 rounded-3xl shadow-2xl overflow-hidden shadow-modules-aly/5"
      >
        {/* Header */}
        <div className="p-6 border-b border-border-primary/50 flex items-center justify-between bg-background-tertiary/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-modules-aly/20 flex items-center justify-center border border-modules-aly/30 shadow-lg shadow-modules-aly/10">
              <Plus size={24} weight="bold" className="text-modules-aly" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary leading-tight">Initialize Domain</h2>
              <p className="text-text-tertiary text-[11px] uppercase tracking-widest font-bold">New Oversight Coordinate</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-background-tertiary rounded-xl transition-all text-text-tertiary hover:text-text-primary"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="space-y-8">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest ml-1">Domain Name</label>
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="Enter space identifier..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-background-tertiary border border-border-primary rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-modules-aly/50 focus:border-modules-aly/50 transition-all font-bold placeholder:text-text-tertiary/30"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest ml-1">Category</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-background-tertiary border border-border-primary rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-modules-aly/50 focus:border-modules-aly/50 transition-all font-bold text-text-primary appearance-none cursor-pointer"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest ml-1">Mission Parameters (Optional)</label>
                <textarea 
                  placeholder="Define domain objectives..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-background-tertiary border border-border-primary rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-modules-aly/50 focus:border-modules-aly/50 transition-all font-medium h-24 resize-none placeholder:text-text-tertiary/30"
                />
              </div>
            </div>

            {/* Visual Coordinates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Icon Picker */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest ml-1">Icon Representation</label>
                <div className="grid grid-cols-4 gap-2 bg-background-tertiary/30 p-2 rounded-2xl border border-border-primary/30">
                  {ICONS.map(item => {
                    const IconComp = item.icon;
                    const isSelected = selectedIcon === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelectedIcon(item.id)}
                        className={`
                          p-3 rounded-xl flex items-center justify-center transition-all group
                          ${isSelected 
                            ? 'bg-modules-aly text-white shadow-lg shadow-modules-aly/20' 
                            : 'bg-background-tertiary text-text-tertiary hover:text-text-primary hover:bg-background-tertiary/80'}
                        `}
                      >
                        <IconComp size={20} weight={isSelected ? "fill" : "bold"} className="group-hover:scale-110 transition-transform" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Picker */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest ml-1">Tactical Color</label>
                <div className="grid grid-cols-3 gap-3 bg-background-tertiary/30 p-3 rounded-2xl border border-border-primary/30 h-full max-h-[148px]">
                  {COLORS.map(color => {
                    const isSelected = selectedColor === color.id;
                    return (
                      <button
                        key={color.id}
                        onClick={() => setSelectedColor(color.id)}
                        className={`
                          h-full rounded-xl flex items-center justify-center transition-all group border-2
                          ${isSelected 
                            ? 'border-white/40 shadow-lg shadow-black/20' 
                            : 'border-transparent opacity-60 hover:opacity-100'}
                        `}
                        style={{ backgroundColor: color.value }}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-background-tertiary/30 border-t border-border-primary/50 flex items-center justify-between">
          <p className="text-[9px] text-text-tertiary uppercase font-black tracking-[0.2em] max-w-[240px]">
            Domain initialization requires registry clearance. Verify all coordinates.
          </p>
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-3 text-sm font-bold text-text-tertiary hover:text-text-primary transition-colors"
            >
              Abort
            </button>
            <button 
              disabled={!name.trim() || isDeploying}
              onClick={handleDeploy}
              className={`
                flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-xl
                ${!name.trim() || isDeploying
                  ? 'bg-background-tertiary text-text-tertiary cursor-not-allowed opacity-50 shadow-none'
                  : 'bg-modules-aly text-white hover:bg-modules-aly/90 shadow-modules-aly/20 active:scale-95'}
              `}
            >
              {isDeploying ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Rocket size={18} weight="bold" />
              )}
              Initialize Space
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
