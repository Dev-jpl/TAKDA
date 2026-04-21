"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, Sparkle, AppWindow } from '@phosphor-icons/react';
import { supabase } from '@/services/supabase';
import { screensService, Screen, ScreenWidget, WidgetType } from '@/services/screens.service';
import { spacesService, Space } from '@/services/spaces.service';
import { hubsService, Hub } from '@/services/hubs.service';
import { WidgetCard } from '@/components/screens/WidgetCard';
import { AddWidgetModal } from '@/components/screens/AddWidgetModal';

export default function ScreenBuilderPage() {
  const params   = useParams();
  const spaceId  = params.id as string;
  const screenId = params.screenId as string;

  const [screen,  setScreen]  = useState<Screen | null>(null);
  const [widgets, setWidgets] = useState<ScreenWidget[]>([]);
  const [spaces,  setSpaces]  = useState<Space[]>([]);
  const [hubs,    setHubs]    = useState<Hub[]>([]);
  const [userId,  setUserId]  = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const hubMap = Object.fromEntries(hubs.map(h => [h.id, h]));

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);

      const [screens, widgetList, hubList] = await Promise.all([
        screensService.getScreens(spaceId),
        screensService.getWidgets(screenId),
        hubsService.getHubsBySpace(spaceId),
      ]);

      const found = screens.find(s => s.id === screenId);
      if (found) setScreen(found);
      setWidgets(widgetList);
      setHubs(hubList);

      // Load all user spaces for AddWidgetModal cross-space picker & global widgets
      if (user) {
        const allSpaces = await spacesService.getSpaces(user.id);
        setSpaces(allSpaces);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [spaceId, screenId]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleAddWidget(type: WidgetType, hubId: string | null, title: string) {
    const w = await screensService.createWidget({
      screen_id: screenId,
      hub_id: hubId,
      type,
      title: title || undefined,
      position: widgets.length,
    });
    setWidgets(prev => [...prev, w]);
  }

  async function handleDeleteWidget(widgetId: string) {
    await screensService.deleteWidget(widgetId);
    setWidgets(prev => prev.filter(w => w.id !== widgetId));
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

  if (!screen) return <div className="p-20 text-center text-text-tertiary">Screen not found.</div>;

  return (
    <main className="p-6 lg:p-12">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-modules-aly/10 border border-modules-aly/20 flex items-center justify-center text-modules-aly">
            <AppWindow size={20} weight="duotone" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text-primary">{screen.name}</h1>
            <p className="text-xs text-text-tertiary mt-0.5">{widgets.length} widget{widgets.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 bg-modules-aly/10 border border-modules-aly/20 text-modules-aly px-5 py-2 rounded-xl font-bold text-xs hover:bg-modules-aly/20 transition-all self-start md:self-auto"
        >
          <Plus size={14} weight="bold" />
          Add Widget
        </button>
      </header>

      {/* ── Widget grid ──────────────────────────────────────────────────── */}
      {widgets.length === 0 ? (
        <div className="py-24 text-center">
          <AppWindow size={36} className="mx-auto text-text-tertiary/20 mb-3" />
          <p className="text-sm text-text-tertiary mb-5">This screen is empty. Add a widget to get started.</p>
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 bg-modules-aly/10 border border-modules-aly/20 text-modules-aly px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-modules-aly/20 transition-all"
          >
            <Plus size={14} weight="bold" />
            Add Widget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {widgets.map(widget => (
            <motion.div key={widget.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <WidgetCard
                widget={widget}
                hubName={widget.hub_id ? hubMap[widget.hub_id]?.name : undefined}
                userId={userId ?? undefined}
                spaces={spaces}
                hubs={hubs}
                onDelete={() => handleDeleteWidget(widget.id)}
              />
            </motion.div>
          ))}
        </div>
      )}

      <AddWidgetModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        spaces={spaces}
        onAdd={handleAddWidget}
      />
    </main>
  );
}
