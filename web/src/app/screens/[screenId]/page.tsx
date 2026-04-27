"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeftIcon, CheckCircleIcon, PencilSimpleIcon, FileTextIcon,
  PaperPlaneRightIcon, PuzzlePieceIcon, XIcon, AppWindowIcon,
  DotsSixVerticalIcon, PlusIcon, ForkKnifeIcon, CurrencyDollarIcon,
  CheckIcon, CalendarCheckIcon, MoonIcon, LightningIcon,
  ChartPieSliceIcon, ClockIcon, TrendUpIcon, BicycleIcon,
  FlameIcon, ChartBarIcon, SparkleIcon, CameraIcon, CheckSquareIcon,
  EyeIcon,
} from '@phosphor-icons/react';
import { supabase } from '@/services/supabase';
import { screensService, Screen, ScreenWidget, WidgetType } from '@/services/screens.service';
import { spacesService, Space } from '@/services/spaces.service';
import { hubsService, Hub } from '@/services/hubs.service';
import { CanvasScreen } from '@/components/screens/canvas/CanvasScreen';
import { WidgetCard } from '@/components/screens/WidgetCard';

// ── Widget metadata ───────────────────────────────────────────────────────────

const WIDGET_META: Record<WidgetType, {
  label: string;
  Icon: React.ElementType;
  color: string;
  desc: string;
}> = {
  // ── New core widgets ─────────────────────────────────────────────────────
  counter:          { label: 'Counter',          Icon: PlusIcon,           color: '#6366f1',                  desc: 'Numeric counter with goal'     },
  checklist:        { label: 'Checklist',        Icon: CheckSquareIcon,    color: 'var(--modules-track)',     desc: 'Persistent to-do list'         },
  streak:           { label: 'Streak',           Icon: FlameIcon,          color: '#f97316',                  desc: 'Consecutive-day habit tracker' },
  chart:            { label: 'Chart',            Icon: ChartBarIcon,       color: '#6366f1',                  desc: 'Habit completion chart'        },
  aly_nudge:        { label: 'Aly Nudge',        Icon: SparkleIcon,        color: 'var(--modules-aly)',       desc: 'Daily AI message'              },
  // ── Hub widgets ──────────────────────────────────────────────────────────
  hub_snapshot:     { label: 'Hub Snapshot',     Icon: CameraIcon,         color: 'var(--modules-knowledge)', desc: 'Hub activity + AI summary'    },
  tasks:            { label: 'Tasks',            Icon: CheckCircleIcon,    color: 'var(--modules-track)',     desc: 'Active tasks from a hub'       },
  notes:            { label: 'Notes',            Icon: PencilSimpleIcon,   color: 'var(--modules-aly)',       desc: 'Annotations & notes'           },
  docs:             { label: 'Resources',        Icon: FileTextIcon,       color: 'var(--modules-knowledge)', desc: 'Knowledge documents'           },
  outcomes:         { label: 'Outcomes',         Icon: PaperPlaneRightIcon,color: 'var(--modules-deliver)',   desc: 'Deliverables tracker'          },
  hub_overview:     { label: 'Hub Overview',     Icon: PuzzlePieceIcon,    color: 'var(--modules-track)',     desc: 'Hub progress at a glance'      },
  calorie_counter:  { label: 'Calorie Counter',  Icon: ForkKnifeIcon,      color: '#22c55e',                  desc: "Today's calorie summary"       },
  expense_tracker:  { label: 'Expense Tracker',  Icon: CurrencyDollarIcon, color: 'var(--modules-deliver)',   desc: "This month's spending total"   },
  upcoming_events:  { label: 'Upcoming Events',  Icon: CalendarCheckIcon,  color: 'var(--modules-automate)',  desc: 'Next calendar events'          },
  sleep_tracker:    { label: 'Sleep Tracker',    Icon: MoonIcon,           color: '#818cf8',                  desc: 'Recent sleep log'              },
  workout_log:      { label: 'Workout Log',      Icon: LightningIcon,      color: '#f59e0b',                  desc: 'Latest workout session'        },
  // ── Global widgets (no hub needed) ───────────────────────────────────────
  space_pulse:      { label: 'Space Pulse',      Icon: ChartPieSliceIcon,  color: 'var(--modules-aly)',       desc: 'Spaces & hubs at a glance'     },
  quick_clock:      { label: 'Quick Clock',      Icon: ClockIcon,          color: 'var(--modules-knowledge)', desc: 'Live time & date'              },
  weekly_progress:  { label: 'Weekly Progress',  Icon: TrendUpIcon,        color: 'var(--modules-track)',     desc: 'Task completion across hubs'   },
  upcoming_global:  { label: 'Upcoming (All)',   Icon: CalendarCheckIcon,  color: 'var(--modules-automate)',  desc: 'Events across all your hubs'   },
  strava_stats:     { label: 'Strava Stats',     Icon: BicycleIcon,        color: '#fc4c02',                  desc: 'Recent synced Strava runs'     },
};

