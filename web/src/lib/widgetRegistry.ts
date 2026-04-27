/**
 * Widget Registry
 *
 * Single source of truth for all widget types in TAKDA.
 * Used by: Screen Editor, AddWidgetModal, WidgetCard, Module Creator.
 *
 * Adding a new widget type:
 *   1. Add its type string to the WidgetType union in screens.service.ts
 *   2. Add an entry here in WIDGET_REGISTRY
 *   3. Add a sub-renderer in WidgetCard.tsx
 */

export type WidgetCategory = 'tracking' | 'productivity' | 'assistant' | 'hub' | 'overview';

export interface ConfigFieldOption {
  value: string | number;
  label: string;
}

export interface WidgetConfigField {
  type: 'string' | 'number' | 'boolean' | 'select';
  label: string;
  placeholder?: string;
  defaultValue?: unknown;
  options?: ConfigFieldOption[];
  required?: boolean;
  min?: number;
  max?: number;
}

export interface WidgetTypeDefinition {
  type: string;
  label: string;
  description: string;
  category: WidgetCategory;
  /** Does not require a hub to function */
  isGlobal: boolean;
  /** Needs a habit_id in config (set up on first render) */
  requiresHabit?: boolean;
  /** Default values merged into config on creation */
  defaultConfig: Record<string, unknown>;
  /** Fields the user can configure via a settings panel */
  configFields: Record<string, WidgetConfigField>;
  defaultColSpan: 1 | 2 | 3;
  /** CSS variable string or hex for accent colour */
  accentColor: string;
}

// ── Shared defaults for hub (non-global) widgets ──────────────────────────────

const H = (
  type: string, label: string, description: string,
  category: WidgetCategory, accentColor: string, defaultColSpan: 1 | 2 | 3 = 1,
): WidgetTypeDefinition => ({
  type, label, description, category, accentColor, defaultColSpan,
  isGlobal: false,
  defaultConfig: {},
  configFields: {},
});

// ── New core widget definitions ───────────────────────────────────────────────

