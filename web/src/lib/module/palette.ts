import type { CSSProperties } from "react";

// TAKDA v2 element accent palette — tiered editorial system.
//
// Hues: sage, clay, ochre, slate, plum, rose, forest.
// Tiers: soft (muted, dustier) → mid (default, vivid editorial) → vivid (punchy).
// Each `Swatch.token` for the mid tier is the bare hue name (e.g. "sage")
// so existing modules continue to render unchanged.

export type ColorHue =
  | "gray"
  | "sage"
  | "clay"
  | "ochre"
  | "slate"
  | "plum"
  | "rose"
  | "forest";

export type ColorTier = "soft" | "mid" | "vivid";

export type ColorToken =
  | "ink"
  | ColorHue
  | `${ColorHue}_soft`
  | `${ColorHue}_vivid`;

export interface Swatch {
  token: ColorToken;
  hue: ColorHue | "ink";
  tier: ColorTier;
  label: string;
  fill: string;
  soft: string; // tinted background (alpha)
  on: string;   // foreground when placed on `fill`
}

const HUES: Record<
  ColorHue,
  Record<ColorTier, { fill: string; on: string; label: string }>
> = {
  // Warm gray scale tuned to the paper (#faf8f3) base.
  gray: {
    soft:  { fill: "#c4bfb5", on: "#1f1f1f", label: "Gray · soft" },
    mid:   { fill: "#7a766e", on: "#ffffff", label: "Gray" },
    vivid: { fill: "#3d3a35", on: "#ffffff", label: "Gray · vivid" },
  },
  sage: {
    soft:  { fill: "#7d9b75", on: "#ffffff", label: "Sage · soft" },
    mid:   { fill: "#5fa869", on: "#ffffff", label: "Sage" },
    vivid: { fill: "#2e9d4d", on: "#ffffff", label: "Sage · vivid" },
  },
  clay: {
    soft:  { fill: "#b8775c", on: "#ffffff", label: "Clay · soft" },
    mid:   { fill: "#d97552", on: "#ffffff", label: "Clay" },
    vivid: { fill: "#e85a32", on: "#ffffff", label: "Clay · vivid" },
  },
  ochre: {
    soft:  { fill: "#c8a652", on: "#1f1f1f", label: "Ochre · soft" },
    mid:   { fill: "#e0a82e", on: "#1f1f1f", label: "Ochre" },
    vivid: { fill: "#f5b800", on: "#1f1f1f", label: "Ochre · vivid" },
  },
  slate: {
    soft:  { fill: "#6f8294", on: "#ffffff", label: "Slate · soft" },
    mid:   { fill: "#4b8bc4", on: "#ffffff", label: "Slate" },
    vivid: { fill: "#1e7fd4", on: "#ffffff", label: "Slate · vivid" },
  },
  plum: {
    soft:  { fill: "#8c708f", on: "#ffffff", label: "Plum · soft" },
    mid:   { fill: "#a368c4", on: "#ffffff", label: "Plum" },
    vivid: { fill: "#9333d1", on: "#ffffff", label: "Plum · vivid" },
  },
  rose: {
    soft:  { fill: "#b78686", on: "#ffffff", label: "Rose · soft" },
    mid:   { fill: "#e0708a", on: "#ffffff", label: "Rose" },
    vivid: { fill: "#ec3a5e", on: "#ffffff", label: "Rose · vivid" },
  },
  forest: {
    soft:  { fill: "#4d6b54", on: "#ffffff", label: "Forest · soft" },
    mid:   { fill: "#2c8f5b", on: "#ffffff", label: "Forest" },
    vivid: { fill: "#0e7a3d", on: "#ffffff", label: "Forest · vivid" },
  },
};

function softAlpha(hex: string): string {
  return `${hex}24`; // ~14% alpha
}

function buildPalette(): Swatch[] {
  const out: Swatch[] = [
    {
      token: "ink",
      hue: "ink",
      tier: "mid",
      label: "Ink",
      fill: "#1f1f1f",
      soft: "#1f1f1f24",
      on: "#faf8f3",
    },
  ];
  const order: ColorHue[] = [
    "gray",
    "sage",
    "clay",
    "ochre",
    "slate",
    "plum",
    "rose",
    "forest",
  ];
  for (const hue of order) {
    for (const tier of ["soft", "mid", "vivid"] as ColorTier[]) {
      const def = HUES[hue][tier];
      const token: ColorToken =
        tier === "mid" ? (hue as ColorToken) : (`${hue}_${tier}` as ColorToken);
      out.push({
        token,
        hue,
        tier,
        label: def.label,
        fill: def.fill,
        soft: softAlpha(def.fill),
        on: def.on,
      });
    }
  }
  return out;
}

