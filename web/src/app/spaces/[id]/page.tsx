"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Plus, 
  PuzzlePiece, 
  Sparkle,
  DotsThreeVertical
} from '@phosphor-icons/react';
import { spacesService, Space } from '@/services/spaces.service';
import { hubsService, Hub } from '@/services/hubs.service';
import { HubCard } from '@/components/common/HubCard';
import { IconResolver } from '@/components/common/IconResolver';
import { supabase } from '@/services/supabase';

export default function SpaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const spaceId = params.id as string;

  const [space, setSpace] = useState<Space | null>(null);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const uId = user?.id;
      
      if (!uId) throw new Error('Registry Error: Session deauthorized.');

      const [spaceData, hubsData] = await Promise.all([
        spacesService.getSpaces(uId).then(spaces => spaces.find(s => s.id === spaceId)),
        hubsService.getHubsBySpace(spaceId)
      ]);

      if (spaceData) setSpace(spaceData);
      setHubs(hubsData);
    } catch (error) {
      console.error('Oversight failure:', error);
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    if (spaceId) loadData();
  }, [spaceId, loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
          <Sparkle size={32} color="var(--modules-aly)" />
        </motion.div>
      </div>
    );
  }

  if (!space) return <div className="p-20 text-center">Registry Error: Space deauthorized.</div>;

  return (
    <main className="p-6 lg:p-12">
      <header className="mb-12">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-text-tertiary hover:text-text-primary transition-colors mb-8 group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest">Back to Oversight</span>
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div 
              className="w-20 h-20 rounded-3xl flex items-center justify-center border-2 shadow-xl"
              style={{ backgroundColor: `${space.color}15`, borderColor: `${space.color}30` }}
            >
              <IconResolver icon={space.icon || 'Folder'} size={40} color={space.color} weight="duotone" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-bold tracking-tight text-text-primary">{space.name}</h1>
                <div className="px-3 py-1 rounded-full bg-background-tertiary border border-border-primary text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
                  {space.category || 'Life Domain'}
                </div>
              </div>
              <p className="text-text-tertiary mt-2 max-w-2xl text-sm leading-relaxed">
                Coordinate and identify mission-critical context intelligence within your {space.name} domain.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="w-12 h-12 rounded-xl bg-background-secondary border border-border-primary flex items-center justify-center text-text-tertiary hover:text-text-primary transition-all">
              <DotsThreeVertical size={24} />
            </button>
            <button className="flex items-center gap-2 bg-modules-track text-white px-6 py-3 rounded-xl font-bold text-sm shadow-xl shadow-modules-track/20 hover:scale-[1.02] transition-all">
              <Plus size={20} weight="bold" />
              <span>Create Hub</span>
            </button>
          </div>
        </div>
      </header>

      <section className="mb-6 flex items-center justify-between">
        <h2 className="text-xs font-bold text-text-tertiary uppercase tracking-[0.2em]">Context Intelligence Hubs</h2>
        <div className="text-xs text-text-tertiary font-medium">
          {hubs.length} Active Hubs Identified
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {hubs.map((hub) => (
            <motion.div
              key={hub.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <HubCard 
                name={hub.name}
                description={hub.description}
                tasksCount={0}
                onPress={() => router.push(`/spaces/${spaceId}/hub/${hub.id}`)}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {hubs.length === 0 && (
          <div className="col-span-full py-20 text-center bg-background-secondary/30 rounded-3xl border border-dashed border-border-primary">
            <PuzzlePiece size={48} className="mx-auto text-text-tertiary/20 mb-4" />
            <p className="text-text-tertiary font-medium">No hubs identified in this life domain registry.</p>
          </div>
        )}
      </div>
    </main>
  );
}
