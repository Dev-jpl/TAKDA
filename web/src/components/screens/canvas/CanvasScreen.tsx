"use client";

import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon, PencilSimpleIcon, EyeIcon, PlusIcon,
  MagnifyingGlassMinusIcon, MagnifyingGlassPlusIcon,
  XIcon, SparkleIcon,
} from '@phosphor-icons/react';
import { screensService, ScreenWidget, WidgetType } from '@/services/screens.service';
import { supabase } from '@/services/supabase';
import { spacesService, Space } from '@/services/spaces.service';
import { hubsService, Hub } from '@/services/hubs.service';
import { CanvasWidgetNode, CanvasPos, CanvasMode } from './CanvasWidgetNode';
import { CanvasMinimap } from './CanvasMinimap';
import { AddWidgetModal } from '@/components/screens/AddWidgetModal';
import { WIDGET_REGISTRY } from '@/lib/widgetRegistry';

// ── Constants ─────────────────────────────────────────────────────────────────

const MIN_SCALE = 0.2;
const MAX_SCALE = 3.0;
const DEFAULT_W  = 320;
const DEFAULT_H  = 260;

// Hub widget types that need hub selection via the modal
const HUB_WIDGET_TYPES = new Set<WidgetType>([
  'tasks', 'notes', 'docs', 'outcomes', 'hub_overview',
  'calorie_counter', 'expense_tracker', 'upcoming_events',
  'sleep_tracker', 'workout_log', 'hub_snapshot',
]);

// Default canvas widgets for brand-new canvas screens
const STARTER_LAYOUT: Array<{ type: WidgetType; pos: CanvasPos }> = [
  { type: 'aly_nudge',        pos: { x: 40,  y: 40,  w: 400, h: 200 } },
  { type: 'counter',          pos: { x: 460, y: 40,  w: 280, h: 200 } },
  { type: 'quick_clock',      pos: { x: 40,  y: 260, w: 280, h: 180 } },
  { type: 'weekly_progress',  pos: { x: 340, y: 260, w: 400, h: 180 } },
];

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

// ── Types ──────────────────────────────────────────────────────────────────────

interface Viewport { x: number; y: number; scale: number }

interface CanvasWidgetData extends ScreenWidget {
  pos: CanvasPos;
}

interface Props {
  screenId: string;
  screenName: string;
}

// ── CanvasScreen ──────────────────────────────────────────────────────────────

