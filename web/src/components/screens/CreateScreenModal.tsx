"use client";

import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { screensService, Screen, LayoutType } from '@/services/screens.service';
import { Space } from '@/services/spaces.service';
import { AppWindowIcon, SquaresFourIcon, InfinityIcon } from '@phosphor-icons/react';

interface CreateScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaces: Space[];
  userId: string;
  onCreated: (screen: Screen) => void;
}

const inputCls = "w-full bg-background-tertiary border border-border-primary rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-modules-aly/40 transition-all placeholder:text-text-tertiary";

const LAYOUT_OPTIONS: { type: LayoutType; label: string; description: string; Icon: React.ElementType }[] = [
  {
    type: 'grid',
    label: 'Grid',
    description: 'Widgets snap to a responsive column grid.',
    Icon: SquaresFourIcon,
  },
  {
    type: 'canvas',
    label: 'Canvas',
    description: 'Free-form infinite canvas — place widgets anywhere.',
    Icon: InfinityIcon,
  },
];

export function CreateScreenModal({ isOpen, onClose, spaces, userId, onCreated }: CreateScreenModalProps) {
  const [name,       setName]       = useState('');
  const [spaceId,    setSpaceId]    = useState('');
  const [layoutType, setLayoutType] = useState<LayoutType>('grid');
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const screen = await screensService.createScreen(userId, name.trim(), spaceId || undefined, layoutType);
      onCreated(screen);
      setName(''); setSpaceId(''); setLayoutType('grid');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create screen. Check that migrations have been applied.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Screen" subtitle="Create a custom dashboard">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Layout type picker */}
        <div>
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-2">Layout</p>
          <div className="grid grid-cols-2 gap-2">
            {LAYOUT_OPTIONS.map(opt => (
              <button
                key={opt.type}
                type="button"
                onClick={() => setLayoutType(opt.type)}
                className={`flex flex-col items-start gap-2 p-3.5 rounded-xl border text-left transition-all ${
                  layoutType === opt.type
                    ? 'border-modules-aly/50 bg-modules-aly/8 text-modules-aly'
                    : 'border-border-primary bg-background-tertiary text-text-tertiary hover:border-modules-aly/20'
                }`}
              >
                <opt.Icon size={20} weight={layoutType === opt.type ? 'fill' : 'duotone'} />
                <div>
                  <p className="text-xs font-bold text-text-primary">{opt.label}</p>
                  <p className="text-[10px] text-text-tertiary leading-tight mt-0.5">{opt.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest block mb-1.5">Name</label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="My Dashboard…"
            className={inputCls}
          />
        </div>

        {/* Space link */}
        <div>
          <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest block mb-1.5">
            Link to space <span className="normal-case font-normal">(optional)</span>
          </label>
          <select
            value={spaceId}
            onChange={e => setSpaceId(e.target.value)}
            className={inputCls}
          >
            <option value="">None — cross-space screen</option>
            {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <p className="text-[11px] text-text-tertiary mt-1.5">
            Cross-space screens can pull data from any space.
          </p>
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!name.trim() || saving}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-modules-aly text-white text-sm font-bold disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          <AppWindowIcon size={15} weight="bold" />
          {saving ? 'Creating…' : `Create ${layoutType === 'canvas' ? 'Canvas' : 'Grid'} Screen`}
        </button>
      </form>
    </Modal>
  );
}
