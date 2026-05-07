// ── Appearance system ──────────────────────────────────────────────────────────

export interface BlockStyle {
  padding?:      'none' | 'tight' | 'normal' | 'relaxed' | 'loose'
  padding_x?:    'none' | 'tight' | 'normal' | 'relaxed' | 'loose'
  padding_y?:    'none' | 'tight' | 'normal' | 'relaxed' | 'loose'
  gap?:          'none' | 'tight' | 'normal' | 'relaxed'
  font_size?:    'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl'
  font_weight?:  'normal' | 'medium'
  text_color?:   'primary' | 'secondary' | 'muted' | 'brand' | 'success' | 'warning' | 'danger'
  text_align?:   'left' | 'center' | 'right'
  bg?:           'none' | 'subtle' | 'card' | 'elevated' | 'brand'
  border?:       'none' | 'default' | 'accent' | 'brand'
  radius?:       'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
  direction?:    'row' | 'column'
  align?:        'start' | 'center' | 'end'
  justify?:      'start' | 'center' | 'end' | 'between'
  wrap?:         boolean
  width?:        'auto' | 'full' | 'half' | 'third' | 'quarter'
  opacity?:      'full' | '75' | '50' | '25'
  hidden?:       boolean
}

export interface ConditionalStyle {
  computed_key: string
  operator:     'gt' | 'lt' | 'eq' | 'gte' | 'lte'
  value:        number
  then_style:   Partial<BlockStyle>
}

export interface PlatformStyle {
  web?:         BlockStyle
  mobile?:      BlockStyle
  conditional?: ConditionalStyle
}

// ── Entry form types ───────────────────────────────────────────────────────────

export type BlockSpan = 3 | 4 | 6 | 8 | 9 | 12

export type ComponentType =
  | 'text_input'
  | 'longtext_input'
  | 'number_input'
  | 'currency_input'
  | 'counter_stepper'
  | 'boolean_toggle'
  | 'date_picker'
  | 'datetime_picker'
  | 'select_chips'
  | 'select_dropdown'

export type UIBlock =
  | {
      type:        'field_input'
      field_key:   string
      component:   ComponentType
      label:       string
      placeholder?: string
      show_label:  boolean
      appearance?: PlatformStyle
    }
  | { type: 'section_header'; title: string; subtitle?: string; appearance?: PlatformStyle }
  | { type: 'divider'; appearance?: PlatformStyle }
  | { type: 'spacer'; size: 'sm' | 'md' | 'lg'; appearance?: PlatformStyle }
  | { type: 'assistant_nudge'; hint?: string; appearance?: PlatformStyle }
  | { type: 'save_button'; label: string; appearance?: PlatformStyle }
  | { type: 'cancel_button'; label: string; appearance?: PlatformStyle }
  | {
      type:        'container'
      label?:      string
      bordered:    boolean
      background:  boolean
      children:    ContainerChild[]
      appearance?: PlatformStyle
    }

/** A UIBlock that is not itself a container — enforces max 1 level of nesting. */
export type LeafBlock = Exclude<UIBlock, { type: 'container' }>

/** A child entry inside a container block. Structurally identical to UIColumn
 *  but its block is constrained to LeafBlock (no nested containers). */
export interface ContainerChild {
  id:    string
  span:  BlockSpan
  block: LeafBlock
}

export interface UIColumn {
  id:   string
  span: BlockSpan
  block: UIBlock
}

export interface UIRow {
  id:          string
  columns:     UIColumn[]
  appearance?: PlatformStyle
}

export interface UIDefinition {
  version: '1.0'
  rows:    UIRow[]
}

// ── Widget Studio types ────────────────────────────────────────────────────────

export type WidgetElementType =
  | 'stat_card' | 'bar_chart' | 'line_chart' | 'donut_chart'
  | 'progress_ring' | 'progress_bar' | 'text' | 'divider'
  | 'spacer' | 'entry_list' | 'action_button'

export type WidgetRowJustify = 'start' | 'center' | 'end' | 'between' | 'around'
export type WidgetRowAlign   = 'top' | 'middle' | 'bottom' | 'stretch'
export type WidgetSpan       = 1 | 2 | 3

export type WidgetElementConfig =
  | { type: 'stat_card';     computed_key: string; label?: string; unit?: string; show_change?: boolean }
  | { type: 'bar_chart';     computed_key: string; window?: string; color?: string }
  | { type: 'line_chart';    computed_key: string; window?: string; color?: string }
  | { type: 'donut_chart';   field_key: string; aggregation: 'count' | 'sum' }
  | { type: 'progress_ring'; computed_key: string; goal?: number; color?: string }
  | { type: 'progress_bar';  computed_key: string; goal?: number; color?: string }
  | { type: 'text';          content: string; size: 'sm' | 'md' | 'lg'; weight: 400 | 500; color?: string }
  | { type: 'divider' }
  | { type: 'spacer';        size: 'sm' | 'md' | 'lg' }
  | { type: 'entry_list';    limit: number; show_fields: string[] }
  | { type: 'action_button'; label: string; action_id?: string; style: 'primary' | 'outline' }

export interface WidgetElement {
  id:          string
  span:        WidgetSpan
  config:      WidgetElementConfig
  appearance?: PlatformStyle
}

export interface WidgetRow {
  id:          string
  justify:     WidgetRowJustify
  align:       WidgetRowAlign
  elements:    WidgetElement[]
  appearance?: PlatformStyle
}

export interface WidgetDefinition {
  version: '1.0'
  rows:    WidgetRow[]
}

// ── Hub View types ─────────────────────────────────────────────────────────────

export type HubSectionConfig =
  | { type: 'widget' }
  | { type: 'entry_form_panel'; title?: string }
  | { type: 'entry_list';       limit: number; show_fields: string[]; title?: string }
  | { type: 'stats_row';        computed_keys: string[] }
  | { type: 'divider' }
  // ── Smart Sections ──────────────────────────────────────────────────────────
  | {
      type:       'date_nav';
      date_field: string;           // entry field key to filter by (e.g. 'logged_at')
    }
  | {
      type:             'summary_bar';
      primary_key:      string;     // computed_key for the "consumed" value
      goal_value:       number;     // absolute goal (e.g. 2000)
      goal_label?:      string;     // default 'Goal'
      consumed_label?:  string;     // default 'Consumed'
      remaining_label?: string;     // default 'Left'
      macro_keys?:      string[];   // up to 4 computed_keys shown as sub-progress bars
    }
  | {
      type:             'grouped_entries';
      group_by_field:   string;                           // e.g. 'meal_type'
      groups:           { key: string; label: string }[]; // ordered group definitions
      show_fields:      string[];                         // fields displayed per row (1–3)
      stat_key?:        string;                           // computed_key in group header
      inline_form:      boolean;                          // per-group quick-add form
      limit_per_group?: number;                           // default 20
    }

export interface HubSection {
  id:          string
  config:      HubSectionConfig
  appearance?: PlatformStyle
}

export interface HubViewDefinition {
  version:  '1.0'
  sections: HubSection[]
}
