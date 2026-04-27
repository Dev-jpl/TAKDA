"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  XIcon,
  RocketIcon,
  PuzzlePieceIcon,
  CubeIcon,
  TargetIcon,
  CompassIcon,
  CrosshairIcon,
  GraphIcon,
  FilesIcon,
  ListChecksIcon,
  PlusIcon,
  CircleIcon,
  CheckCircleIcon,
  PencilSimpleIcon,
  FileTextIcon,
  PaperPlaneRightIcon,
  GitBranchIcon,
  ForkKnifeIcon,
  CurrencyDollarIcon,
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
  { id: 'PuzzlePiece', icon: PuzzlePieceIcon },
  { id: 'Cube',        icon: CubeIcon },
  { id: 'Target',      icon: TargetIcon },
  { id: 'Compass',     icon: CompassIcon },
  { id: 'Crosshair',   icon: CrosshairIcon },
  { id: 'Graph',       icon: GraphIcon },
  { id: 'Files',       icon: FilesIcon },
  { id: 'ListChecks',  icon: ListChecksIcon },
  { id: 'Rocket',      icon: RocketIcon },
  { id: 'Circle',      icon: CircleIcon },
];

const COLORS = [
  { id: 'track',     value: '#7F77DD', label: 'Track' },
  { id: 'aly',       value: '#BA7517', label: 'Aly' },
  { id: 'knowledge', value: '#378ADD', label: 'Knowledge' },
  { id: 'deliver',   value: '#D85A30', label: 'Deliver' },
  { id: 'success',   value: '#1D9E75', label: 'Success' },
  { id: 'urgent',    value: '#E24B4A', label: 'Urgent' },
];

interface ModuleDef {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  group: 'core' | 'data';
}