export const WIDGET_REGISTRY: Record<string, WidgetTypeDefinition> = {

  // ── Existing hub widgets (metadata only — rendering unchanged) ────────────
  hub_overview:    H('hub_overview',    'Hub Overview',    'Task progress and status breakdown.',         'hub',      'var(--modules-track)'    ),
  tasks:           H('tasks',           'Tasks',           'Open task list from a hub.',                 'hub',      'var(--modules-track)'    ),
  notes:           H('notes',           'Notes',           'Recent annotations from a hub.',             'hub',      'var(--modules-aly)'      ),
  docs:            H('docs',            'Resources',       'Documents & links from a hub.',              'hub',      'var(--modules-knowledge)'),
  outcomes:        H('outcomes',        'Outcomes',        'Recent deliveries from a hub.',              'hub',      'var(--modules-deliver)'  ),
  calorie_counter: H('calorie_counter', 'Calorie Counter', "Today's calorie summary.",                   'tracking', '#22c55e'                ),
  expense_tracker: H('expense_tracker', 'Expense Tracker', "This month's spending total.",               'tracking', 'var(--modules-deliver)'  ),
  upcoming_events: H('upcoming_events', 'Upcoming Events', 'Next 5 calendar events from a hub.',        'hub',      'var(--modules-automate)' ),
  sleep_tracker:   H('sleep_tracker',   'Sleep Tracker',   'Latest sleep log.',                          'tracking', '#818cf8'                ),
  workout_log:     H('workout_log',     'Workout Log',     'Last workout & weekly session count.',       'tracking', '#f59e0b'                ),

  // ── Existing global widgets ───────────────────────────────────────────────
  space_pulse:     { type: 'space_pulse',     isGlobal: true, label: 'Space Pulse',    description: 'Count of spaces & hubs at a glance.',     category: 'overview',     defaultColSpan: 1, accentColor: 'var(--modules-aly)',       defaultConfig: {}, configFields: {} },
  quick_clock:     { type: 'quick_clock',     isGlobal: true, label: 'Quick Clock',    description: "Live clock and today's date.",            category: 'overview',     defaultColSpan: 1, accentColor: 'var(--modules-knowledge)', defaultConfig: {}, configFields: {} },
  weekly_progress: { type: 'weekly_progress', isGlobal: true, label: 'Weekly Progress',description: 'Task completion across all your hubs.',   category: 'productivity', defaultColSpan: 1, accentColor: 'var(--modules-track)',     defaultConfig: {}, configFields: {} },
  upcoming_global: { type: 'upcoming_global', isGlobal: true, label: 'Upcoming (All)', description: 'Next events across all your hubs.',       category: 'hub',          defaultColSpan: 1, accentColor: 'var(--modules-automate)', defaultConfig: {}, configFields: {} },
  strava_stats:    { type: 'strava_stats',    isGlobal: true, label: 'Strava Stats',   description: 'Recent synced Strava runs & rides.',      category: 'tracking',     defaultColSpan: 3, accentColor: '#fc4c02',                 defaultConfig: {}, configFields: {} },

  // ── NEW: Counter ──────────────────────────────────────────────────────────
  counter: {
    type: 'counter',
    label: 'Counter',
    description: 'Track a numeric value with +/- controls, an optional goal, and a unit.',
    category: 'tracking',
    isGlobal: true,
    defaultConfig: { label: 'Counter', value: 0, goal: null, unit: '', step: 1 },
    configFields: {
      label: { type: 'string',  label: 'Counter name', required: true, placeholder: 'Steps, cups of water…' },
      unit:  { type: 'string',  label: 'Unit',         placeholder: 'steps, cups, pages…' },
      goal:  { type: 'number',  label: 'Daily goal',   min: 0 },
      step:  { type: 'number',  label: 'Increment by', defaultValue: 1, min: 1 },
    },
    defaultColSpan: 1,
    accentColor: '#6366f1',
  },

  // ── NEW: Checklist ────────────────────────────────────────────────────────
  checklist: {
    type: 'checklist',
    label: 'Checklist',
    description: 'A persistent to-do list that lives on your screen.',
    category: 'productivity',
    isGlobal: true,
    defaultConfig: { items: [] },
    configFields: {},
    defaultColSpan: 1,
    accentColor: 'var(--modules-track)',
  },

  // ── NEW: Chart ────────────────────────────────────────────────────────────
  chart: {
    type: 'chart',
    label: 'Chart',
    description: 'Line or bar chart showing habit completion over time.',
    category: 'tracking',
    isGlobal: true,
    requiresHabit: true,
    defaultConfig: { habit_id: null, chart_type: 'bar', days: 14 },
    configFields: {
      chart_type: {
        type: 'select',
        label: 'Chart type',
        options: [{ value: 'bar', label: 'Bar' }, { value: 'line', label: 'Line' }],
      },
      days: {
        type: 'select',
        label: 'Period',
        options: [{ value: 7, label: '7 days' }, { value: 14, label: '14 days' }, { value: 28, label: '28 days' }],
      },
    },
    defaultColSpan: 2,
    accentColor: '#6366f1',
  },

  // ── NEW: Streak (Habit Module) ────────────────────────────────────────────
  streak: {
    type: 'streak',
    label: 'Streak',
    description: 'Track consecutive days of completing a habit. Tap to log today.',
    category: 'tracking',
    isGlobal: true,
    requiresHabit: true,
    defaultConfig: { habit_id: null, name: 'My Habit', color: '#6366f1' },
    configFields: {
      name:  { type: 'string', label: 'Habit name', required: true, placeholder: 'Meditate, read, exercise…' },
      color: { type: 'string', label: 'Accent color', placeholder: '#6366f1' },
    },
    defaultColSpan: 1,
    accentColor: '#6366f1',
  },

  // ── NEW: Aly Nudge ────────────────────────────────────────────────────────
  aly_nudge: {
    type: 'aly_nudge',
    label: 'Aly Nudge',
    description: 'A daily personalised message from your assistant.',
    category: 'assistant',
    isGlobal: true,
    defaultConfig: {},
    configFields: {},
    defaultColSpan: 2,
    accentColor: 'var(--modules-aly)',
  },

  // ── NEW: Hub Snapshot ─────────────────────────────────────────────────────
  hub_snapshot: {
    type: 'hub_snapshot',
    label: 'Hub Snapshot',
    description: 'Latest activity from a hub with a short AI summary.',
    category: 'hub',
    isGlobal: false,
    defaultConfig: {},
    configFields: {},
    defaultColSpan: 2,
    accentColor: 'var(--modules-knowledge)',
  },
};

export function getWidgetDef(type: string): WidgetTypeDefinition | undefined {
  return WIDGET_REGISTRY[type];
}

export const GLOBAL_WIDGET_TYPES = new Set(
  Object.values(WIDGET_REGISTRY).filter(d => d.isGlobal).map(d => d.type)
);

export const HABIT_WIDGET_TYPES = new Set(
  Object.values(WIDGET_REGISTRY).filter(d => d.requiresHabit).map(d => d.type)
);
