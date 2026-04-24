"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlass, Plus, Sparkle, X, Check, ArrowRight,
  ForkKnife, CurrencyDollar, CheckSquare, Target, ChartBar,
  Storefront,
} from '@phosphor-icons/react';
import { supabase } from '@/services/supabase';
import { hubsService, Hub } from '@/services/hubs.service';
import { spacesService, Space } from '@/services/spaces.service';
import { installAddon, listAddons, HubAddon } from '@/services/addons.service';
import { getModuleDefinitions, ModuleDefinition } from '@/services/modules.service';
import { ModulePreview } from '@/components/modules/ModulePreview';

// ── Constants ──────────────────────────────────────────────────────────────────

const CATEGORY_FILTERS = [
  { id: 'all',          label: 'All'          },
  { id: 'health',       label: 'Health'       },
  { id: 'finance',      label: 'Finance'      },
  { id: 'productivity', label: 'Productivity' },
  { id: 'community',    label: 'Community'    },
];

function getModuleCategory(module: ModuleDefinition): string {
  if (!module.is_global) return 'community';
  if (module.slug === 'calorie_counter') return 'health';
  if (module.slug === 'expense_tracker') return 'finance';
  return 'productivity';
}

function getModuleIcon(module: ModuleDefinition) {
  if (module.slug === 'calorie_counter') return ForkKnife;
  if (module.slug === 'expense_tracker') return CurrencyDollar;
  if (module.slug === 'habit_tracker')   return CheckSquare;
  const lt = module.layout?.type;
  if (lt === 'trend_chart')   return ChartBar;
  return Target;
}

function getModuleColor(module: ModuleDefinition): string {
  if (module.slug === 'calorie_counter') return '#22c55e';
  if (module.slug === 'expense_tracker') return '#D85A30';
  if (module.slug === 'habit_tracker')   return '#7F77DD';
  return '#94a3b8';
}

// ── Hub Picker Modal ───────────────────────────────────────────────────────────

interface HubPickerModalProps {
  module: ModuleDefinition;
  hubs: Array<Hub & { space?: Space; installed?: boolean }>;
  onInstall: (hubId: string) => Promise<void>;
  onCheckout: (module: ModuleDefinition) => Promise<void>;
  onClose: () => void;
}

