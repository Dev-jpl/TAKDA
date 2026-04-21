"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  PuzzlePiece,
  Sparkle,
  Folder,
  Plug,
  AppWindow,
} from '@phosphor-icons/react';
import { spacesService, Space } from '@/services/spaces.service';
import { hubsService, Hub } from '@/services/hubs.service';
import { spaceToolsService, SpaceTool } from '@/services/spaceTools.service';
import { screensService, Screen } from '@/services/screens.service';
import { HubCard } from '@/components/common/HubCard';
import { IconResolver } from '@/components/common/IconResolver';
import { supabase } from '@/services/supabase';
import { CreateHubModal } from '@/components/spaces/CreateHubModal';
import { SpaceToolsList } from '@/components/spaces/SpaceToolsList';
import { RegisterToolModal } from '@/components/spaces/RegisterToolModal';
import { ScreensList } from '@/components/screens/ScreensList';

type Tab = 'hubs' | 'screens' | 'tools';

export default function SpaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const spaceId = params.id as string;

  const [activeTab, setActiveTab]   = useState<Tab>('hubs');
  const [space, setSpace]           = useState<Space | null>(null);
  const [hubs, setHubs]             = useState<Hub[]>([]);
  const [tools, setTools]           = useState<SpaceTool[]>([]);
  const [screens, setScreens]       = useState<Screen[]>([]);

  const [loading, setLoading]                       = useState(true);
  const [isCreateHubModalOpen, setCreateHubModal]   = useState(false);
  const [isRegisterToolModalOpen, setRegisterTool]  = useState(false);
  const [userId, setUserId]                         = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const uId = user?.id;
      if (uId) setUserId(uId);
      if (!uId) throw new Error('Not authenticated.');

      const [spaceData, hubsData, toolsData, screensData] = await Promise.all([
        spacesService.getSpaces(uId).then(list => list.find(s => s.id === spaceId)),
        hubsService.getHubsBySpace(spaceId),
        spaceToolsService.getToolsBySpace(spaceId),
        screensService.getScreens(spaceId).catch(() => [] as Screen[]),
      ]);

      if (spaceData) setSpace(spaceData);
      setHubs(hubsData);
      setTools(toolsData);
      setScreens(screensData);
    } catch (err) {
      console.error('Failed to load space:', err);
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => { if (spaceId) loadData(); }, [spaceId, loadData]);

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

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count: number; accent: string }[] = [
    { key: 'hubs',    label: 'Hubs',    icon: <Folder    size={15} weight={activeTab === 'hubs'    ? 'fill' : 'regular'} />, count: hubs.length,    accent: 'bg-modules-track' },
    { key: 'screens', label: 'Screens', icon: <AppWindow size={15} weight={activeTab === 'screens' ? 'fill' : 'regular'} />, count: screens.length, accent: 'bg-modules-aly' },
    { key: 'tools',   label: 'Tools',   icon: <Plug      size={15} weight={activeTab === 'tools'   ? 'fill' : 'regular'} />, count: tools.length,   accent: 'bg-modules-knowledge' },
  ];

  return (
    <main className="p-6 lg:p-12">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="mb-10">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center border shrink-0"
              style={{ backgroundColor: `${space.color}15`, borderColor: `${space.color}30` }}
            >
              <IconResolver icon={space.icon || 'Folder'} size={28} color={space.color} weight="duotone" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-text-primary">{space.name}</h1>
                <span className="px-2.5 py-0.5 rounded-lg bg-background-tertiary border border-border-primary text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
                  {space.category || 'Life Domain'}
                </span>
              </div>
              <p className="text-text-tertiary mt-1 text-xs leading-relaxed">
                {space.description || `Manage all projects, operations, and integrations for ${space.name}.`}
              </p>
            </div>
          </div>

          {/* CTA per tab */}
          {activeTab === 'hubs' && (
            <button
              onClick={() => setCreateHubModal(true)}
              className="flex items-center gap-2 bg-modules-track/10 border border-modules-track/20 text-modules-track px-5 py-2 rounded-xl font-bold text-xs hover:bg-modules-track/20 transition-all"
            >
              <Plus size={14} weight="bold" />
              New Hub
            </button>
          )}
          {activeTab === 'screens' && userId && (
            <button
              onClick={async () => {
                const name = window.prompt('Screen name:');
                if (!name?.trim()) return;
                const s = await screensService.createScreen(userId, name.trim(), spaceId);
                router.push(`/spaces/${spaceId}/screens/${s.id}`);
              }}
              className="flex items-center gap-2 bg-modules-aly/10 border border-modules-aly/20 text-modules-aly px-5 py-2 rounded-xl font-bold text-xs hover:bg-modules-aly/20 transition-all"
            >
              <Plus size={14} weight="bold" />
              New Screen
            </button>
          )}
          {activeTab === 'tools' && (
            <button
              onClick={() => setRegisterTool(true)}
              className="flex items-center gap-2 bg-modules-knowledge/10 border border-modules-knowledge/20 text-modules-knowledge px-5 py-2 rounded-xl font-bold text-xs hover:bg-modules-knowledge/20 transition-all"
            >
              <Plus size={14} weight="bold" />
              Register Tool
            </button>
          )}
        </div>
      </header>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <section className="mb-8 border-b border-border-primary flex gap-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-4 flex items-center gap-2 transition-colors relative ${
              activeTab === tab.key ? 'text-text-primary' : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            {tab.icon}
            <span className="text-sm font-bold uppercase tracking-wider">{tab.label}</span>
            <span className="bg-background-tertiary px-2 py-0.5 rounded-md text-[10px] font-bold">{tab.count}</span>
            {activeTab === tab.key && (
              <motion.div layoutId="space_active_tab" className={`absolute bottom-0 left-0 right-0 h-0.5 ${tab.accent} rounded-t-full`} />
            )}
          </button>
        ))}
      </section>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      {activeTab === 'hubs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {hubs.map(hub => (
              <motion.div key={hub.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
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
            <div className="col-span-full py-16 text-center">
              <PuzzlePiece size={32} className="mx-auto text-text-tertiary/20 mb-3" />
              <p className="text-sm text-text-tertiary">No hubs yet. Create one to get started.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'screens' && (
        <ScreensList
          screens={screens}
          spaceId={spaceId}
          userId={userId}
          onOpen={id => router.push(`/spaces/${spaceId}/screens/${id}`)}
          onCreated={s => setScreens(prev => [...prev, s])}
          onDeleted={id => setScreens(prev => prev.filter(s => s.id !== id))}
        />
      )}

      {activeTab === 'tools' && (
        <SpaceToolsList
          tools={tools}
          onDelete={async (id) => {
            try {
              await spaceToolsService.deleteTool(id);
              setTools(prev => prev.filter(t => t.id !== id));
            } catch (err) { console.error(err); }
          }}
        />
      )}

      {/* Modals */}
      {userId && (
        <>
          <CreateHubModal
            isOpen={isCreateHubModalOpen}
            onClose={() => setCreateHubModal(false)}
            onCreated={() => loadData()}
            userId={userId}
            spaceId={spaceId}
            defaultColor={space.color}
            hubsService={hubsService}
          />
          <RegisterToolModal
            isOpen={isRegisterToolModalOpen}
            onClose={() => setRegisterTool(false)}
            onRegistered={() => loadData()}
            spaceId={spaceId}
          />
        </>
      )}
    </main>
  );
}
