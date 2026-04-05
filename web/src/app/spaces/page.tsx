"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MagnifyingGlass,
  Plus, 
  Binoculars, 
  ChartLineUp, 
  Database, 
  Sparkle,
  Trash,
} from '@phosphor-icons/react';
import { spacesService, Space } from '@/services/spaces.service';
import { SpaceCard } from '@/components/common/SpaceCard';
import { StatCard } from '@/components/common/StatCard';
import { supabase } from '@/services/supabase';
import { CreateSpaceModal } from '@/components/spaces/CreateSpaceModal';

export default function SpacesPage() {
  const router = useRouter();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const { data: { user } } = await supabase.auth.getUser();
      const uId = user?.id;
      if (uId) setUserId(uId);
      
      if (uId) {
        const data = await spacesService.getSpaces(uId);
        setSpaces(data);
      }
    } catch (err) {
      console.error('Oversight failed to load registry:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredSpaces = useMemo(() => {
    return spaces.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.category && s.category.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [spaces, searchQuery]);

  const handleDeleteSpace = async (id: string, name: string) => {
    if (!window.confirm(`Deauthorize ${name}? This action is irreversible.`)) return;
    try {
      await spacesService.deleteSpace(id);
      setSpaces(spaces.filter(s => s.id !== id));
    } catch {
      alert('Extraction failed: Space persistent.');
    }
  };

  if (loading && !refreshing) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Sparkle size={32} color="var(--modules-aly)" />
        </motion.div>
      </div>
    );
  }

  return (
    <main className="p-6 lg:p-12">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Oversight</h1>
          <p className="text-text-tertiary text-sm mt-1">Registry of all mission-critical life domains.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group flex-1 md:flex-none">
            <MagnifyingGlass 
              size={18} 
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-modules-aly transition-colors" 
            />
            <input 
              type="text" 
              placeholder="Identify domain..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-background-secondary border border-border-primary rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-modules-aly/50 focus:border-modules-aly/50 transition-all w-full md:w-64"
            />
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-modules-aly text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-modules-aly/90 transition-all shadow-lg shadow-modules-aly/20 active:scale-95"
          >
            <Plus size={20} weight="bold" />
            <span className="hidden sm:inline">New Space</span>
          </button>
        </div>
      </header>

      {/* Stats Grid - 2x2 on small, 4-inline on large */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        <StatCard 
          label="Domains" 
          value={spaces.length} 
          icon={<Binoculars size={18} />} 
          color="var(--modules-aly)" 
        />
        <StatCard 
          label="Context Index" 
          value="142" 
          icon={<ChartLineUp size={18} />} 
          color="var(--modules-track)" 
        />
        <StatCard 
          label="IQ Points" 
          value="2,840" 
          icon={<Database size={18} />} 
          color="var(--modules-knowledge)" 
        />
        <StatCard 
          label="Velocity" 
          value="84%" 
          icon={<Sparkle size={18} />} 
          color="var(--status-success)" 
        />
      </section>

      {/* Spaces List */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredSpaces.map((space) => (
            <motion.div
              key={space.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
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
              
              {/* Context Actions */}
              <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteSpace(space.id, space.name); }}
                  className="p-2 rounded-lg bg-background-tertiary border border-border-primary text-text-tertiary hover:text-urgent hover:bg-urgent/10 transition-all shadow-xl"
                >
                  <Trash size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredSpaces.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center bg-background-secondary/30 rounded-3xl border border-dashed border-border-primary">
            <Binoculars size={48} className="mx-auto text-text-tertiary/20 mb-4" />
            <p className="text-text-tertiary font-medium">No life domains identified within this mission parameter.</p>
            <button 
              onClick={() => setSearchQuery('')}
              className="mt-4 text-modules-aly text-sm font-bold hover:underline"
            >
              Reset Intelligence Query
            </button>
          </div>
        )}
      </section>

      {/* Domain Initialization Modal */}
      {userId && (
        <CreateSpaceModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={() => loadData(true)}
          userId={userId}
          spacesService={spacesService}
        />
      )}
    </main>
  );
}