/** These types do NOT require a hub to be set */
const GLOBAL_WIDGET_TYPES = new Set<WidgetType>([
  'counter', 'checklist', 'streak', 'chart', 'aly_nudge',
  'space_pulse', 'quick_clock', 'weekly_progress', 'upcoming_global', 'strava_stats',
]);

const CORE_PALETTE_ITEMS = (
  ['counter', 'checklist', 'streak', 'chart', 'aly_nudge'] as WidgetType[]
).map(type => ({ type, ...WIDGET_META[type] }));

const HUB_PALETTE_ITEMS = (
  ['hub_snapshot','tasks','notes','docs','outcomes','hub_overview','calorie_counter',
   'expense_tracker','upcoming_events','sleep_tracker','workout_log'] as WidgetType[]
).map(type => ({ type, ...WIDGET_META[type] }));

const GLOBAL_PALETTE_ITEMS = (
  ['space_pulse','quick_clock','weekly_progress','upcoming_global','strava_stats'] as WidgetType[]
).map(type => ({ type, ...WIDGET_META[type] }));

// ── Canvas item ───────────────────────────────────────────────────────────────

interface CanvasItem {
  id: string;        // DB id
  type: WidgetType;
  colSpan: 1 | 2 | 3;
  hubId: string | null;
}

const COL_SPAN_CLASS: Record<1 | 2 | 3, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
};

// ── Canvas widget card ────────────────────────────────────────────────────────

