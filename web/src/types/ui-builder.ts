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
      type: 'field_input'
      field_key: string
      component: ComponentType
      label: string
      placeholder?: string
      show_label: boolean
    }
  | { type: 'section_header'; title: string; subtitle?: string }
  | { type: 'divider' }
  | { type: 'spacer'; size: 'sm' | 'md' | 'lg' }
  | { type: 'assistant_nudge'; hint?: string }
  | { type: 'save_button'; label: string }
  | { type: 'cancel_button'; label: string }
  | {
      type:       'container'
      label?:     string        // optional caption above children
      bordered:   boolean       // border border-border-primary
      background: boolean       // bg-background-secondary
      children:   ContainerChild[]
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
  id: string
  span: BlockSpan
  block: UIBlock
}

export interface UIRow {
  id: string
  columns: UIColumn[]
}

export interface UIDefinition {
  version: '1.0'
  rows: UIRow[]
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
  id:     string
  span:   WidgetSpan
  config: WidgetElementConfig
}

export interface WidgetRow {
  id:       string
  justify:  WidgetRowJustify
  align:    WidgetRowAlign
  elements: WidgetElement[]
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

export interface HubSection {
  id:     string
  config: HubSectionConfig
}

export interface HubViewDefinition {
  version:  '1.0'
  sections: HubSection[]
}
