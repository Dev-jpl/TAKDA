"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Rocket, 
  PuzzlePiece, 
  Cube, 
  Target, 
  Compass, 
  Crosshair, 
  Strategy, 
  Graph, 
  Files, 
  ListChecks,
  Plus,
  Circle
} from '@phosphor-icons/react';
import { Hub, hubsService as hubsServiceType } from '@/services/hubs.service';

interface CreateHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (hub: Hub) => void;
  userId: string;
  spaceId: string;
  defaultColor?: string;
  hubsService: typeof hubsServiceType;
}

const ICONS = [
  { id: 'PuzzlePiece', icon: PuzzlePiece },
  { id: 'Cube', icon: Cube },
  { id: 'Target', icon: Target },
  { id: 'Compass', icon: Compass },
  { id: 'Crosshair', icon: Crosshair },
  { id: 'Strategy', icon: Strategy },
  { id: 'Graph', icon: Graph },
  { id: 'Files', icon: Files },
  { id: 'ListChecks', icon: ListChecks },
  { id: 'Rocket', icon: Rocket },
  { id: 'Circle', icon: Circle },
];

const COLORS = [
  { id: 'track', value: '#7F77DD', label: 'Track' },
  { id: 'aly', value: '#BA7517', label: 'Aly' },
  { id: 'knowledge', value: '#378ADD', label: 'Knowledge' },
  { id: 'deliver', value: '#D85A30', label: 'Deliver' },
  { id: 'success', value: '#1D9E75', label: 'Success' },
  { id: 'urgent', value: '#E24B4A', label: 'Urgent' },
];

export const CreateHubModal: React.FC<CreateHubModalProps> = ({ 
  isOpen, 
  onClose, 
  onCreated, 
  userId,
  spaceId,
  defaultColor = '#7F77DD',
  hubsService 
}) => {
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('PuzzlePiece');
  const [selectedColor, setSelectedColor] = useState('track');
  const [description, setDescription] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);

  if (!isOpen) return null;

  const handleDeploy = async () => {
    if (!name.trim()) return;
    
    setIsDeploying(true);
    try {
      const colorValue = COLORS.find(c => c.id === selectedColor)?.value || defaultColor;
      const newHub = await hubsService.createHub(
        spaceId,
        userId,
        name,
        description,
        selectedIcon,
        colorValue
      );
      onCreated(newHub);
      onClose();
      // Reset state
      setName('');
      setSelectedIcon('PuzzlePiece');
      setSelectedColor('track');
      setDescription('');
    } catch (err) {
      console.error('Hub Deployment failure:', err);
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
        className="relative w-full max-w-xl bg-background-secondary border border-border-primary/50 rounded-3xl shadow-2xl overflow-hidden shadow-modules-track/5"
      >
        {/* Header */}
        <div className="p-6 border-b border-border-primary/50 flex items-center justify-between bg-background-tertiary/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-modules-track/20 flex items-center justify-center border border-modules-track/30 shadow-lg shadow-modules-track/10">
              <Plus size={24} weight="bold" className="text-modules-track" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary leading-tight">Initialize Focus Hub</h2>
              <p className="text-text-tertiary text-[11px] uppercase tracking-widest font-bold">New Mission Registry</p>
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
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest ml-1">Hub Identifier</label>
                <input 
                  autoFocus
                  type="text" 
                  placeholder="e.g. Project 'Takda'..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-background-tertiary border border-border-primary rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-modules-track/50 focus:border-modules-track/50 transition-all font-bold placeholder:text-text-tertiary/30"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest ml-1">Context Intelligence (Objectives)</label>
                <textarea 
                  placeholder="Define area mission parameters..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-background-tertiary border border-border-primary rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-modules-track/50 focus:border-modules-track/50 transition-all font-medium h-24 resize-none placeholder:text-text-tertiary/30"
                />
              </div>
            </div>

            {/* Visual Coordinates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Icon Picker */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest ml-1">Tactical Symbol</label>
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
                            ? 'bg-modules-track text-white shadow-lg shadow-modules-track/20' 
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
                <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest ml-1">Mission Color</label>
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
            Intelligence modules automatically synchronized. Focus registry ready.
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
                  : 'bg-modules-track text-white hover:bg-modules-track/90 shadow-modules-track/20 active:scale-95'}
              `}
            >
              {isDeploying ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Target size={18} weight="bold" />
              )}
              Initialize Hub
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
