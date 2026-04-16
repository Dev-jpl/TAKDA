"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Plus, 
  PuzzlePiece, 
  Sparkle,
  DotsThreeVertical,
  Folder,
  Plug
} from '@phosphor-icons/react';
import { spacesService, Space } from '@/services/spaces.service';
import { hubsService, Hub } from '@/services/hubs.service';
import { spaceToolsService, SpaceTool } from '@/services/spaceTools.service';
import { HubCard } from '@/components/common/HubCard';
import { IconResolver } from '@/components/common/IconResolver';
import { supabase } from '@/services/supabase';
import { CreateHubModal } from '@/components/spaces/CreateHubModal';
import { SpaceToolsList } from '@/components/spaces/SpaceToolsList';
import { RegisterToolModal } from '@/components/spaces/RegisterToolModal';

export default function SpaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const spaceId = params.id as string;

  const [activeTab, setActiveTab] = useState<'hubs' | 'tools'>('hubs');
  const [space, setSpace] = useState<Space | null>(null);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [tools, setTools] = useState<SpaceTool[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isCreateHubModalOpen, setIsCreateHubModalOpen] = useState(false);
  const [isRegisterToolModalOpen, setIsRegisterToolModalOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const uId = user?.id;
      if (uId) setUserId(uId);
      
      if (!uId) throw new Error('Not authenticated.');

      const [spaceData, hubsData, toolsData] = await Promise.all([
        spacesService.getSpaces(uId).then(spaces => spaces.find(s => s.id === spaceId)),
        hubsService.getHubsBySpace(spaceId),
        spaceToolsService.getToolsBySpace(spaceId)
      ]);

      if (spaceData) setSpace(spaceData);
      setHubs(hubsData);
      setTools(toolsData);
    } catch (error) {
      console.error('Failed to load space:', error);
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

  if (!space) return <div className="p-20 text-center text-text-tertiary">Space not found.</div>;

  return (
    <main className="p-6 lg:p-12">
      <header className="mb-10">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-text-tertiary hover:text-text-primary transition-colors mb-8 group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm text-text-tertiary">Back to Spaces</span>
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div 
              className="w-20 h-20 rounded-3xl flex items-center justify-center border-2 shadow-xl shrink-0"
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
                {space.description || `Manage all projects, operations, and integrations for ${space.name}.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="w-12 h-12 rounded-xl bg-background-secondary border border-border-primary flex items-center justify-center text-text-tertiary hover:text-text-primary transition-all">
              <DotsThreeVertical size={24} />
            </button>
            {activeTab === 'hubs' ? (
              <button 
                onClick={() => setIsCreateHubModalOpen(true)}
                className="flex items-center gap-2 bg-modules-track text-white px-6 py-3 rounded-xl font-bold text-sm shadow-xl shadow-modules-track/20 hover:scale-[1.02] transition-all active:scale-95"
              >
                <Plus size={20} weight="bold" />
                <span>Create Hub</span>
              </button>
            ) : (
              <button 
                onClick={() => setIsRegisterToolModalOpen(true)}
                className="flex items-center gap-2 bg-amber-500 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-xl shadow-amber-500/20 hover:scale-[1.02] transition-all active:scale-95"
              >
                <Plus size={20} weight="bold" />
                <span>Register Tool</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <section className="mb-8 border-b border-border-primary flex gap-8">
        <button
          onClick={() => setActiveTab('hubs')}
          className={`pb-4 flex items-center gap-2 transition-colors relative ${activeTab === 'hubs' ? 'text-text-primary' : 'text-text-tertiary hover:text-text-secondary'}`}
        >
          <Folder size={18} weight={activeTab === 'hubs' ? 'fill' : 'regular'} />
          <span className="text-sm font-bold uppercase tracking-wider">Hubs</span>
          <span className="bg-background-tertiary px-2 py-0.5 rounded-full text-[10px] font-bold">{hubs.length}</span>
          {activeTab === 'hubs' && (
            <motion.div layoutId="space_active_tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-modules-track rounded-t-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('tools')}
          className={`pb-4 flex items-center gap-2 transition-colors relative ${activeTab === 'tools' ? 'text-text-primary' : 'text-text-tertiary hover:text-text-secondary'}`}
        >
          <Plug size={18} weight={activeTab === 'tools' ? 'fill' : 'regular'} />
          <span className="text-sm font-bold uppercase tracking-wider">Tools</span>
          <span className="bg-background-tertiary px-2 py-0.5 rounded-full text-[10px] font-bold">{tools.length}</span>
          {activeTab === 'tools' && (
            <motion.div layoutId="space_active_tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-t-full" />
          )}
        </button>
      </section>

      {activeTab === 'hubs' ? (
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
              <p className="text-text-tertiary font-medium">No hubs yet. Create one to get started.</p>
            </div>
          )}
        </div>
      ) : (
        <SpaceToolsList 
          tools={tools} 
          onDelete={async (id) => {
            try {
              await spaceToolsService.deleteTool(id);
              setTools(tools.filter(t => t.id !== id));
            } catch (err) {
              console.error(err);
            }
          }}
        />
      )}

      {/* Modals */}
      {userId && (
        <>
          <CreateHubModal
            isOpen={isCreateHubModalOpen}
            onClose={() => setIsCreateHubModalOpen(false)}
            onCreated={() => loadData()}
            userId={userId}
            spaceId={spaceId}
            defaultColor={space.color}
            hubsService={hubsService}
          />
          <RegisterToolModal
            isOpen={isRegisterToolModalOpen}
            onClose={() => setIsRegisterToolModalOpen(false)}
            onRegistered={() => loadData()}
            spaceId={spaceId}
          />
        </>
      )}
    </main>
  );
}
