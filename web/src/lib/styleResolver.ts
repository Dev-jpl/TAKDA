import type { CSSProperties } from 'react';
import type { BlockStyle, ConditionalStyle, PlatformStyle } from '@/types/ui-builder';

// ── resolveStyle ──────────────────────────────────────────────────────────────

const PADDING_MAP    = { none: 'p-0', tight: 'p-2', normal: 'p-4', relaxed: 'p-6', loose: 'p-8' } as const;
const PADDING_X_MAP  = { none: 'px-0', tight: 'px-2', normal: 'px-4', relaxed: 'px-6', loose: 'px-8' } as const;
const PADDING_Y_MAP  = { none: 'py-0', tight: 'py-2', normal: 'py-4', relaxed: 'py-6', loose: 'py-8' } as const;
const GAP_MAP        = { none: 'gap-0', tight: 'gap-1', normal: 'gap-3', relaxed: 'gap-5' } as const;
const FONT_SIZE_MAP  = { xs: 'text-xs', sm: 'text-sm', base: 'text-base', lg: 'text-lg', xl: 'text-xl', '2xl': 'text-2xl' } as const;
const FONT_WEIGHT_MAP= { normal: 'font-normal', medium: 'font-medium' } as const;
const TEXT_COLOR_MAP = {
  primary:   'text-text-primary',
  secondary:  'text-text-secondary',
  muted:      'text-text-tertiary',
  brand:      '',  // handled by resolveBrandStyle
  success:    'text-green-400',
  warning:    'text-yellow-400',
  danger:     'text-red-400',
} as const;
const TEXT_ALIGN_MAP = { left: 'text-left', center: 'text-center', right: 'text-right' } as const;
const BG_MAP = {
  none:     'bg-transparent',
  subtle:   'bg-background-tertiary/40',
  card:     'bg-background-secondary',
  elevated: 'bg-background-secondary border border-border-primary',
  brand:    '',  // handled by resolveBrandStyle
} as const;
const BORDER_MAP     = { none: 'border-0', default: 'border border-border-primary', accent: 'border border-border-primary/60', brand: '' } as const;
const RADIUS_MAP     = { none: 'rounded-none', sm: 'rounded-md', md: 'rounded-xl', lg: 'rounded-2xl', xl: 'rounded-3xl', full: 'rounded-full' } as const;
const DIRECTION_MAP  = { row: 'flex flex-row', column: 'flex flex-col' } as const;
const ALIGN_MAP      = { start: 'items-start', center: 'items-center', end: 'items-end' } as const;
const JUSTIFY_MAP    = { start: 'justify-start', center: 'justify-center', end: 'justify-end', between: 'justify-between' } as const;
const WIDTH_MAP      = { auto: 'w-auto', full: 'w-full', half: 'w-1/2', third: 'w-1/3', quarter: 'w-1/4' } as const;
const OPACITY_MAP    = { full: 'opacity-100', '75': 'opacity-75', '50': 'opacity-50', '25': 'opacity-25' } as const;

export function resolveStyle(style?: BlockStyle): string {
  if (!style) return '';
  const parts: string[] = [];

  if (style.padding)      parts.push(PADDING_MAP[style.padding]);
  if (style.padding_x)    parts.push(PADDING_X_MAP[style.padding_x]);
  if (style.padding_y)    parts.push(PADDING_Y_MAP[style.padding_y]);
  if (style.gap)          parts.push(GAP_MAP[style.gap]);
  if (style.font_size)    parts.push(FONT_SIZE_MAP[style.font_size]);
  if (style.font_weight)  parts.push(FONT_WEIGHT_MAP[style.font_weight]);
  if (style.text_color)   { const c = TEXT_COLOR_MAP[style.text_color]; if (c) parts.push(c); }
  if (style.text_align)   parts.push(TEXT_ALIGN_MAP[style.text_align]);
  if (style.bg)           { const b = BG_MAP[style.bg]; if (b) parts.push(b); }
  if (style.border)       { const b = BORDER_MAP[style.border]; if (b) parts.push(b); }
  if (style.radius)       parts.push(RADIUS_MAP[style.radius]);
  if (style.direction)    parts.push(DIRECTION_MAP[style.direction]);
  if (style.align)        parts.push(ALIGN_MAP[style.align]);
  if (style.justify)      parts.push(JUSTIFY_MAP[style.justify]);
  if (style.wrap !== undefined) parts.push(style.wrap ? 'flex-wrap' : 'flex-nowrap');
  if (style.width)        parts.push(WIDTH_MAP[style.width]);
  if (style.opacity)      parts.push(OPACITY_MAP[style.opacity]);
  if (style.hidden)       parts.push('hidden');

  return parts.filter(Boolean).join(' ');
}

// ── resolveBrandStyle ─────────────────────────────────────────────────────────

export function resolveBrandStyle(style?: BlockStyle, brandColor?: string): CSSProperties {
  if (!style || !brandColor) return {};
  const css: CSSProperties = {};

  if (style.text_color === 'brand') {
    (css as any).color = brandColor;
  }
  if (style.bg === 'brand') {
    (css as any).backgroundColor = brandColor + '18';
    (css as any).borderWidth  = 1;
    (css as any).borderStyle  = 'solid';
    (css as any).borderColor  = brandColor + '30';
  }
  if (style.border === 'brand') {
    (css as any).borderWidth  = 1;
    (css as any).borderStyle  = 'solid';
    (css as any).borderColor  = brandColor;
  }

  return css;
}

// ── resolveConditionalStyle ───────────────────────────────────────────────────

export function resolveConditionalStyle(
  conditional?: ConditionalStyle,
  computedValues?: Record<string, unknown>,
): Partial<BlockStyle> | null {
  if (!conditional || !computedValues) return null;
  const raw = computedValues[conditional.computed_key];
  if (raw === undefined || raw === null) return null;
  const actual = parseFloat(String(raw));
  if (isNaN(actual)) return null;

  const { operator, value } = conditional;
  const matches =
    operator === 'gt'  ? actual > value  :
    operator === 'lt'  ? actual < value  :
    operator === 'eq'  ? actual === value :
    operator === 'gte' ? actual >= value :
    operator === 'lte' ? actual <= value :
    false;

  return matches ? conditional.then_style : null;
}

// ── mergeAppearance ───────────────────────────────────────────────────────────

export function mergeAppearance(
  base?: BlockStyle,
  conditional?: Partial<BlockStyle> | null,
): BlockStyle {
  if (!conditional) return base ?? {};
  return { ...(base ?? {}), ...conditional };
}

// ── resolveBlockAppearance — main utility for renderers ───────────────────────

export function resolveBlockAppearance(
  appearance?: PlatformStyle,
  platform: 'web' | 'mobile' = 'web',
  brandColor?: string,
  computedValues?: Record<string, unknown>,
): { className: string; style: CSSProperties } {
  const platformStyle  = appearance?.[platform];
  const conditional    = resolveConditionalStyle(appearance?.conditional, computedValues);
  const merged         = mergeAppearance(platformStyle, conditional);
  const className      = resolveStyle(merged);
  const style          = resolveBrandStyle(merged, brandColor);
  return { className, style };
}
