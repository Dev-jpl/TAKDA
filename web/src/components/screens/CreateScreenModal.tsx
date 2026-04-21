"use client";

import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { screensService, Screen } from '@/services/screens.service';
import { Space } from '@/services/spaces.service';
import { AppWindowIcon } from '@phosphor-icons/react';

interface CreateScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaces: Space[];
  userId: string;
  onCreated: (screen: Screen) => void;
}

const inputCls = "w-full bg-background-tertiary border border-border-primary rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-modules-aly/40 transition-all placeholder:text-text-tertiary";

export function CreateScreenModal({ isOpen, onClose, spaces, userId, onCreated }: CreateScreenModalProps) {
  const [name,    setName]    = useState('');
  const [spaceId, setSpaceId] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const screen = await screensService.createScreen(userId, name.trim(), spaceId || undefined);
      onCreated(screen);
      setName(''); setSpaceId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create screen. Check that the database migrations have been applied.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Screen" subtitle="Create a custom dashboard">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

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
            Cross-space screens can pull data from any space. Space-linked screens appear in that space&apos;s Screens tab.
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
          {saving ? 'Creating…' : 'Create Screen'}
        </button>
      </form>
    </Modal>
  );
}
