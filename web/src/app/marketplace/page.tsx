"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ForkKnifeIcon,
  CurrencyDollarIcon,
  CheckSquareIcon,
  LightningIcon,
  MoonIcon,
  HandbagIcon,
  X,
  Check,
  ArrowRight,
  Plus,
} from '@phosphor-icons/react';
import { supabase } from '@/services/supabase';
import { hubsService, Hub } from '@/services/hubs.service';
import { spacesService, Space } from '@/services/spaces.service';
import { installAddon, listAddons, HubAddon, AddonType } from '@/services/addons.service';

interface AddonDef {
  id: AddonType;
  name: string;
  description: string;
  icon: React.ElementType;
  category: string;
  categoryColor: string;
  comingSoon?: boolean;
}

const ADDON_CATALOG: AddonDef[] = [
  {
    id: 'calorie_counter',
    name: 'Calorie Counter',
    description: 'Track your daily food intake and monitor calories. Works with Aly — just tell her what you ate.',
    icon: ForkKnifeIcon,
    category: 'Health',
    categoryColor: '#22c55e',
  },
  {
    id: 'expense_tracker',
    name: 'Expense Tracker',
    description: 'Log and categorize spending per hub. Aly can log expenses for you automatically.',
    icon: CurrencyDollarIcon,
    category: 'Finance',
    categoryColor: '#f59e0b',
  },
  {
    id: 'habit_tracker',
    name: 'Habit Tracker',
    description: 'Build streaks and track daily habits inside any hub.',
    icon: CheckSquareIcon,
    category: 'Productivity',
    categoryColor: 'var(--modules-track)',
    comingSoon: true,
  },
  {
    id: 'workout_log',
    name: 'Workout Log',
    description: 'Log workouts, sets, and reps. Syncs with Strava data if connected.',
    icon: LightningIcon,
    category: 'Health',
    categoryColor: '#22c55e',
    comingSoon: true,
  },
  {
    id: 'sleep_tracker',
    name: 'Sleep Tracker',
    description: 'Track sleep duration and quality. Get weekly insights from Aly.',
    icon: MoonIcon,
    category: 'Health',
    categoryColor: '#22c55e',
    comingSoon: true,
  },
];

interface HubPickerModalProps {
  addon: AddonDef;
  hubs: Array<Hub & { space?: Space; installed?: boolean }>;
  onInstall: (hubId: string) => Promise<void>;
  onClose: () => void;
}