function CanvasWidgetCard({
  item, onDelete, onResize, onHubChange, isDragging, isOver, hubMap, spaceMap,
}: {
  item: CanvasItem;
  onDelete: () => void;
  onResize: (n: 1 | 2 | 3) => void;
  onHubChange: (hubId: string | null) => void;
  isDragging: boolean;
  isOver: boolean;
  hubMap: Record<string, Hub>;
  spaceMap: Record<string, Space>;
}) {
  const isGlobal = GLOBAL_WIDGET_TYPES.has(item.type);
  const { label, Icon, color } = WIDGET_META[item.type];
  const [editingHub, setEditingHub] = useState(!item.hubId);
  const [selectedHubId, setSelectedHubId] = useState(item.hubId ?? '');
  const [saving, setSaving] = useState(false);

  const hub   = item.hubId ? hubMap[item.hubId]  : undefined;
  const space = hub?.space_id ? spaceMap[hub.space_id] : undefined;

  // Group hubs by space for the select
  const groupedHubs = useMemo(() => {
    const groups: Record<string, { space: Space; hubs: Hub[] }> = {};
    Object.values(hubMap).forEach(h => {
      const s = h.space_id ? spaceMap[h.space_id] : null;
      if (!s) return;
      if (!groups[s.id]) groups[s.id] = { space: s, hubs: [] };
      groups[s.id].hubs.push(h);
    });
    return Object.values(groups);
  }, [hubMap, spaceMap]);

  async function confirmHub() {
    setSaving(true);
    try {
      await onHubChange(selectedHubId || null);
      setEditingHub(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={`bg-background-secondary border rounded-xl overflow-hidden select-none transition-all ${
        isDragging ? 'opacity-30 scale-[0.97]' : ''
      } ${isOver ? 'ring-2 ring-modules-aly border-modules-aly/40' : 'border-border-primary'}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-border-primary/50 bg-background-tertiary/30">
        <DotsSixVerticalIcon size={14} className="text-text-tertiary/50 cursor-grab active:cursor-grabbing shrink-0" weight="bold" />
        <Icon size={13} style={{ color }} className="shrink-0" weight="duotone" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-text-primary">{label}</p>
          {hub && !editingHub && (
            <p className="text-[10px] text-text-tertiary truncate">
              {space?.name && <span>{space.name} · </span>}{hub.name}
            </p>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="text-text-tertiary hover:text-red-400 transition-colors shrink-0"
        >
          <XIcon size={13} />
        </button>
      </div>

      {/* Hub selector — hidden for global widgets */}
      {!isGlobal && (editingHub ? (
        <div className="px-3 py-3 border-b border-border-primary/50 flex flex-col gap-2">
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Select Hub</p>
          <select
            value={selectedHubId}
            onChange={e => setSelectedHubId(e.target.value)}
            className="text-xs bg-background-primary border border-border-primary rounded-lg px-2 py-1.5 text-text-primary focus:outline-none focus:border-modules-aly/40 w-full"
            autoFocus
          >
            <option value="">— No hub —</option>
            {groupedHubs.map(g => (
              <optgroup key={g.space.id} label={g.space.name}>
                {g.hubs.map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={confirmHub}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 text-[10px] font-bold bg-modules-aly text-white rounded-lg py-1.5 disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              <CheckIcon size={11} weight="bold" />
              {saving ? 'Saving…' : 'Confirm'}
            </button>
            {item.hubId && (
              <button
                onClick={() => setEditingHub(false)}
                className="text-[10px] text-text-tertiary hover:text-text-primary px-2"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="px-3 py-2 border-b border-border-primary/50 flex items-center justify-between">
          {hub ? (
            <p className="text-[10px] text-text-tertiary truncate">{hub.name}</p>
          ) : (
            <p className="text-[10px] text-amber-500">No hub selected</p>
          )}
          <button
            onClick={() => { setSelectedHubId(item.hubId ?? ''); setEditingHub(true); }}
            className="text-[10px] font-semibold text-modules-aly hover:opacity-70 transition-opacity shrink-0 ml-2"
          >
            {hub ? 'Change' : 'Select hub'}
          </button>
        </div>
      ))}
      {isGlobal && (
        <div className="px-3 py-2 border-b border-border-primary/50">
          <p className="text-[10px] text-text-tertiary/60 italic">Global widget — no hub needed</p>
        </div>
      )}

      {/* Widget preview placeholder */}
      <div className="flex flex-col items-center justify-center py-6 gap-1.5 px-4">
        <Icon size={26} style={{ color }} className="opacity-15" weight="duotone" />
        <p className="text-[10px] text-text-tertiary text-center">{WIDGET_META[item.type].desc}</p>
      </div>

      {/* Size controls */}
      <div className="flex items-center gap-1.5 px-3 pb-3">
        <span className="text-[9px] font-bold text-text-tertiary/60 uppercase tracking-widest mr-0.5">Size</span>
        {([1, 2, 3] as const).map(n => (
          <button
            key={n}
            onClick={e => { e.stopPropagation(); onResize(n); }}
            className={`text-[9px] font-bold px-2 py-1 rounded-md transition-all ${
              item.colSpan === n
                ? 'bg-modules-aly text-white'
                : 'bg-background-tertiary text-text-tertiary hover:text-text-primary border border-border-primary'
            }`}
          >
            {n === 1 ? 'S' : n === 2 ? 'M' : 'L'}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Empty drop zone ───────────────────────────────────────────────────────────

function EmptyDropZone({ isOver }: { isOver: boolean }) {
  return (
    <div
      className={`flex flex-col items-center justify-center min-h-96 rounded-2xl border-2 border-dashed transition-all duration-200 gap-4 pointer-events-none ${
        isOver ? 'border-modules-aly/60 bg-modules-aly/5' : 'border-border-primary/40'
      }`}
    >
      <AppWindowIcon
        size={44}
        className={`transition-colors ${isOver ? 'text-modules-aly/40' : 'text-text-tertiary/20'}`}
        weight="duotone"
      />
      <div className="text-center">
        <p className={`text-sm font-medium transition-colors ${isOver ? 'text-modules-aly' : 'text-text-tertiary'}`}>
          {isOver ? 'Drop to add widget' : 'Drag widgets from the palette'}
        </p>
        <p className="text-xs text-text-tertiary/60 mt-1">Your canvas is empty — start designing</p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ScreenEditorPage() {
  const params   = useParams();
  const router   = useRouter();
  const screenId = params.screenId as string;

  const [screen,        setScreen]        = useState<Screen | null>(null);
  const [canvas,        setCanvas]        = useState<CanvasItem[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [viewMode,      setViewMode]      = useState<'preview' | 'edit'>('edit');
  const [userId,        setUserId]        = useState<string | null>(null);
  const [screenWidgets, setScreenWidgets] = useState<ScreenWidget[]>([]);

  // Hub / space data for the picker
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [hubs,   setHubs]   = useState<Hub[]>([]);

  const hubMap   = useMemo(() => Object.fromEntries(hubs.map(h  => [h.id,  h])),  [hubs]);
  const spaceMap = useMemo(() => Object.fromEntries(spaces.map(s => [s.id, s])),  [spaces]);

  // Drag state
  const [paletteDrag,   setPaletteDrag]   = useState<WidgetType | null>(null);
  const [canvasDragIdx, setCanvasDragIdx] = useState<number | null>(null);
  const [canvasOverIdx, setCanvasOverIdx] = useState<number | null>(null);
  const [isOverCanvas,  setIsOverCanvas]  = useState(false);

  // Adding state (spinner while createWidget is in flight)
  const [addingType, setAddingType] = useState<WidgetType | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const [screens, widgets, spacesData] = await Promise.all([
        screensService.getUserScreens(user.id),
        screensService.getWidgets(screenId),
        spacesService.getSpaces(user.id),
      ]);

      const found = screens.find(s => s.id === screenId) ?? null;
      setScreen(found);
      setSpaces(spacesData);
      setScreenWidgets(widgets);

      if (spacesData.length > 0) {
        const hubLists = await Promise.all(spacesData.map(s => hubsService.getHubsBySpace(s.id)));
        setHubs(hubLists.flat());
      }

      // Canvas screens manage their own data — stop loading here for routing
      if (found?.layout_type === 'canvas') { setLoading(false); return; }

      const sorted = [...widgets].sort((a, b) => a.position - b.position);
      setCanvas(sorted.map(w => ({
        id:      w.id,
        type:    w.type,
        colSpan: ((w.config?.colSpan as 1 | 2 | 3) ?? 1),
        hubId:   w.hub_id ?? null,
      })));
      setLoading(false);
    })();
  }, [screenId]);

  // ── Canvas operations (all persist to DB) ────────────────────────────────

  async function addWidget(type: WidgetType, atIdx?: number) {
    setAddingType(type);
    try {
      // Default colSpan per type
      const defaultSpan: 1 | 2 | 3 =
        type === 'strava_stats' ? 3
        : type === 'chart' || type === 'aly_nudge' || type === 'hub_snapshot' ? 2
        : 1;

      // Initial config defaults for new interactive widget types
      const initialConfig: Record<string, unknown> = { colSpan: defaultSpan };
      if (type === 'counter')   Object.assign(initialConfig, { label: 'Counter', value: 0, goal: null, unit: '', step: 1 });
      if (type === 'checklist') Object.assign(initialConfig, { items: [] });
      if (type === 'streak')    Object.assign(initialConfig, { habit_id: null, name: 'My Habit', color: '#f97316' });
      if (type === 'chart')     Object.assign(initialConfig, { habit_id: null, chart_type: 'bar', days: 14 });

      const w = await screensService.createWidget({
        screen_id: screenId,
        type,
        hub_id:    null,
        position:  atIdx ?? canvas.length,
        config:    initialConfig,
      });
      const item: CanvasItem = { id: w.id, type: w.type, colSpan: defaultSpan, hubId: null };
      // Persist the default colSpan immediately if not 1
      if (defaultSpan !== 1) {
        screensService.updateWidget(w.id, { config: initialConfig }).catch(console.error);
      }
      setCanvas(prev => {
        const next = [...prev];
        if (atIdx !== undefined) next.splice(atIdx, 0, item);
        else next.push(item);
        return next;
      });
      setScreenWidgets(prev => [...prev, w]);
    } catch (err) {
      console.error('Failed to add widget:', err);
    } finally {
      setAddingType(null);
    }
  }

  async function deleteWidget(id: string) {
    setCanvas(prev => prev.filter(w => w.id !== id));
    setScreenWidgets(prev => prev.filter(w => w.id !== id));
    try {
      await screensService.deleteWidget(id);
    } catch (err) {
      console.error('Failed to delete widget:', err);
    }
  }

  async function updateHub(id: string, hubId: string | null) {
    try {
      await screensService.updateWidget(id, { hub_id: hubId });
      setCanvas(prev => prev.map(w => w.id === id ? { ...w, hubId } : w));
    } catch (err) {
      console.error('Failed to update widget hub:', err);
    }
  }

  function resizeWidget(id: string, colSpan: 1 | 2 | 3) {
    // Optimistic update, then persist to DB
    setCanvas(prev => prev.map(w => w.id === id ? { ...w, colSpan } : w));
    screensService.updateWidget(id, { config: { colSpan } }).catch(console.error);
  }

  function reorder(fromIdx: number, toIdx: number) {
    setCanvas(prev => {
      const next = [...prev];
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      // Persist new positions for all widgets in background
      next.forEach((w, i) => {
        screensService.updateWidget(w.id, { position: i }).catch(console.error);
      });
      return next;
    });
  }

  // ── Drag handlers ────────────────────────────────────────────────────────

  function handleCanvasDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (paletteDrag) setIsOverCanvas(true);
  }

  function handleCanvasDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsOverCanvas(false);
  }

  function handleCanvasDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsOverCanvas(false);
    if (paletteDrag && canvasOverIdx === null) {
      addWidget(paletteDrag);
      setPaletteDrag(null);
    }
    setCanvasDragIdx(null);
    setCanvasOverIdx(null);
  }

  function handleItemDragStart(e: React.DragEvent, i: number) {
    setCanvasDragIdx(i);
    setPaletteDrag(null);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleItemDragEnter(i: number) {
    if (canvasDragIdx !== null && canvasDragIdx !== i) setCanvasOverIdx(i);
    else if (paletteDrag) setCanvasOverIdx(i);
  }

  function handleItemDrop(e: React.DragEvent, i: number) {
    e.preventDefault();
    e.stopPropagation();
    if (paletteDrag) {
      addWidget(paletteDrag, i);
      setPaletteDrag(null);
    } else if (canvasDragIdx !== null && canvasDragIdx !== i) {
      reorder(canvasDragIdx, i);
    }
    setCanvasDragIdx(null);
    setCanvasOverIdx(null);
  }

  function handleDragEnd() {
    setCanvasDragIdx(null);
    setCanvasOverIdx(null);
    setIsOverCanvas(false);
    setPaletteDrag(null);
  }

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-text-tertiary text-sm">Loading editor…</p>
      </div>
    );
  }

  if (!screen) {
    return <div className="p-20 text-center text-text-tertiary">Screen not found.</div>;
  }

  // ── Canvas screens get their own dedicated UI ─────────────────────────────
  if (screen.layout_type === 'canvas') {
    return <CanvasScreen screenId={screenId} screenName={screen.name} />;
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)]">

      {/* ── Canvas ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 p-6 gap-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/screens')}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary hover:bg-background-secondary transition-all shrink-0"
          >
            <ArrowLeftIcon size={15} weight="bold" />
          </button>
          <div className="w-8 h-8 rounded-xl bg-modules-aly/10 border border-modules-aly/20 flex items-center justify-center text-modules-aly shrink-0">
            <AppWindowIcon size={15} weight="duotone" />
          </div>
          <h1 className="text-lg font-bold text-text-primary truncate">{screen.name}</h1>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            {addingType && (
              <span className="text-[10px] text-modules-aly bg-modules-aly/10 border border-modules-aly/20 px-2.5 py-1 rounded-lg animate-pulse">
                Adding {WIDGET_META[addingType].label}…
              </span>
            )}
            {canvas.length > 0 && viewMode === 'edit' && (
              <span className="text-[10px] text-text-tertiary bg-background-secondary border border-border-primary px-2.5 py-1 rounded-lg">
                {canvas.length} widget{canvas.length !== 1 ? 's' : ''}
              </span>
            )}
            {/* Preview / Edit toggle */}
            <div className="flex items-center gap-0.5 bg-background-tertiary border border-border-primary rounded-lg p-0.5">
              {(['preview', 'edit'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all capitalize ${
                    viewMode === m
                      ? 'bg-background-secondary text-text-primary shadow-sm border border-border-primary'
                      : 'text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  {m === 'preview' ? <EyeIcon size={11} /> : <PencilSimpleIcon size={11} />}
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Preview mode ─────────────────────────────────────────────── */}
        {viewMode === 'preview' && (
          <div className="flex-1">
            {screenWidgets.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-center">
                <AppWindowIcon size={32} className="text-text-tertiary/20" weight="duotone" />
                <p className="text-sm text-text-tertiary">No widgets yet — switch to Edit to add some.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {[...screenWidgets]
                  .sort((a, b) => a.position - b.position)
                  .map(w => {
                    const colSpan = Math.min(3, Math.max(1, Number(w.config?.colSpan ?? 1))) as 1 | 2 | 3;
                    const colClass = ({ 1: 'col-span-1', 2: 'col-span-2', 3: 'col-span-3' } as const)[colSpan];
                    const hub   = w.hub_id ? hubMap[w.hub_id]  : undefined;
                    const space = hub?.space_id ? spaceMap[hub.space_id] : undefined;
                    return (
                      <div key={w.id} className={colClass}>
                        <WidgetCard
                          widget={w}
                          hubName={hub?.name}
                          spaceName={space?.name}
                          userId={userId ?? undefined}
                          spaces={spaces}
                          hubs={hubs}
                        />
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ── Edit mode grid ────────────────────────────────────────────── */}
        {viewMode === 'edit' && (
        <div
          className="flex-1"
          onDragOver={handleCanvasDragOver}
          onDragLeave={handleCanvasDragLeave}
          onDrop={handleCanvasDrop}
        >
          {canvas.length === 0 ? (
            <EmptyDropZone isOver={isOverCanvas} />
          ) : (
            <div className="grid grid-cols-3 gap-4 auto-rows-auto">
              {canvas.map((item, i) => (
                <div
                  key={item.id}
                  className={`${COL_SPAN_CLASS[item.colSpan]} cursor-grab active:cursor-grabbing`}
                  draggable
                  onDragStart={e => handleItemDragStart(e, i)}
                  onDragEnd={handleDragEnd}
                  onDragEnter={() => handleItemDragEnter(i)}
                  onDragOver={e => { e.preventDefault(); e.stopPropagation(); setIsOverCanvas(false); }}
                  onDrop={e => handleItemDrop(e, i)}
                >
                  <CanvasWidgetCard
                    item={item}
                    isDragging={canvasDragIdx === i}
                    isOver={canvasOverIdx === i}
                    hubMap={hubMap}
                    spaceMap={spaceMap}
                    onDelete={() => deleteWidget(item.id)}
                    onResize={n => resizeWidget(item.id, n)}
                    onHubChange={hubId => updateHub(item.id, hubId)}
                  />
                </div>
              ))}

              {/* Drop zone at end */}
              <div
                className={`col-span-3 border-2 border-dashed rounded-xl py-5 flex items-center justify-center gap-2 transition-all duration-200 ${
                  isOverCanvas && paletteDrag && canvasOverIdx === null
                    ? 'border-modules-aly/60 bg-modules-aly/5 text-modules-aly'
                    : 'border-border-primary/30 text-text-tertiary/40'
                }`}
              >
                <PlusIcon size={13} weight="bold" />
                <span className="text-xs font-medium">Drop here to add at end</span>
              </div>
            </div>
          )}
        </div>
        )}
      </div>

      {/* ── Widget palette sidebar (edit mode only) ───────────────────────── */}
      {viewMode === 'edit' && (
      <aside
        className="w-64 shrink-0 border-l border-border-primary flex flex-col"
        style={{ position: 'sticky', top: 0, alignSelf: 'start', maxHeight: 'calc(100vh - 64px)', overflowY: 'auto' }}
      >
        <div className="px-5 py-4 border-b border-border-primary">
          <p className="text-xs font-bold text-text-primary">Widget Palette</p>
          <p className="text-[10px] text-text-tertiary mt-0.5">Drag onto the canvas to add</p>
        </div>

        <div className="flex-1 p-3 flex flex-col gap-4">

          {/* Core / tracking widgets */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[9px] font-bold text-text-tertiary/60 uppercase tracking-widest px-1 pt-1">Tracking</p>
            {CORE_PALETTE_ITEMS.map(def => (
              <div
                key={def.type}
                draggable
                onDragStart={() => { setPaletteDrag(def.type); setCanvasDragIdx(null); }}
                onDragEnd={handleDragEnd}
                className={`border rounded-xl p-3 cursor-grab active:cursor-grabbing flex items-center gap-3 transition-all ${
                  paletteDrag === def.type
                    ? 'opacity-40 scale-95 border-modules-aly/30 bg-modules-aly/5'
                    : 'bg-background-secondary border-border-primary hover:border-modules-aly/30'
                }`}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${def.color} 12%, transparent)`,
                    borderColor:     `color-mix(in srgb, ${def.color} 20%, transparent)`,
                  }}
                >
                  <def.Icon size={17} style={{ color: def.color }} weight="duotone" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-text-primary leading-tight">{def.label}</p>
                  <p className="text-[10px] text-text-tertiary mt-0.5 leading-tight truncate">{def.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border-primary/40" />

          {/* Hub widgets section */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[9px] font-bold text-text-tertiary/60 uppercase tracking-widest px-1 pt-1">Hub Widgets</p>
            {HUB_PALETTE_ITEMS.map(def => (
              <div
                key={def.type}
                draggable
                onDragStart={() => { setPaletteDrag(def.type); setCanvasDragIdx(null); }}
                onDragEnd={handleDragEnd}
                className={`border rounded-xl p-3 cursor-grab active:cursor-grabbing flex items-center gap-3 transition-all ${
                  paletteDrag === def.type
                    ? 'opacity-40 scale-95 border-modules-aly/30 bg-modules-aly/5'
                    : 'bg-background-secondary border-border-primary hover:border-modules-aly/30'
                }`}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${def.color} 12%, transparent)`,
                    borderColor:     `color-mix(in srgb, ${def.color} 20%, transparent)`,
                  }}
                >
                  <def.Icon size={17} style={{ color: def.color }} weight="duotone" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-text-primary leading-tight">{def.label}</p>
                  <p className="text-[10px] text-text-tertiary mt-0.5 leading-tight truncate">{def.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-border-primary/40" />

          {/* Global widgets section */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[9px] font-bold text-text-tertiary/60 uppercase tracking-widest px-1">Global Widgets</p>
            <p className="text-[9px] text-text-tertiary/40 px-1 -mt-1 mb-0.5">No hub required</p>
            {GLOBAL_PALETTE_ITEMS.map(def => (
              <div
                key={def.type}
                draggable
                onDragStart={() => { setPaletteDrag(def.type); setCanvasDragIdx(null); }}
                onDragEnd={handleDragEnd}
                className={`border rounded-xl p-3 cursor-grab active:cursor-grabbing flex items-center gap-3 transition-all ${
                  paletteDrag === def.type
                    ? 'opacity-40 scale-95 border-modules-aly/30 bg-modules-aly/5'
                    : 'bg-background-secondary border-border-primary hover:border-modules-aly/30'
                }`}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${def.color} 12%, transparent)`,
                    borderColor:     `color-mix(in srgb, ${def.color} 20%, transparent)`,
                  }}
                >
                  <def.Icon size={17} style={{ color: def.color }} weight="duotone" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-text-primary leading-tight">{def.label}</p>
                  <p className="text-[10px] text-text-tertiary mt-0.5 leading-tight truncate">{def.desc}</p>
                </div>
              </div>
            ))}
          </div>

        </div>

        <div className="px-5 py-4 border-t border-border-primary">
          <p className="text-[10px] text-text-tertiary leading-relaxed">
            Select a hub after dropping. Resize with S / M / L. Drag to reorder.
          </p>
        </div>
      </aside>
      )}

    </div>
  );
}
