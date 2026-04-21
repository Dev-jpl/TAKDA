"use client";

import React, { useState } from 'react';
import { AppWindow, Trash, Plus, CaretRight } from '@phosphor-icons/react';
import { screensService, Screen } from '@/services/screens.service';

interface ScreensListProps {
  screens: Screen[];
  spaceId: string;
  userId: string | null;
  onOpen: (id: string) => void;
  onCreated: (screen: Screen) => void;
  onDeleted: (id: string) => void;
}

export function ScreensList({ screens, spaceId, userId, onOpen, onCreated, onDeleted }: ScreensListProps) {
  const [creating, setCreating] = useState(false);
  const [name, setName]         = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !userId) return;
    setCreating(true);
    try {
      const s = await screensService.createScreen(userId, name.trim(), spaceId);
      onCreated(s);
      setName('');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string, screenName: string) {
    if (!confirm(`Delete "${screenName}"? This can't be undone.`)) return;
    await screensService.deleteScreen(id);
    onDeleted(id);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Inline create */}
      <form onSubmit={handleCreate} className="flex items-center gap-3">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="New screen name…"
          className="flex-1 bg-background-secondary border border-border-primary rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-modules-aly/40 transition-all"
        />
        <button
          type="submit"
          disabled={!name.trim() || creating}
          className="flex items-center gap-2 bg-modules-aly/10 border border-modules-aly/20 text-modules-aly px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-modules-aly/20 transition-all disabled:opacity-40"
        >
          <Plus size={13} weight="bold" />
          Create
        </button>
      </form>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {screens.map(screen => (
          <div key={screen.id} className="relative group">
            <button
              onClick={() => onOpen(screen.id)}
              className="w-full bg-background-secondary border border-border-primary rounded-xl p-5 flex items-center gap-4 text-left hover:bg-background-tertiary/50 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-modules-aly/10 border border-modules-aly/20 flex items-center justify-center text-modules-aly shrink-0">
                <AppWindow size={20} weight="duotone" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-text-primary truncate">{screen.name}</p>
                <p className="text-[11px] text-text-tertiary mt-0.5">
                  {new Date(screen.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <CaretRight size={15} className="text-text-tertiary/40 group-hover:text-text-tertiary transition-colors shrink-0" />
            </button>

            <div className="absolute top-3.5 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={e => { e.stopPropagation(); handleDelete(screen.id, screen.name); }}
                className="p-1.5 rounded-lg bg-background-tertiary border border-border-primary text-text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-all"
              >
                <Trash size={13} />
              </button>
            </div>
          </div>
        ))}

        {screens.length === 0 && (
          <div className="col-span-full py-16 text-center">
            <AppWindow size={32} className="mx-auto text-text-tertiary/20 mb-3" />
            <p className="text-sm text-text-tertiary">No screens yet. Create one above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
