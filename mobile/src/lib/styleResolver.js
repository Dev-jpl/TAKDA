import { colors } from '../constants/colors';

// ── resolveStyleRN ────────────────────────────────────────────────────────────
// Maps a BlockStyle object to a React Native style object.

export function resolveStyleRN(style, brandColor) {
  if (!style) return {};
  const parts = [];

  const PADDING = { none: 0, tight: 8, normal: 16, relaxed: 24, loose: 32 };
  const GAP     = { none: 0, tight: 4, normal: 12, relaxed: 20 };
  const FSIZE   = { xs: 10, sm: 12, base: 14, lg: 16, xl: 18, '2xl': 22 };
  const RADIUS  = { none: 0, sm: 8, md: 12, lg: 16, xl: 20, full: 999 };

  if (style.padding !== undefined && PADDING[style.padding] !== undefined)
    parts.push({ padding: PADDING[style.padding] });

  if (style.padding_x !== undefined && PADDING[style.padding_x] !== undefined)
    parts.push({ paddingHorizontal: PADDING[style.padding_x] });

  if (style.padding_y !== undefined && PADDING[style.padding_y] !== undefined)
    parts.push({ paddingVertical: PADDING[style.padding_y] });

  if (style.gap !== undefined && GAP[style.gap] !== undefined)
    parts.push({ gap: GAP[style.gap] });

  if (style.font_size !== undefined && FSIZE[style.font_size] !== undefined)
    parts.push({ fontSize: FSIZE[style.font_size] });

  if (style.font_weight !== undefined) {
    const fw = style.font_weight === 'medium' ? '500' : '400';
    parts.push({ fontWeight: fw });
  }

  if (style.text_color !== undefined) {
    const tcMap = {
      primary:   colors.text.primary,
      secondary: colors.text.secondary,
      muted:     colors.text.tertiary,
      success:   '#22c55e',
      warning:   '#f59e0b',
      danger:    '#ef4444',
    };
    if (style.text_color === 'brand' && brandColor) {
      parts.push({ color: brandColor });
    } else if (tcMap[style.text_color]) {
      parts.push({ color: tcMap[style.text_color] });
    }
  }

  if (style.text_align !== undefined) {
    const taMap = { left: 'left', center: 'center', right: 'right' };
    if (taMap[style.text_align]) parts.push({ textAlign: taMap[style.text_align] });
  }

  if (style.bg !== undefined) {
    if (style.bg === 'none')     parts.push({ backgroundColor: 'transparent' });
    else if (style.bg === 'subtle')   parts.push({ backgroundColor: 'rgba(255,255,255,0.04)' });
    else if (style.bg === 'card')     parts.push({ backgroundColor: colors.background.secondary });
    else if (style.bg === 'elevated') parts.push({ backgroundColor: colors.background.secondary, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' });
    else if (style.bg === 'brand' && brandColor) parts.push({ backgroundColor: brandColor + '18', borderWidth: 1, borderColor: brandColor + '30' });
  }

  if (style.border !== undefined) {
    if (style.border === 'none')    parts.push({ borderWidth: 0 });
    else if (style.border === 'default') parts.push({ borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' });
    else if (style.border === 'accent')  parts.push({ borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' });
    else if (style.border === 'brand' && brandColor) parts.push({ borderWidth: 1, borderColor: brandColor });
  }

  if (style.radius !== undefined && RADIUS[style.radius] !== undefined)
    parts.push({ borderRadius: RADIUS[style.radius] });

  if (style.direction !== undefined) {
    parts.push({ flexDirection: style.direction === 'row' ? 'row' : 'column' });
  }

  if (style.align !== undefined) {
    const aMap = { start: 'flex-start', center: 'center', end: 'flex-end' };
    if (aMap[style.align]) parts.push({ alignItems: aMap[style.align] });
  }

  if (style.justify !== undefined) {
    const jMap = { start: 'flex-start', center: 'center', end: 'flex-end', between: 'space-between' };
    if (jMap[style.justify]) parts.push({ justifyContent: jMap[style.justify] });
  }

  if (style.wrap !== undefined)
    parts.push({ flexWrap: style.wrap ? 'wrap' : 'nowrap' });

  if (style.width !== undefined) {
    const wMap = { full: '100%', half: '50%', third: '33.33%', quarter: '25%' };
    if (wMap[style.width]) parts.push({ width: wMap[style.width] });
  }

  if (style.opacity !== undefined) {
    const oMap = { full: 1, '75': 0.75, '50': 0.5, '25': 0.25 };
    if (oMap[style.opacity] !== undefined) parts.push({ opacity: oMap[style.opacity] });
  }

  if (style.hidden === true) parts.push({ display: 'none' });

  return Object.assign({}, ...parts);
}

// ── resolveConditionalStyleRN ──────────────────────────────────────────────────

export function resolveConditionalStyleRN(conditional, computedValues, brandColor) {
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

  return matches ? resolveStyleRN(conditional.then_style, brandColor) : null;
}

// ── resolveBlockAppearanceRN ───────────────────────────────────────────────────
// Main utility for React Native block renderers.

export function resolveBlockAppearanceRN(appearance, platform = 'mobile', brandColor, computedValues) {
  if (!appearance) return {};
  const platformStyle = appearance[platform] ?? {};
  const conditional   = resolveConditionalStyleRN(appearance.conditional, computedValues, brandColor);
  const base          = resolveStyleRN(platformStyle, brandColor);
  return Object.assign({}, base, conditional ?? {});
}