const MODULE_CATALOG: ModuleDef[] = [
  { id: 'track',           label: 'Tasks',          description: 'Manage to-dos and missions',      icon: CheckCircleIcon,      color: 'var(--modules-track)',     group: 'core' },
  { id: 'annotate',        label: 'Notes',          description: 'Write and organize notes',         icon: PencilSimpleIcon,     color: 'var(--modules-aly)',       group: 'core' },
  { id: 'knowledge',       label: 'Resources',      description: 'Upload PDFs and links',            icon: FileTextIcon,         color: 'var(--modules-knowledge)', group: 'core' },
  { id: 'deliver',         label: 'Outcomes',       description: 'Track deliverables and goals',     icon: PaperPlaneRightIcon,  color: 'var(--modules-deliver)',   group: 'core' },
  { id: 'automate',        label: 'Automations',    description: 'Connect n8n workflows',            icon: GitBranchIcon,        color: '#a78bfa',                  group: 'core' },
  { id: 'calorie_counter', label: 'Calorie Counter',description: 'Log food and track calories',      icon: ForkKnifeIcon,        color: '#22c55e',                  group: 'data' },
  { id: 'expense_tracker', label: 'Expense Tracker',description: 'Log spending by category',         icon: CurrencyDollarIcon,   color: '#f59e0b',                  group: 'data' },
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
  const [name,            setName]            = useState('');
  const [selectedIcon,    setSelectedIcon]    = useState('PuzzlePiece');
  const [selectedColor,   setSelectedColor]   = useState('track');
  const [description,     setDescription]     = useState('');
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());
  const [saving,          setSaving]          = useState(false);

  if (!isOpen) return null;

  function toggleModule(id: string) {
    setSelectedModules(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const colorValue = COLORS.find(c => c.id === selectedColor)?.value || defaultColor;
      const coreModules = MODULE_CATALOG.filter(m => m.group === 'core' && selectedModules.has(m.id)).map(m => m.id);
      const addonModules = MODULE_CATALOG.filter(m => m.group === 'data' && selectedModules.has(m.id)).map(m => m.id);
      const newHub = await hubsService.createHub(
        spaceId, userId, name.trim(), description, selectedIcon, colorValue,
        coreModules, addonModules,
      );
      onCreated(newHub);
      onClose();
      setName(''); setSelectedIcon('PuzzlePiece'); setSelectedColor('track');
      setDescription(''); setSelectedModules(new Set());
    } catch (err) {
      console.error('Failed to create hub:', err);
    } finally {
      setSaving(false);
    }
  }

  const coreModules = MODULE_CATALOG.filter(m => m.group === 'core');
  const dataModules = MODULE_CATALOG.filter(m => m.group === 'data');

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-background-primary/80 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        className="relative w-full max-w-xl bg-background-secondary border border-border-primary rounded-xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-primary flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-modules-track/10 flex items-center justify-center border border-modules-track/20">
              <PlusIcon size={18} weight="bold" className="text-modules-track" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">New Hub</h2>
              <p className="text-[11px] text-text-tertiary">Add a focus area to this space</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-background-tertiary rounded-lg transition-all text-text-tertiary hover:text-text-primary"
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto flex flex-col gap-6">

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Name</label>
            <input
              autoFocus
              type="text"
              placeholder="e.g. Q3 Goals, Morning Routine…"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleCreate(); }}
              className="bg-background-tertiary border border-border-primary rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-modules-track/40 transition-all placeholder:text-text-tertiary"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
              Description <span className="normal-case font-normal">(optional)</span>
            </label>
            <textarea
              placeholder="What is this hub for?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="bg-background-tertiary border border-border-primary rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-modules-track/40 transition-all resize-none placeholder:text-text-tertiary"
            />
          </div>

          {/* Icon + Color */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Icon</label>
              <div className="grid grid-cols-5 gap-1.5 bg-background-tertiary p-2 rounded-xl border border-border-primary">
                {ICONS.map(item => {
                  const IconComp = item.icon;
                  const isSelected = selectedIcon === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedIcon(item.id)}
                      className={`p-2.5 rounded-lg flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-modules-track text-white'
                          : 'text-text-tertiary hover:text-text-primary hover:bg-background-secondary'
                      }`}
                    >
                      <IconComp size={16} weight={isSelected ? 'fill' : 'regular'} />
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
                      className={`h-9 rounded-lg flex items-center justify-center transition-all border-2 ${
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

          {/* Module selection */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Modules</label>
              {selectedModules.size > 0 && (
                <span className="text-[10px] text-text-tertiary">{selectedModules.size} selected</span>
              )}
            </div>
            <p className="text-xs text-text-tertiary -mt-1">Choose what this hub needs. You can add more later from the Marketplace.</p>

            <p className="text-[10px] font-semibold text-text-tertiary/60 uppercase tracking-widest">Core</p>
            <div className="grid grid-cols-2 gap-2">
              {coreModules.map(mod => {
                const Icon = mod.icon;
                const isOn = selectedModules.has(mod.id);
                return (
                  <button
                    key={mod.id}
                    onClick={() => toggleModule(mod.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                      isOn ? '' : 'border-border-primary hover:bg-background-tertiary'
                    }`}
                    style={isOn ? { borderColor: `${mod.color}50`, backgroundColor: `${mod.color}0d` } : {}}
                  >
                    <Icon
                      size={15}
                      weight={isOn ? 'fill' : 'regular'}
                      style={{ color: isOn ? mod.color : undefined }}
                      className={isOn ? '' : 'text-text-tertiary'}
                    />
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold leading-none ${isOn ? '' : 'text-text-secondary'}`}
                        style={isOn ? { color: mod.color } : {}}>
                        {mod.label}
                      </p>
                      <p className="text-[10px] text-text-tertiary leading-tight mt-0.5 truncate">{mod.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="text-[10px] font-semibold text-text-tertiary/60 uppercase tracking-widest mt-1">Data Tracking</p>
            <div className="grid grid-cols-2 gap-2">
              {dataModules.map(mod => {
                const Icon = mod.icon;
                const isOn = selectedModules.has(mod.id);
                return (
                  <button
                    key={mod.id}
                    onClick={() => toggleModule(mod.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                      isOn ? '' : 'border-border-primary hover:bg-background-tertiary'
                    }`}
                    style={isOn ? { borderColor: `${mod.color}50`, backgroundColor: `${mod.color}0d` } : {}}
                  >
                    <Icon
                      size={15}
                      weight={isOn ? 'fill' : 'regular'}
                      style={{ color: isOn ? mod.color : undefined }}
                      className={isOn ? '' : 'text-text-tertiary'}
                    />
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold leading-none ${isOn ? '' : 'text-text-secondary'}`}
                        style={isOn ? { color: mod.color } : {}}>
                        {mod.label}
                      </p>
                      <p className="text-[10px] text-text-tertiary leading-tight mt-0.5 truncate">{mod.description}</p>
                    </div>
                  </button>
                );
              })}
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
            className="flex items-center gap-2 px-6 py-2 rounded-xl font-bold text-sm bg-modules-track text-white hover:bg-modules-track/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <PlusIcon size={15} weight="bold" />
            )}
            Create Hub
          </button>
        </div>
      </motion.div>
    </div>
  );
};
