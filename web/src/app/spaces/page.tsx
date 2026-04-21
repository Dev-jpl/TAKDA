"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlass,
  Plus,
  Binoculars,
  Sparkle,
  Trash,
} from '@phosphor-icons/react';
import { spacesService, Space } from '@/services/spaces.service';
import { SpaceCard } from '@/components/common/SpaceCard';
import { supabase } from '@/services/supabase';
import { CreateSpaceModal } from '@/components/spaces/CreateSpaceModal';

export default function SpacesPage() {
  const router = useRouter();
  const [spaces,          setSpaces]          = useState<Space[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [searchQuery,     setSearchQuery]     = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [userId,          setUserId]          = useState<string | null>(null);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setSpaces(await spacesService.getSpaces(user.id));
      }
    } catch (err) {
      console.error('Failed to load spaces:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const filteredSpaces = useMemo(() =>
    spaces.filter(s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.category && s.category.toLowerCase().includes(searchQuery.toLowerCase()))
    ),
  [spaces, searchQuery]);

  async function handleDeleteSpace(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This can't be undone.`)) return;
    try {
      await spacesService.deleteSpace(id);
      setSpaces(prev => prev.filter(s => s.id !== id));
    } catch {
      alert('Failed to delete space. Please try again.');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
          <Sparkle size={28} color="var(--modules-aly)" />
        </motion.div>
      </div>
    );
  }

  return (
    <main className="p-6 lg:p-12">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Spaces</h1>
          <p className="text-text-tertiary text-sm mt-1">Your life, organized into areas that matter.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <MagnifyingGlass size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search spaces…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-background-secondary border border-border-primary rounded-xl py-2 pl-8 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-modules-aly/40 transition-all w-56 placeholder:text-text-tertiary text-text-primary"
            />
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-modules-aly/10 border border-modules-aly/20 text-modules-aly px-5 py-2 rounded-xl font-bold text-xs hover:bg-modules-aly/20 transition-all"
          >
            <Plus size={14} weight="bold" />
            New Space
          </button>
        </div>
      </header>

      {/* ── Spaces grid ────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredSpaces.map(space => (
            <motion.div
              key={space.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="relative group"
            >
              <SpaceCard
                name={space.name}
                category={space.category}
                icon={space.icon}
                color={space.color}
                hubsCount={space.hubs_count || 0}
                onPress={() => router.push(`/spaces/${space.id}`)}
              />
              <div className="absolute top-3.5 right-3.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={e => { e.stopPropagation(); handleDeleteSpace(space.id, space.name); }}
                  className="p-1.5 rounded-lg bg-background-tertiary border border-border-primary text-text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <Trash size={13} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredSpaces.length === 0 && (
          <div className="col-span-full py-16 text-center">
            <Binoculars size={32} className="mx-auto text-text-tertiary/20 mb-3" />
            <p className="text-sm text-text-tertiary">
              {searchQuery ? 'No spaces match your search.' : 'No spaces yet. Create one to get started.'}
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
        <CreateSpaceModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={() => loadData()}
          userId={userId}
          spacesService={spacesService}
        />
      )}
    </main>
  );
}
