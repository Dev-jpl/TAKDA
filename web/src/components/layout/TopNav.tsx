"use client";

import React, { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CaretDown, CaretRight, Check } from '@phosphor-icons/react';
import { supabase } from '@/services/supabase';
import { spacesService, Space } from '@/services/spaces.service';
import { hubsService, Hub } from '@/services/hubs.service';
import { screensService, Screen } from '@/services/screens.service';

// ── Dropdown ──────────────────────────────────────────────────────────────────

function Dropdown({
  open,
  items,
  currentId,
  onSelect,
  onClose,
}: {
  open: boolean;
  items: { id: string; name: string }[];
  currentId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-1.5 z-50 min-w-44 bg-background-secondary border border-border-primary rounded-xl shadow-xl overflow-hidden"
    >
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors ${
            item.id === currentId
              ? 'bg-background-tertiary text-text-primary font-semibold'
              : 'text-text-secondary hover:bg-background-tertiary hover:text-text-primary'
          }`}
        >
          <span className="flex-1 truncate">{item.name}</span>
          {item.id === currentId && (
            <Check size={12} weight="bold" className="text-modules-aly shrink-0" />
          )}
        </button>
      ))}
    </div>
  );
}

// ── GlobalScreenBreadcrumb ────────────────────────────────────────────────────

function GlobalScreenBreadcrumb({ userId }: { userId: string | null }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const screenId  = pathname.match(/^\/screens\/([^/]+)/)?.[1] ?? null;

  const [screenName, setScreenName] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !screenId) return;
    screensService.getUserScreens(userId).then(all => {
      const found = all.find(s => s.id === screenId);
      setScreenName(found?.name ?? null);
    });
  }, [userId, screenId]);

  if (!screenId) return null;

  return (
    <div className="flex items-center gap-0.5 text-sm">
      <button
        onClick={() => router.push('/screens')}
        className="px-2.5 py-1 rounded-lg hover:bg-background-tertiary text-text-tertiary hover:text-text-primary font-medium transition-colors"
      >
        Screens
      </button>
      {screenName && (
        <>
          <CaretRight size={12} weight="bold" className="text-text-tertiary/40 mx-0.5" />
          <span className="px-2.5 py-1 text-text-primary font-medium">{screenName}</span>
        </>
      )}
    </div>
  );
}

// ── SpaceHubSwitcher ──────────────────────────────────────────────────────────

function SpaceHubSwitcher({ userId }: { userId: string | null }) {
  const pathname = usePathname();
  const router   = useRouter();

  const spaceMatch  = pathname.match(/^\/spaces\/([^/]+)/);
  const hubMatch    = pathname.match(/^\/spaces\/[^/]+\/hub\/([^/]+)/);
  const screenMatch = pathname.match(/^\/spaces\/[^/]+\/screens\/([^/]+)/);
  const spaceId     = spaceMatch?.[1]  ?? null;
  const hubId       = hubMatch?.[1]    ?? null;
  const screenId    = screenMatch?.[1] ?? null;

  const [spaces,        setSpaces]        = useState<Space[]>([]);
  const [hubs,          setHubs]          = useState<Hub[]>([]);
  const [currentSpace,  setCurrentSpace]  = useState<Space | null>(null);
  const [currentHub,    setCurrentHub]    = useState<Hub | null>(null);
  const [currentScreen, setCurrentScreen] = useState<Screen | null>(null);
  const [spaceOpen,     setSpaceOpen]     = useState(false);
  const [hubOpen,       setHubOpen]       = useState(false);

  useEffect(() => {
    if (!userId || !spaceId) return;
    spacesService.getSpaces(userId).then(all => {
      setSpaces(all);
      setCurrentSpace(all.find(s => s.id === spaceId) ?? null);
    });
  }, [userId, spaceId]);

  useEffect(() => {
    if (!spaceId || !hubId) { setHubs([]); setCurrentHub(null); return; }
    hubsService.getHubsBySpace(spaceId).then(all => {
      setHubs(all);
      setCurrentHub(all.find(h => h.id === hubId) ?? null);
    });
  }, [spaceId, hubId]);

  useEffect(() => {
    if (!spaceId || !screenId) { setCurrentScreen(null); return; }
    screensService.getScreens(spaceId).then(all => {
      setCurrentScreen(all.find(s => s.id === screenId) ?? null);
    });
  }, [spaceId, screenId]);

  if (!spaceId) {
    return (
      <span className="px-2.5 py-1 text-sm font-medium text-text-primary">Spaces</span>
    );
  }

  if (!currentSpace) return null;

  function switchSpace(id: string) {
    setSpaceOpen(false);
    router.push(`/spaces/${id}`);
  }

  function switchHub(id: string) {
    setHubOpen(false);
    if (id !== hubId) router.push(`/spaces/${spaceId}/hub/${id}`);
  }

  return (
    <div className="flex items-center gap-0.5 text-sm">

      {/* Spaces root */}
      <button
        onClick={() => router.push('/spaces')}
        className="px-2.5 py-1 rounded-lg hover:bg-background-tertiary text-text-tertiary hover:text-text-primary font-medium transition-colors"
      >
        Spaces
      </button>
      <CaretRight size={12} weight="bold" className="text-text-tertiary/40 mx-0.5" />

      {/* Space — name navigates, caret opens dropdown */}
      <div className="relative flex items-center">
        <button
          onClick={() => router.push(`/spaces/${spaceId}`)}
          className="px-2.5 py-1 rounded-l-lg hover:bg-background-tertiary text-text-primary font-medium transition-colors"
        >
          {currentSpace.name}
        </button>
        <button
          onClick={() => { setSpaceOpen(o => !o); setHubOpen(false); }}
          className="px-1.5 py-1 rounded-r-lg hover:bg-background-tertiary text-text-tertiary transition-colors"
          aria-label="Switch space"
        >
          <CaretDown size={11} weight="bold" />
        </button>
        <Dropdown
          open={spaceOpen}
          items={spaces.map(s => ({ id: s.id, name: s.name }))}
          currentId={spaceId}
          onSelect={switchSpace}
          onClose={() => setSpaceOpen(false)}
        />
      </div>

      {/* Hub — name navigates to hub, caret opens dropdown */}
      {hubId && currentHub && (
        <>
          <CaretRight size={12} weight="bold" className="text-text-tertiary/40 mx-0.5" />
          <div className="relative flex items-center">
            <button
              onClick={() => router.push(`/spaces/${spaceId}/hub/${hubId}`)}
              className="px-2.5 py-1 rounded-l-lg hover:bg-background-tertiary text-text-primary font-medium transition-colors"
            >
              {currentHub.name}
            </button>
            <button
              onClick={() => { setHubOpen(o => !o); setSpaceOpen(false); }}
              className="px-1.5 py-1 rounded-r-lg hover:bg-background-tertiary text-text-tertiary transition-colors"
              aria-label="Switch hub"
            >
              <CaretDown size={11} weight="bold" />
            </button>
            <Dropdown
              open={hubOpen}
              items={hubs.map(h => ({ id: h.id, name: h.name }))}
              currentId={hubId}
              onSelect={switchHub}
              onClose={() => setHubOpen(false)}
            />
          </div>
        </>
      )}

      {/* Screen — static label, no dropdown (screens aren't switched inline) */}
      {screenId && currentScreen && (
        <>
          <CaretRight size={12} weight="bold" className="text-text-tertiary/40 mx-0.5" />
          <span className="px-2.5 py-1 text-text-primary font-medium">{currentScreen.name}</span>
        </>
      )}
    </div>
  );
}

// ── TopNav ────────────────────────────────────────────────────────────────────

export function TopNav({ userId }: { userId: string | null }) {
  const pathname = usePathname();

  const isSpaceRoute        = pathname.startsWith('/spaces');
  const isGlobalScreenRoute = /^\/screens\/[^/]+/.test(pathname);

  if (!isSpaceRoute && !isGlobalScreenRoute) return null;

  return (
    <div className="sticky top-0 z-40 flex items-center h-12 px-6 bg-background-primary/80 backdrop-blur-md border-b border-border-primary">
      {isSpaceRoute        && <SpaceHubSwitcher      userId={userId} />}
      {isGlobalScreenRoute && <GlobalScreenBreadcrumb userId={userId} />}
    </div>
  );
}
