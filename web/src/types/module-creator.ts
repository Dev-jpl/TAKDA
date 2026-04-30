// ── Field types ───────────────────────────────────────────────────────────────

export type FieldType =
  | 'text' | 'string' | 'number' | 'boolean' | 'date' | 'datetime'
  | 'select' | 'multi_select' | 'counter' | 'list' | 'relation'
  | 'rich_text' | 'media'

export type CollectionRole = 'primary' | 'config' | 'log' | 'junction'

export interface FieldCondition {
  field:     string
  operator:  'eq' | 'neq' | 'gt' | 'lt' | 'empty' | 'not_empty'
  value?:    unknown
}

export interface FieldConfig {
  min?:               number
  max?:               number
  unit?:              string
  goal?:              number
  step?:              number
  options?:           string[]
  placeholder?:       string
  target_schema_key?: string
  display_field?:     string
  max_items?:         number
  accept?:            'image' | 'any'
  condition?:         FieldCondition | null
  default_expr?:      string
}

export interface SchemaField {
  key:      string
  label:    string
  type:     FieldType
  required: boolean
  config?:  FieldConfig
}

export interface SchemaCollection {
  key:        string
  label:      string
  role:       CollectionRole
  fields:     SchemaField[]
  singleton?: boolean
  is_ordered?: boolean
  display?: {
    title_field?:    string
    subtitle_field?: string
    trailing_field?: string
  }
}

// ── Computed properties ───────────────────────────────────────────────────────

export type ComputedOperation =
  | 'sum' | 'avg' | 'min' | 'max' | 'count'
  | 'streak' | 'formula' | 'progress' | 'trend' | 'threshold'

export type ComputedWindow =
  | 'today' | 'week' | 'month' | 'last_7d' | 'last_30d' | 'all'

export type ComputedFormat =
  | 'number' | 'percent' | 'decimal' | 'duration' | 'status'

export interface ComputedProperty {
  key:               string
  label:             string
  type:              ComputedOperation
  source_field?:     string
  source_schema_key?: string
  window?:           ComputedWindow
  goal_value?:       number
  expression?:       string
  format?:           ComputedFormat
  unit?:             string
  precision?:        number
  thresholds?:       { value: number; status: 'green' | 'yellow' | 'red' }[]
}

// ── Actions ───────────────────────────────────────────────────────────────────

export type ActionStepType =
  | 'compute' | 'mutate_create' | 'mutate_update' | 'mutate_delete'
  | 'ui_show' | 'ui_navigate' | 'ui_feedback' | 'conditional' | 'notify_aly'

export interface ActionStep {
  id:     string
  type:   ActionStepType
  config: Record<string, unknown>
}

export type ActionTrigger =
  | 'fab_tap' | 'button_click' | 'swipe_left' | 'swipe_right'
  | 'long_press' | 'on_entry_saved' | 'on_threshold' | 'on_schedule'
  | 'keyboard_shortcut' | 'inline_icon'

export interface ModuleAction {
  id:              string
  name:            string
  trigger:         ActionTrigger
  trigger_config?: Record<string, unknown>
  steps:           ActionStep[]
  is_primary?:     boolean
}

// ── Mobile / Web config ───────────────────────────────────────────────────────

export interface MobileConfig {
  entry_trigger:          'fab' | 'inline_button' | 'none'
  sheet_height:           'compact' | 'standard' | 'tall'
  fab_label?:             string
  fab_icon?:              string
  list_group_by?:         string
  swipe_left_action?:     string
  swipe_right_action?:    string
  tap_row_action?:        'detail' | 'edit' | 'expand' | 'none'
  show_computed_summary:  boolean
  summary_style?:         'cards_row' | 'single_stat' | 'ring_progress'
  empty_state_message?:   string
  widget_col_span?:       1 | 2 | 3
  auto_focus_first_field: boolean
  dismiss_on_save:        boolean
  haptic_on_save:         boolean
  show_success_animation: boolean
  success_animation_type?: 'checkmark' | 'confetti' | 'none'
  _configured?:           boolean
}

export interface WebConfig {
  entry_trigger:      'inline_button' | 'side_panel' | 'modal' | 'none'
  panel_width?:       'narrow' | 'standard' | 'wide'
  list_density?:      'compact' | 'standard' | 'card_grid'
  visible_columns?:   string[]
  widget_col_span?:   1 | 2 | 3
  empty_state_message?: string
}

export interface ModuleBehaviors {
  web_actions:    ModuleAction[]
  mobile_actions: ModuleAction[]
  auto_behaviors: {
    on_entry_saved?:  ActionStep[]
    on_threshold?:    { computed_key: string; condition: string; steps: ActionStep[] }[]
    on_schedule?:     { cron: string; steps: ActionStep[] }[]
  }
}

// ── Full V2 definition ────────────────────────────────────────────────────────

export interface ModuleDefinitionV2 {
  id:                  string
  user_id:             string | null
  slug:                string
  name:                string
  description?:        string
  schema:              SchemaField[]
  schemas:             Record<string, SchemaCollection>
  computed_properties: ComputedProperty[]
  behaviors:           ModuleBehaviors
  mobile_config:       MobileConfig
  web_config:          WebConfig
  layout:              Record<string, unknown>
  ui_definition?:      unknown
  is_global:           boolean
  is_private:          boolean
  aly_config: {
    intent_keywords:        string[]
    context_hint:           string
    log_prompt:             string
    proactive_insights?:    string[]
    aly_can_trigger_actions?: string[]
  }
  status:       'draft' | 'published' | 'archived'
  version:      number
  category?:    string
  brand_color?: string
  icon_name?:   string
  created_at:   string
  updated_at?:  string
}

// ── Defaults ──────────────────────────────────────────────────────────────────

export function defaultMobileConfig(): MobileConfig {
  return {
    entry_trigger:          'fab',
    sheet_height:           'standard',
    show_computed_summary:  false,
    auto_focus_first_field: true,
    dismiss_on_save:        true,
    haptic_on_save:         true,
    show_success_animation: true,
    success_animation_type: 'checkmark',
  }
}

export function defaultWebConfig(): WebConfig {
  return {
    entry_trigger: 'inline_button',
    panel_width:   'standard',
    list_density:  'standard',
  }
}

export function defaultBehaviors(): ModuleBehaviors {
  return {
    web_actions:    [],
    mobile_actions: [],
    auto_behaviors: {},
  }
}

export function emptyDefinition(partial: Partial<ModuleDefinitionV2> = {}): ModuleDefinitionV2 {
  return {
    id:                  '',
    user_id:             null,
    slug:                '',
    name:                '',
    schema:              [],
    schemas:             {},
    computed_properties: [],
    behaviors:           defaultBehaviors(),
    mobile_config:       defaultMobileConfig(),
    web_config:          defaultWebConfig(),
    layout:              { type: 'custom' },
    is_global:           false,
    is_private:          true,
    aly_config: {
      intent_keywords: [],
      context_hint:    '',
      log_prompt:      '',
    },
    status:  'draft',
    version: 1,
    created_at: new Date().toISOString(),
    ...partial,
  }
}
