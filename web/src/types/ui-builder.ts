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