function HubPickerModal({ addon, hubs, onInstall, onClose }: HubPickerModalProps) {
  const [installing, setInstalling] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const Icon = addon.icon;

  async function handle(hubId: string) {
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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-background-primary border border-border-primary rounded-xl w-full max-w-md p-6 flex flex-col gap-5 z-10"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border"
              style={{ backgroundColor: `${addon.categoryColor}15`, borderColor: `${addon.categoryColor}30` }}>
              <Icon size={20} style={{ color: addon.categoryColor }} weight="duotone" />
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary">Add {addon.name}</p>
              <p className="text-xs text-text-tertiary">Choose a hub to install on</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Hub list */}
        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
          {hubs.length === 0 && (
            <p className="text-xs text-text-tertiary text-center py-6">No hubs found. Create a hub first.</p>
          )}
          {hubs.map(hub => {
            const isInstalled = hub.installed || done.includes(hub.id);
            const isInstalling = installing === hub.id;
            return (
              <button
                key={hub.id}
                disabled={isInstalled || isInstalling}
                onClick={() => handle(hub.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                  isInstalled
                    ? 'border-border-primary bg-background-secondary opacity-60 cursor-default'
                    : 'border-border-primary hover:border-modules-aly/30 hover:bg-background-secondary'
                }`}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border"
                  style={{ backgroundColor: `${hub.color}15`, borderColor: `${hub.color}30` }}
                >
                  <span className="text-xs font-bold" style={{ color: hub.color }}>
                    {hub.name[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{hub.name}</p>
                  {hub.space && (
                    <p className="text-[10px] text-text-tertiary truncate">{hub.space.name}</p>
                  )}
                </div>
                <div className="shrink-0">
                  {isInstalled ? (
                    <Check size={14} className="text-modules-track" weight="bold" />
                  ) : isInstalling ? (
                    <div className="w-4 h-4 border-2 border-modules-aly/30 border-t-modules-aly rounded-full animate-spin" />
                  ) : (
                    <ArrowRight size={14} className="text-text-tertiary" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [hubs, setHubs] = useState<Array<Hub & { space?: Space; installed?: boolean }>>([]);
  const [allAddons, setAllAddons] = useState<HubAddon[]>([]);
  const [selectedAddon, setSelectedAddon] = useState<AddonDef | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const spaces = await spacesService.getSpaces(user.id);
    const hubList = await Promise.all(
      spaces.map(async s => {
        const hs = await hubsService.getHubsBySpace(s.id);
        return hs.map(h => ({ ...h, space: s }));
      })
    ).then(arr => arr.flat());

    // Fetch installed addons per hub
    const addonResults = await Promise.all(
      hubList.map(h => listAddons(h.id).catch(() => [] as HubAddon[]))
    );
    const flat = addonResults.flat();
    setAllAddons(flat);
    setHubs(hubList);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleInstall(addon: AddonDef, hubId: string) {
    if (!userId) return;
    await installAddon(hubId, userId, addon.id);
    setAllAddons(prev => [...prev, { id: '', hub_id: hubId, user_id: userId, type: addon.id, config: {}, created_at: '' }]);
  }

  function getHubsForModal(addon: AddonDef) {
    return hubs.map(h => ({
      ...h,
      installed: allAddons.some(a => a.hub_id === h.id && a.type === addon.id),
    }));
  }

  return (
    <main className="p-6 lg:p-12 flex flex-col gap-8 max-w-5xl mx-auto">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-modules-aly/10 border border-modules-aly/20 flex items-center justify-center">
            <HandbagIcon size={20} color="var(--modules-aly)" weight="duotone" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Marketplace</h1>
            <p className="text-xs text-text-tertiary">Install premade modules on any hub</p>
          </div>
        </div>
      </header>

      {/* Grid */}
      {loading ? (
        <div className="text-center text-text-tertiary text-sm py-16">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ADDON_CATALOG.map(addon => {
            const Icon = addon.icon;
            const installedCount = allAddons.filter(a => a.type === addon.id).length;
            return (
              <div
                key={addon.id}
                className={`bg-background-secondary border border-border-primary rounded-xl p-5 flex flex-col gap-4 ${
                  addon.comingSoon ? 'opacity-60' : ''
                }`}
              >
                {/* Icon + category */}
                <div className="flex items-start justify-between">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center border"
                    style={{ backgroundColor: `${addon.categoryColor}15`, borderColor: `${addon.categoryColor}30` }}
                  >
                    <Icon size={22} style={{ color: addon.categoryColor }} weight="duotone" />
                  </div>
                  {addon.comingSoon ? (
                    <span className="text-[9px] font-bold uppercase tracking-widest border border-border-primary text-text-tertiary px-2 py-0.5 rounded-md">
                      Soon
                    </span>
                  ) : installedCount > 0 ? (
                    <span
                      className="text-[9px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded-md"
                      style={{ color: addon.categoryColor, borderColor: `${addon.categoryColor}40`, backgroundColor: `${addon.categoryColor}10` }}
                    >
                      {installedCount} hub{installedCount > 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span
                      className="text-[9px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded-md"
                      style={{ color: addon.categoryColor, borderColor: `${addon.categoryColor}40`, backgroundColor: `${addon.categoryColor}10` }}
                    >
                      {addon.category}
                    </span>
                  )}
                </div>

                {/* Text */}
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-text-primary mb-1">{addon.name}</h3>
                  <p className="text-xs text-text-tertiary leading-relaxed">{addon.description}</p>
                </div>

                {/* Action */}
                {!addon.comingSoon && (
                  <button
                    onClick={() => setSelectedAddon(addon)}
                    className="flex items-center justify-center gap-2 border border-border-primary text-text-secondary hover:border-modules-aly/30 hover:text-text-primary px-4 py-2 rounded-xl text-xs font-bold transition-all"
                  >
                    <Plus size={13} weight="bold" />
                    Add to Hub
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Hub picker modal */}
      {selectedAddon && (
        <HubPickerModal
          addon={selectedAddon}
          hubs={getHubsForModal(selectedAddon)}
          onInstall={(hubId) => handleInstall(selectedAddon, hubId)}
          onClose={() => setSelectedAddon(null)}
        />
      )}
    </main>
  );
}