function HubPickerModal({ module, hubs, onInstall, onCheckout, onClose }: HubPickerModalProps) {
  const [installing, setInstalling] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const isPaid = !!(module.price && Number(module.price) > 0);
  const Icon = getModuleIcon(module);
  const color = getModuleColor(module);

  async function handle(hubId: string) {
    if (isPaid) { onClose(); onCheckout(module); return; }
    setInstalling(hubId);
    try {
      await onInstall(hubId);
      setDone(prev => [...prev, hubId]);
    } catch (e) {
      console.error(e);
    } finally {
      setInstalling(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.18 }}
        onClick={e => e.stopPropagation()}
        className="relative bg-background-primary border border-border-primary rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl z-10 flex flex-col md:flex-row"
        style={{ maxHeight: '85vh' }}
      >
        {/* Left panel — preview */}
        <div className="md:w-72 shrink-0 bg-background-secondary border-b md:border-b-0 md:border-r border-border-primary flex flex-col overflow-y-auto">
          <div className="px-5 py-4 border-b border-border-primary flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}18`, border: `1px solid ${color}30` }}>
                <Icon size={16} style={{ color }} weight="duotone" />
              </div>
              <div>
                <p className="text-sm font-bold text-text-primary">{module.name}</p>
                <p className="text-[10px] text-text-tertiary">{isPaid ? `PHP ${module.price}` : 'Free'}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-background-tertiary text-text-tertiary transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="p-4 flex flex-col gap-4">
            <ModulePreview definition={module} />
            {module.description && (
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">About</p>
                <p className="text-xs text-text-secondary leading-relaxed">{module.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right panel — hub selection */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-border-primary">
            <p className="text-sm font-bold text-text-primary">
              {isPaid ? `Purchase ${module.name}` : 'Install to a Hub'}
            </p>
            <p className="text-xs text-text-tertiary mt-0.5">
              {isPaid ? 'Complete checkout to unlock this module.' : 'Choose which hub to install this module on.'}
            </p>
          </div>

          <div className="flex-1 p-3 overflow-y-auto space-y-1.5">
            {hubs.length === 0 && (
              <div className="py-12 flex flex-col items-center gap-2 text-center">
                <Target size={28} className="text-text-tertiary/20" />
                <p className="text-xs text-text-tertiary">No hubs found. Create a hub first.</p>
              </div>
            )}
            {hubs.map(hub => {
              const isInstalled = hub.installed || done.includes(hub.id);
              const isInstalling = installing === hub.id;
              return (
                <button
                  key={hub.id}
                  disabled={isInstalled || isInstalling}
                  onClick={() => handle(hub.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all ${
                    isInstalled
                      ? 'border-border-primary bg-background-secondary opacity-60 cursor-default'
                      : 'border-border-primary hover:bg-background-secondary hover:border-modules-aly/30'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: `${hub.color}15`, border: `1px solid ${hub.color}30`, color: hub.color }}
                  >
                    {hub.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">{hub.name}</p>
                    <p className="text-[10px] text-text-tertiary truncate">{hub.space?.name || 'Workspace'}</p>
                  </div>
                  {isInstalled
                    ? <Check size={14} className="text-green-400 shrink-0" weight="bold" />
                    : isInstalling
                    ? <div className="w-3.5 h-3.5 border-2 border-modules-aly/40 border-t-modules-aly rounded-full animate-spin shrink-0" />
                    : <ArrowRight size={14} className="text-text-tertiary shrink-0" />
                  }
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Module Card ────────────────────────────────────────────────────────────────

function ModuleCard({
  module,
  installedCount,
  onClick,
}: {
  module: ModuleDefinition;
  installedCount: number;
  onClick: () => void;
}) {
  const Icon = getModuleIcon(module);
  const color = getModuleColor(module);
  const cat = getModuleCategory(module);
  const isPaid = !!(module.price && Number(module.price) > 0);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      onClick={onClick}
      className="group relative bg-background-secondary border border-border-primary rounded-xl p-4 flex flex-col gap-3 cursor-pointer hover:bg-background-tertiary/30 hover:border-border-primary/80 transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}15`, border: `1px solid ${color}25` }}
        >
          <Icon size={20} style={{ color }} weight="duotone" />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {installedCount > 0 && (
            <span className="text-[9px] font-bold text-green-400 bg-green-400/10 border border-green-400/20 px-1.5 py-0.5 rounded-md uppercase tracking-wide">
              Installed
            </span>
          )}
          {isPaid && (
            <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-md uppercase">
              PHP {module.price}
            </span>
          )}
          {!isPaid && (
            <span className="text-[9px] font-bold text-text-tertiary bg-background-tertiary border border-border-primary px-1.5 py-0.5 rounded-md uppercase">
              Free
            </span>
          )}
        </div>
      </div>

      <div className="flex-1">
        <p className="text-sm font-semibold text-text-primary mb-1">{module.name}</p>
        <p className="text-xs text-text-tertiary leading-relaxed line-clamp-2">{module.description || 'No description.'}</p>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border-primary/40">
        <span className="text-[10px] text-text-tertiary capitalize">{cat === 'community' ? 'Community' : module.is_global ? 'Official' : 'Custom'}</span>
        <span className="text-[10px] font-semibold text-modules-aly opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          Add to hub <ArrowRight size={10} weight="bold" />
        </span>
      </div>
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function MarketplacePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [hubs, setHubs] = useState<Array<Hub & { space?: Space; installed?: boolean }>>([]);
  const [allDefinitions, setAllDefinitions] = useState<ModuleDefinition[]>([]);
  const [installedAddons, setInstalledAddons] = useState<HubAddon[]>([]);
  const [selectedModule, setSelectedModule] = useState<ModuleDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const [defs, spaces, currentAddons] = await Promise.all([
      getModuleDefinitions(),
      spacesService.getSpaces(user.id),
      supabase.from('hub_addons').select('*').eq('user_id', user.id).then(r => r.data || []),
    ]);

    const hubList = await Promise.all(
      spaces.map(async s => {
        const hs = await hubsService.getHubsBySpace(s.id);
        return hs.map(h => ({ ...h, space: s }));
      })
    ).then(arr => arr.flat());

    setAllDefinitions(defs);
    setInstalledAddons(currentAddons);
    setHubs(hubList);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredModules = useMemo(() => {
    return allDefinitions.filter(m => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const cat = getModuleCategory(m);
      const matchesFilter = activeFilter === 'all' || cat === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [allDefinitions, searchQuery, activeFilter]);

  async function handleCheckout(module: ModuleDefinition) {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module_def_id: module.id, user_id: userId }),
      });
      const { url } = await res.json();
      window.location.href = url;
    } catch (e) {
      console.error(e);
      alert('Failed to start checkout');
    } finally {
      setLoading(false);
    }
  }

  async function handleInstall(module: ModuleDefinition, hubId: string) {
    if (!userId) return;
    await installAddon(hubId, userId, module.slug);
    setInstalledAddons(prev => [...prev, { id: '', hub_id: hubId, user_id: userId, type: module.slug, config: {}, created_at: '' }]);
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
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary flex items-center gap-2.5">
            <Storefront size={28} weight="duotone" className="text-modules-aly" />
            Marketplace
          </h1>
          <p className="text-text-tertiary text-sm mt-1">Discover and install modules to power up your hubs.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <MagnifyingGlass size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search modules…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-background-secondary border border-border-primary rounded-xl py-2 pl-8 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-modules-aly/40 transition-all w-52 placeholder:text-text-tertiary text-text-primary"
            />
          </div>
          <button
            onClick={() => router.push('/module-creator')}
            className="flex items-center gap-2 bg-modules-aly/10 border border-modules-aly/20 text-modules-aly px-4 py-2 rounded-xl font-bold text-xs hover:bg-modules-aly/20 transition-all whitespace-nowrap"
          >
            <Plus size={14} weight="bold" />
            New Module
          </button>
        </div>
      </header>

      {/* ── Category filters ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-1">
        {CATEGORY_FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all shrink-0 ${
              activeFilter === f.id
                ? 'bg-modules-aly/10 border-modules-aly/20 text-modules-aly'
                : 'border-border-primary text-text-tertiary hover:bg-background-secondary hover:text-text-primary'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Modules grid ─────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredModules.map(module => (
            <ModuleCard
              key={module.id}
              module={module}
              installedCount={installedAddons.filter(a => a.type === module.slug).length}
              onClick={() => setSelectedModule(module)}
            />
          ))}
        </AnimatePresence>

        {filteredModules.length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center gap-3 text-center">
            <Storefront size={32} className="text-text-tertiary/20" />
            <p className="text-sm text-text-tertiary">
              {searchQuery
                ? `No modules match "${searchQuery}".`
                : activeFilter !== 'all'
                ? 'No modules in this category yet.'
                : 'No modules available yet.'}
            </p>
            {(searchQuery || activeFilter !== 'all') && (
              <button
                onClick={() => { setSearchQuery(''); setActiveFilter('all'); }}
                className="text-modules-aly text-xs font-bold hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── Hub Picker Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedModule && (
          <HubPickerModal
            module={selectedModule}
            hubs={hubs.map(h => ({
              ...h,
              installed: installedAddons.some(a => a.hub_id === h.id && a.type === selectedModule.slug),
            }))}
            onInstall={(hubId) => handleInstall(selectedModule, hubId)}
            onCheckout={handleCheckout}
            onClose={() => setSelectedModule(null)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