export const PALETTE: Swatch[] = buildPalette();

export const PALETTE_HUES: ColorHue[] = [
  "gray",
  "sage",
  "clay",
  "ochre",
  "slate",
  "plum",
  "rose",
  "forest",
];

export function swatchFor(token: ColorToken | undefined): Swatch {
  return PALETTE.find((s) => s.token === token) ?? PALETTE[0];
}

import type { ElementSpacing, ElementSurface, TextStyle } from "./types";

/** Build the CSS style for an element's surface (bg/border/radius). */
export function surfaceStyle(
  surface: ElementSurface | undefined,
  defaults: { border?: boolean; radius?: number } = {},
): CSSProperties {
  if (!surface) {
    return defaults.border
      ? { border: "1px solid var(--rule)", borderRadius: defaults.radius ?? 6 }
      : {};
  }
  const out: CSSProperties = {};
  if (surface.bgColor) {
    out.backgroundColor = swatchFor(surface.bgColor as ColorToken).soft;
  }
  // Border default = true unless explicitly false; analytic cards have borders.
  const showBorder = surface.border ?? defaults.border ?? false;
  if (showBorder) {
    const c = surface.borderColor
      ? swatchFor(surface.borderColor as ColorToken).fill
      : "var(--rule)";
    out.border = `1px solid ${c}`;
  } else {
    out.border = "none";
  }
  if (surface.radius !== undefined) out.borderRadius = surface.radius;
  else if (showBorder || surface.bgColor) out.borderRadius = defaults.radius ?? 6;
  return out;
}

/** Build the CSS style for spacing (padding + margin per side). */
export function spacingStyle(
  spacing: ElementSpacing | undefined,
): CSSProperties {
  if (!spacing) return {};
  return {
    paddingTop: spacing.paddingTop,
    paddingRight: spacing.paddingRight,
    paddingBottom: spacing.paddingBottom,
    paddingLeft: spacing.paddingLeft,
    marginTop: spacing.marginTop,
    marginRight: spacing.marginRight,
    marginBottom: spacing.marginBottom,
    marginLeft: spacing.marginLeft,
  };
}

const TEXT_SIZE_PX: Record<NonNullable<TextStyle["size"]>, number> = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 18,
  xl: 24,
};
const TEXT_WEIGHT: Record<NonNullable<TextStyle["weight"]>, number> = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

/** Build CSS for a TextStyle (font size/weight, align, padding, margin). */
export function textStyle(t: TextStyle | undefined): CSSProperties {
  if (!t) return {};
  const out: CSSProperties = {};
  if (t.size) out.fontSize = TEXT_SIZE_PX[t.size];
  if (t.weight) out.fontWeight = TEXT_WEIGHT[t.weight];
  if (t.align) out.textAlign = t.align;
  if (t.paddingTop !== undefined) out.paddingTop = t.paddingTop;
  if (t.paddingRight !== undefined) out.paddingRight = t.paddingRight;
  if (t.paddingBottom !== undefined) out.paddingBottom = t.paddingBottom;
  if (t.paddingLeft !== undefined) out.paddingLeft = t.paddingLeft;
  if (t.marginTop !== undefined) out.marginTop = t.marginTop;
  if (t.marginRight !== undefined) out.marginRight = t.marginRight;
  if (t.marginBottom !== undefined) out.marginBottom = t.marginBottom;
  if (t.marginLeft !== undefined) out.marginLeft = t.marginLeft;
  return out;
}

export function swatchByHueTier(hue: ColorHue, tier: ColorTier): Swatch {
  return (
    PALETTE.find((s) => s.hue === hue && s.tier === tier) ?? PALETTE[0]
  );
}

// Curated analogous combos. Each triple's first token is the "dominant" —
// applied if the user clicks the combo as a shortcut. Others are suggestions
// for sibling elements on the same screen.
export interface ColorCombo {
  id: string;
  label: string;
  tokens: [ColorToken, ColorToken, ColorToken];
}

export const COLOR_COMBOS: ColorCombo[] = [
  { id: "botanical", label: "Botanical", tokens: ["sage", "forest", "ochre"] },
  { id: "sunset",    label: "Sunset",    tokens: ["clay", "ochre", "rose"] },
  { id: "twilight",  label: "Twilight",  tokens: ["slate", "plum", "rose"] },
  { id: "earth",     label: "Earth",     tokens: ["clay_soft", "ochre_soft", "forest"] },
  { id: "fresh",     label: "Fresh",     tokens: ["sage_vivid", "slate", "ochre"] },
  { id: "muted",     label: "Quiet",     tokens: ["gray", "slate_soft", "sage_soft"] },
];
