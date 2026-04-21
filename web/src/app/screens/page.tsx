"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, AppWindow, Sparkle, MagnifyingGlass, Trash, FolderOpen } from '@phosphor-icons/react';
import { supabase } from '@/services/supabase';
import { screensService, Screen } from '@/services/screens.service';
import { spacesService, Space } from '@/services/spaces.service';
import { CreateScreenModal } from '@/components/screens/CreateScreenModal';

export default function ScreensPage() {
  const router = useRouter();

  const [screens,       setScreens]       = useState<Screen[]>([]);
  const [spaces,        setSpaces]        = useState<Space[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [userId,        setUserId]        = useState<string | null>(null);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [createOpen,    setCreateOpen]    = useState(false);

  const spaceMap = useMemo(
    () => Object.fromEntries(spaces.map(s => [s.id, s])),
    [spaces],
  );

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      const [userScreens, userSpaces] = await Promise.all([
        screensService.getUserScreens(user.id),
        spacesService.getSpaces(user.id),
      ]);
      setScreens(userScreens);
      setSpaces(userSpaces);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() =>
    screens.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [screens, searchQuery],
  );

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This can't be undone.`)) return;
    await screensService.deleteScreen(id);
    setScreens(prev => prev.filter(s => s.id !== id));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
          <Sparkle size={28} color="var(--modules-aly)" />
        </motion.div>
      </div>
    );
  }

  return (
    <main className="p-6 lg:p-12">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Screens</h1>
          <p className="text-text-tertiary text-sm mt-1">Custom dashboards pulling data from any space.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <MagnifyingGlass size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search screens…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-background-secondary border border-border-primary rounded-xl py-2 pl-8 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-modules-aly/40 transition-all w-52 placeholder:text-text-tertiary text-text-primary"
            />
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 bg-modules-aly/10 border border-modules-aly/20 text-modules-aly px-5 py-2 rounded-xl font-bold text-xs hover:bg-modules-aly/20 transition-all"
          >
            <Plus size={14} weight="bold" />
            New Screen
          </button>
        </div>
      </header>

      {/* ── Grid ────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filtered.map(screen => {
            const parentSpace = screen.space_id ? spaceMap[screen.space_id] : null;
            return (
              <motion.div
                key={screen.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="relative group"
              >
                <button
                  onClick={() => router.push(`/screens/${screen.id}`)}
                  className="w-full bg-background-secondary border border-border-primary rounded-xl p-5 flex items-start gap-4 text-left hover:bg-background-tertiary/50 hover:border-modules-aly/20 transition-all"
                >
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-modules-aly/10 border border-modules-aly/20 flex items-center justify-center text-modules-aly shrink-0 mt-0.5">
                    <AppWindow size={18} weight="duotone" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-text-primary truncate">{screen.name}</p>

                    {/* Source space badge */}
                    {parentSpace ? (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <FolderOpen size={11} className="text-text-tertiary shrink-0" />
                        <span
                          className="text-[10px] font-bold truncate"
                          style={{ color: parentSpace.color }}
                        >
                          {parentSpace.name}
                        </span>
                      </div>
                    ) : (
                      <p className="text-[10px] text-text-tertiary mt-1.5 font-medium">Cross-space</p>
                    )}

                    <p className="text-[10px] text-text-tertiary mt-1">
                      {new Date(screen.created_at).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </p>
                  </div>
                </button>

                {/* Delete */}
                <div className="absolute top-3.5 right-3.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(screen.id, screen.name); }}
                    className="p-1.5 rounded-lg bg-background-tertiary border border-border-primary text-text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash size={13} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center">
            <AppWindow size={32} className="mx-auto text-text-tertiary/20 mb-3" />
            <p className="text-sm text-text-tertiary">
              {searchQuery ? 'No screens match your search.' : 'No screens yet. Create one to get started.'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-3 text-modules-aly text-xs font-bold hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </section>

      {userId && (
        <CreateScreenModal
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
          spaces={spaces}
          userId={userId}
          onCreated={s => {
            setScreens(prev => [s, ...prev]);
            setCreateOpen(false);
            router.push(`/screens/${s.id}`);
          }}
        />
      )}
    </main>
  );
}
