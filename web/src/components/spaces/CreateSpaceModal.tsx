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
  { id: 'personal',     label: 'Personal' },
  { id: 'health',       label: 'Health' },
  { id: 'finance',      label: 'Finance' },
  { id: 'growth',       label: 'Growth' },
];

const ICONS = [
  { id: 'Buildings', icon: Buildings },
  { id: 'Briefcase', icon: Briefcase },
  { id: 'Heart',     icon: Heart },
  { id: 'Wallet',    icon: Wallet },
  { id: 'Book',      icon: Book },
  { id: 'Code',      icon: Code },
  { id: 'Palette',   icon: Palette },
  { id: 'Flask',     icon: Flask },
  { id: 'Leaf',      icon: Leaf },
  { id: 'Globe',     icon: Globe },
  { id: 'Rocket',    icon: Rocket },
];

const COLORS = [
  { id: 'track',     value: '#7F77DD', label: 'Track' },
  { id: 'aly',       value: '#BA7517', label: 'Aly' },
  { id: 'knowledge', value: '#378ADD', label: 'Knowledge' },
  { id: 'deliver',   value: '#D85A30', label: 'Deliver' },
  { id: 'success',   value: '#1D9E75', label: 'Success' },
  { id: 'urgent',    value: '#E24B4A', label: 'Urgent' },
];

export const CreateSpaceModal: React.FC<CreateSpaceModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  userId,
  spacesService
}) => {
  const [name,          setName]          = useState('');
  const [category,      setCategory]      = useState('personal');
  const [selectedIcon,  setSelectedIcon]  = useState('Buildings');
  const [selectedColor, setSelectedColor] = useState('track');
  const [description,   setDescription]  = useState('');
  const [saving,        setSaving]        = useState(false);

  if (!isOpen) return null;

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const colorValue = COLORS.find(c => c.id === selectedColor)?.value || '#7F77DD';
      const newSpace = await spacesService.createSpace(
        userId, name.trim(), category, description, selectedIcon, colorValue
      );
      onCreated(newSpace);
      onClose();
      setName(''); setCategory('personal'); setSelectedIcon('Buildings');
      setSelectedColor('track'); setDescription('');
    } catch (err) {
      console.error('Failed to create space:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-background-primary/80 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        className="relative w-full max-w-xl bg-background-secondary border border-border-primary rounded-xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-primary flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-modules-aly/10 flex items-center justify-center border border-modules-aly/20">
              <Plus size={18} weight="bold" className="text-modules-aly" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">New Space</h2>
              <p className="text-[11px] text-text-tertiary">Create a new life domain</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-background-tertiary rounded-lg transition-all text-text-tertiary hover:text-text-primary"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto flex flex-col gap-6">

          {/* Name + Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Name</label>
              <input
                autoFocus
                type="text"
                placeholder="e.g. Work, Fitness…"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
                className="bg-background-tertiary border border-border-primary rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-modules-aly/40 transition-all placeholder:text-text-tertiary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="bg-background-tertiary border border-border-primary rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-modules-aly/40 transition-all appearance-none cursor-pointer"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
              Description <span className="normal-case font-normal">(optional)</span>
            </label>
            <textarea
              placeholder="What is this space for?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="bg-background-tertiary border border-border-primary rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-modules-aly/40 transition-all resize-none placeholder:text-text-tertiary"
            />
          </div>

          {/* Icon + Color */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Icon</label>
              <div className="grid grid-cols-4 gap-1.5 bg-background-tertiary p-2 rounded-xl border border-border-primary">
                {ICONS.map(item => {
                  const IconComp = item.icon;
                  const isSelected = selectedIcon === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedIcon(item.id)}
                      className={`p-2.5 rounded-lg flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-modules-aly text-white'
                          : 'text-text-tertiary hover:text-text-primary hover:bg-background-secondary'
                      }`}
                    >
                      <IconComp size={18} weight={isSelected ? 'fill' : 'regular'} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Color</label>
              <div className="grid grid-cols-3 gap-2 bg-background-tertiary p-2 rounded-xl border border-border-primary">
                {COLORS.map(color => {
                  const isSelected = selectedColor === color.id;
                  return (
                    <button
                      key={color.id}
                      onClick={() => setSelectedColor(color.id)}
                      title={color.label}
                      className={`h-10 rounded-lg flex items-center justify-center transition-all border-2 ${
                        isSelected ? 'border-white/50' : 'border-transparent opacity-60 hover:opacity-90'
                      }`}
                      style={{ backgroundColor: color.value }}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-primary flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-bold text-text-tertiary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!name.trim() || saving}
            onClick={handleCreate}
            className="flex items-center gap-2 px-6 py-2 rounded-xl font-bold text-sm bg-modules-aly text-white hover:bg-modules-aly/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Plus size={15} weight="bold" />
            )}
            Create Space
          </button>
        </div>
      </motion.div>
    </div>
  );
};
