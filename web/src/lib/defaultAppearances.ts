import type { BlockStyle } from '@/types/ui-builder';

export const DEFAULT_BLOCK_APPEARANCES: Record<string, BlockStyle> = {
  section_header:  { padding_y: 'tight', font_size: 'sm', font_weight: 'medium', text_color: 'secondary' },
  save_button:     { padding_y: 'normal', width: 'full', radius: 'md' },
  cancel_button:   { padding_y: 'normal', width: 'full', radius: 'md' },
  divider:         { opacity: '50' },
  spacer:          {},
  stat_card:       { padding: 'normal', bg: 'card', radius: 'md' },
  assistant_nudge: { padding: 'tight', bg: 'subtle', radius: 'md' },
  container:       { radius: 'md' },
  field_input:     { padding_y: 'tight' },
};

export function getDefaultAppearance(blockType: string): BlockStyle {
  return DEFAULT_BLOCK_APPEARANCES[blockType] ?? {};
}