export function CanvasScreen({ screenId, screenName }: Props) {
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────────────
  const [viewport, setViewport] = useState<Viewport>({ x: 60, y: 60, scale: 1 });
  const [mode,     setMode]     = useState<CanvasMode>('view');
  const [focusId,  setFocusId]  = useState<string | null>(null);
  const [prevVP,   setPrevVP]   = useState<Viewport | null>(null);
  const [animating, setAnimating] = useState(false);

  const [widgets,  setWidgets]  = useState<CanvasWidgetData[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [userId,   setUserId]   = useState<string | null>(null);
  const [spaces,   setSpaces]   = useState<Space[]>([]);
  const [hubs,     setHubs]     = useState<Hub[]>([]);
  const [addOpen,  setAddOpen]  = useState(false);

  const hubMap   = useMemo(() => Object.fromEntries(hubs.map(h  => [h.id,  h])),  [hubs]);
  const spaceMap = useMemo(() => Object.fromEntries(spaces.map(s => [s.id, s])),  [spaces]);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const containerRef  = useRef<HTMLDivElement>(null);
  const worldRef      = useRef<HTMLDivElement>(null);
  const pointersRef   = useRef<Map<number, { x: number; y: number }>>(new Map());
  const panRef        = useRef<{ sx: number; sy: number; vx: number; vy: number } | null>(null);
  const pinchRef      = useRef<{ dist: number; scale: number; vx: number; vy: number; cx: number; cy: number } | null>(null);
  const dragRef       = useRef<{ widgetId: string; sx: number; sy: number; wx: number; wy: number } | null>(null);
  const containerSize = useRef({ w: 0, h: 0 });

  // Keep track of container dimensions for minimap + focus centering
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const e = entries[0];
      containerSize.current = { w: e.contentRect.width, h: e.contentRect.height };
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Data loading ───────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const [rawWidgets, spacesData] = await Promise.all([
        screensService.getWidgets(screenId),
        spacesService.getSpaces(user.id),
      ]);
      setSpaces(spacesData);

      if (spacesData.length > 0) {
        const lists = await Promise.all(spacesData.map(s => hubsService.getHubsBySpace(s.id)));
        setHubs(lists.flat());
      }

      if (rawWidgets.length === 0) {
        // New canvas screen — pre-populate with starter widgets
        await populateStarter(screenId);
        const fresh = await screensService.getWidgets(screenId);
        setWidgets(toCanvasData(fresh));
      } else {
        setWidgets(toCanvasData(rawWidgets));
      }

      setLoading(false);
    })();
  }, [screenId]);

  function toCanvasData(raw: ScreenWidget[]): CanvasWidgetData[] {
    return raw.map((w, i) => ({
      ...w,
      pos: (w.canvas_position as CanvasPos | undefined) ?? {
        x: 40 + (i % 3) * 360,
        y: 40 + Math.floor(i / 3) * 280,
        w: DEFAULT_W,
        h: DEFAULT_H,
      },
    }));
  }

  async function populateStarter(sid: string) {
    await Promise.all(STARTER_LAYOUT.map((item, i) => {
      const def = WIDGET_REGISTRY[item.type];
      const initCfg: Record<string, unknown> = { ...def?.defaultConfig };
      return screensService.createWidget({
        screen_id:       sid,
        type:            item.type,
        position:        i,
        config:          initCfg,
        canvas_position: item.pos,
      });
    }));
  }

  // ── Gesture helpers ────────────────────────────────────────────────────────

  function pinchDist(pts: { x: number; y: number }[]) {
    return Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
  }

  function getPinchMid(pts: { x: number; y: number }[], rect: DOMRect) {
    return {
      cx: (pts[0].x + pts[1].x) / 2 - rect.left,
      cy: (pts[0].y + pts[1].y) / 2 - rect.top,
    };
  }

  // ── Pointer events (container) ─────────────────────────────────────────────

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const el = containerRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const pts = Array.from(pointersRef.current.values());

    if (pts.length === 2) {
      // Pinch
      const rect = el.getBoundingClientRect();
      const dist = pinchDist(pts);
      const { cx, cy } = getPinchMid(pts, rect);
      pinchRef.current = { dist, scale: viewport.scale, vx: viewport.x, vy: viewport.y, cx, cy };
      panRef.current = null;
      dragRef.current = null;
      return;
    }

    // Single pointer
    const target = e.target as HTMLElement;
    const isWidget = !!target.closest('[data-canvas-widget]');

    if (!isWidget && mode === 'view') {
      panRef.current = { sx: e.clientX, sy: e.clientY, vx: viewport.x, vy: viewport.y };
    }
  }, [mode, viewport]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = Array.from(pointersRef.current.values());
    const el  = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    if (pts.length >= 2 && pinchRef.current) {
      const dist     = pinchDist(pts);
      const newScale = clamp(pinchRef.current.scale * (dist / pinchRef.current.dist), MIN_SCALE, MAX_SCALE);
      const { cx: startCx, cy: startCy } = pinchRef.current;
      const worldX   = (startCx - pinchRef.current.vx) / pinchRef.current.scale;
      const worldY   = (startCy - pinchRef.current.vy) / pinchRef.current.scale;
      const { cx, cy } = getPinchMid(pts, rect);
      setViewport({ x: cx - worldX * newScale, y: cy - worldY * newScale, scale: newScale });
      return;
    }

    if (panRef.current && mode === 'view' && pts.length < 2) {
      const dx = e.clientX - panRef.current.sx;
      const dy = e.clientY - panRef.current.sy;
      setViewport(v => ({ ...v, x: panRef.current!.vx + dx, y: panRef.current!.vy + dy }));
    }

    if (dragRef.current && mode === 'edit') {
      const dx = (e.clientX - dragRef.current.sx) / viewport.scale;
      const dy = (e.clientY - dragRef.current.sy) / viewport.scale;
      const newX = dragRef.current.wx + dx;
      const newY = dragRef.current.wy + dy;
      setWidgets(prev => prev.map(w =>
        w.id === dragRef.current!.widgetId
          ? { ...w, pos: { ...w.pos, x: newX, y: newY } }
          : w
      ));
    }
  }, [mode, viewport.scale]);

  const handlePointerUp = useCallback(async (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);

    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) panRef.current = null;

    // Persist widget position on drag end
    if (dragRef.current) {
      const { widgetId } = dragRef.current;
      const widget = widgets.find(w => w.id === widgetId);
      if (widget) {
        screensService.updateWidget(widgetId, { canvas_position: widget.pos }).catch(console.error);
      }
      dragRef.current = null;
    }
  }, [widgets]);

  // ── Wheel zoom ─────────────────────────────────────────────────────────────

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    const rect  = el.getBoundingClientRect();
    const cx    = e.clientX - rect.left;
    const cy    = e.clientY - rect.top;
    const delta = e.deltaY < 0 ? 1.1 : 0.9;
    setViewport(vp => {
      const newScale = clamp(vp.scale * delta, MIN_SCALE, MAX_SCALE);
      const worldX   = (cx - vp.x) / vp.scale;
      const worldY   = (cy - vp.y) / vp.scale;
      return { x: cx - worldX * newScale, y: cy - worldY * newScale, scale: newScale };
    });
  }, []);

  // ── Widget drag init (called by CanvasWidgetNode) ──────────────────────────

  const handleWidgetDragStart = useCallback((widgetId: string, e: React.PointerEvent) => {
    const widget = widgets.find(w => w.id === widgetId);
    if (!widget) return;
    containerRef.current?.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragRef.current = {
      widgetId,
      sx: e.clientX,
      sy: e.clientY,
      wx: widget.pos.x,
      wy: widget.pos.y,
    };
  }, [widgets]);

  // ── Focus mode ─────────────────────────────────────────────────────────────

  const handleFocus = useCallback((widgetId: string) => {
    const widget = widgets.find(w => w.id === widgetId);
    if (!widget || !containerRef.current) return;
    const { w: cw, h: ch } = containerSize.current;

    setPrevVP(viewport);
    setFocusId(widgetId);
    setAnimating(true);

    // Compute viewport so widget fills 85% of screen
    const targetScale = Math.min((cw * 0.85) / widget.pos.w, (ch * 0.85) / widget.pos.h, MAX_SCALE);
    const newX = cw / 2 - (widget.pos.x + widget.pos.w / 2) * targetScale;
    const newY = ch / 2 - (widget.pos.y + widget.pos.h / 2) * targetScale;
    setViewport({ x: newX, y: newY, scale: targetScale });

    setTimeout(() => setAnimating(false), 350);
  }, [viewport, widgets]);

  const handleUnfocus = useCallback(() => {
    if (!prevVP) { setFocusId(null); return; }
    setAnimating(true);
    setViewport(prevVP);
    setPrevVP(null);
    setTimeout(() => { setFocusId(null); setAnimating(false); }, 350);
  }, [prevVP]);

  // ── Add widget ─────────────────────────────────────────────────────────────

  const handleAddWidget = useCallback(async (type: WidgetType, hubId: string | null, title: string) => {
    // Place new widget at visible center of the canvas
    const { w: cw, h: ch } = containerSize.current;
    const centerX = (cw / 2 - viewport.x) / viewport.scale - DEFAULT_W / 2;
    const centerY = (ch / 2 - viewport.y) / viewport.scale - DEFAULT_H / 2;
    const pos: CanvasPos = {
      x: Math.round(centerX),
      y: Math.round(centerY),
      w: HUB_WIDGET_TYPES.has(type) ? DEFAULT_W + 40 : DEFAULT_W,
      h: DEFAULT_H,
    };
    const def = WIDGET_REGISTRY[type];
    const initCfg: Record<string, unknown> = { ...def?.defaultConfig };

    try {
      const w = await screensService.createWidget({
        screen_id:       screenId,
        type,
        hub_id:          hubId,
        title:           title || undefined,
        position:        widgets.length,
        config:          initCfg,
        canvas_position: pos,
      });
      setWidgets(prev => [...prev, { ...w, pos }]);
    } catch (err) {
      console.error('Failed to add widget:', err);
    }
  }, [screenId, widgets.length, viewport]);

  // ── Delete widget ──────────────────────────────────────────────────────────

  const handleDeleteWidget = useCallback(async (widgetId: string) => {
    setWidgets(prev => prev.filter(w => w.id !== widgetId));
    await screensService.deleteWidget(widgetId).catch(console.error);
  }, []);

  // ── Zoom controls ──────────────────────────────────────────────────────────

  function zoomBy(delta: number) {
    const { w: cw, h: ch } = containerSize.current;
    setViewport(vp => {
      const newScale = clamp(vp.scale * delta, MIN_SCALE, MAX_SCALE);
      const cx = cw / 2, cy = ch / 2;
      const worldX = (cx - vp.x) / vp.scale;
      const worldY = (cy - vp.y) / vp.scale;
      return { x: cx - worldX * newScale, y: cy - worldY * newScale, scale: newScale };
    });
  }

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (focusId) handleUnfocus();
        else if (mode === 'edit') setMode('view');
      }
      if (e.key === 'e' && !e.metaKey && !e.ctrlKey && !focusId) {
        setMode(m => m === 'edit' ? 'view' : 'edit');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mode, focusId, handleUnfocus]);

  // ── Minimap data ───────────────────────────────────────────────────────────

  const minimapWidgets = useMemo(() =>
    widgets.map(w => ({ id: w.id, pos: w.pos })),
    [widgets],
  );

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background-primary">
        <div className="w-6 h-6 border-2 border-border-primary border-t-modules-aly rounded-full animate-spin" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const pct = Math.round(viewport.scale * 100);

  return (
    <div className="flex flex-col h-screen bg-background-primary overflow-hidden">

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center justify-between px-4 py-2.5 bg-background-secondary/80 backdrop-blur border-b border-border-primary z-20">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-background-tertiary transition-all"
          >
            <ArrowLeftIcon size={16} />
          </button>
          <span className="text-sm font-semibold text-text-primary">{screenName}</span>
          {focusId && (
            <button
              onClick={handleUnfocus}
              className="flex items-center gap-1.5 text-xs font-semibold text-modules-aly hover:opacity-80 transition-opacity"
            >
              <XIcon size={12} weight="bold" /> Back to canvas
            </button>
          )}
        </div>

        {/* Centre — mode toggle */}
        {!focusId && (
          <div className="flex items-center gap-1 bg-background-tertiary border border-border-primary rounded-lg p-0.5">
            {(['view', 'edit'] as CanvasMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all capitalize ${
                  mode === m
                    ? 'bg-background-secondary text-text-primary shadow-sm border border-border-primary'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                {m === 'view' ? <EyeIcon size={12} /> : <PencilSimpleIcon size={12} />}
                {m}
              </button>
            ))}
          </div>
        )}

        {/* Right — zoom + add */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-background-tertiary border border-border-primary rounded-lg px-1.5 py-1">
            <button onClick={() => zoomBy(0.8)} className="p-0.5 text-text-tertiary hover:text-text-primary transition-colors">
              <MagnifyingGlassMinusIcon size={13} />
            </button>
            <span className="text-[10px] font-bold text-text-secondary w-8 text-center tabular-nums">{pct}%</span>
            <button onClick={() => zoomBy(1.25)} className="p-0.5 text-text-tertiary hover:text-text-primary transition-colors">
              <MagnifyingGlassPlusIcon size={13} />
            </button>
          </div>

          {!focusId && (
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-modules-aly/10 border border-modules-aly/20 text-modules-aly text-xs font-bold rounded-lg hover:bg-modules-aly/20 transition-all"
            >
              <PlusIcon size={13} weight="bold" /> Add widget
            </button>
          )}
        </div>
      </header>

      {/* ── Canvas ───────────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{
          cursor: mode === 'view' ? 'grab' : 'default',
          touchAction: 'none',
          background: 'radial-gradient(circle at center, var(--background-secondary) 0%, var(--background-primary) 100%)',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        {/* Dot-grid background pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle, var(--border-primary) 1px, transparent 1px)`,
            backgroundSize: `${Math.max(16, 32 * viewport.scale)}px ${Math.max(16, 32 * viewport.scale)}px`,
            backgroundPosition: `${viewport.x % (32 * viewport.scale)}px ${viewport.y % (32 * viewport.scale)}px`,
          }}
        />

        {/* World — all widgets live here */}
        <div
          ref={worldRef}
          style={{
            position: 'absolute',
            top: 0, left: 0,
            transformOrigin: '0 0',
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
            transition: animating ? 'transform 0.35s cubic-bezier(0.4,0,0.2,1)' : 'none',
            willChange: 'transform',
          }}
        >
          {widgets.map(w => {
            const hub   = w.hub_id ? hubMap[w.hub_id]  : undefined;
            const space = hub?.space_id ? spaceMap[hub.space_id] : undefined;
            return (
              <CanvasWidgetNode
                key={w.id}
                widget={w}
                pos={w.pos}
                mode={focusId && focusId !== w.id ? 'view' : mode}
                scale={viewport.scale}
                userId={userId ?? undefined}
                spaces={spaces}
                hubs={hubs}
                hubName={hub?.name}
                spaceName={space?.name}
                isFocused={focusId === w.id}
                onDragStart={handleWidgetDragStart}
                onDelete={handleDeleteWidget}
                onFocus={handleFocus}
              />
            );
          })}
        </div>

        {/* Empty state */}
        {widgets.length === 0 && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none">
            <div className="w-14 h-14 rounded-2xl bg-modules-aly/10 border border-modules-aly/20 flex items-center justify-center">
              <SparkleIcon size={28} className="text-modules-aly/60" weight="duotone" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-text-primary">Your canvas is empty</p>
              <p className="text-xs text-text-tertiary mt-1">Click "Add widget" to place your first widget anywhere.</p>
            </div>
          </div>
        )}

        {/* Minimap */}
        <CanvasMinimap
          widgets={minimapWidgets}
          viewport={viewport}
          containerW={containerSize.current.w || 1000}
          containerH={containerSize.current.h || 700}
          onViewportChange={setViewport}
        />

        {/* Edit mode hint */}
        {mode === 'edit' && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-background-secondary/90 backdrop-blur border border-border-primary rounded-full shadow-lg pointer-events-none">
            <PencilSimpleIcon size={11} className="text-modules-aly" />
            <span className="text-[10px] font-bold text-text-secondary">Edit mode — drag widgets to reposition · ESC or E to exit</span>
          </div>
        )}

        {/* Focus mode dim overlay for unfocused widgets */}
        {focusId && (
          <div
            className="absolute inset-0 bg-black/40 pointer-events-none"
            style={{ zIndex: 0 }}
          />
        )}
      </div>

      {/* Add Widget Modal */}
      <AddWidgetModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        spaces={spaces}
        onAdd={handleAddWidget}
      />
    </div>
  );
}
