"use client";

import React, { useState } from 'react';
import {
  CaretDownIcon, CaretUpIcon, TrashIcon,
  TextAlignLeftIcon, TextAlignCenterIcon, TextAlignRightIcon,
  ArrowRightIcon, ArrowDownIcon,
} from '@phosphor-icons/react';
import type { BlockStyle, ConditionalStyle, PlatformStyle } from '@/types/ui-builder';
import type { ComputedProperty } from '@/types/module-creator';

// ── CollapsibleSection ────────────────────────────────────────────────────────

function CollapsibleSection({
  title, children, defaultOpen = false,
}: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border-primary/40 last:border-0">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full px-3 py-2 text-left"
      >
        <span className="text-[10px] font-medium uppercase tracking-widest text-text-tertiary">
          {title}
        </span>
        {open
          ? <CaretUpIcon size={10} className="text-text-tertiary" />
          : <CaretDownIcon size={10} className="text-text-tertiary" />
        }
      </button>
      {open && <div className="px-3 pb-3 flex flex-col gap-2">{children}</div>}
    </div>
  );
}

// ── StyleRow ──────────────────────────────────────────────────────────────────

function StyleRow({
  label, children, note,
}: { label: string; children: React.ReactNode; note?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 min-h-[28px]">
      <div className="min-w-[72px]">
        <span className="text-[11px] text-text-tertiary">{label}</span>
        {note && <p className="text-[9px] text-text-tertiary/40 mt-0.5">{note}</p>}
      </div>
      <div className="flex items-center gap-1 flex-wrap justify-end">{children}</div>
    </div>
  );
}

// ── PillGroup ─────────────────────────────────────────────────────────────────

interface PillOption {
  value:   string;
  label?:  string;
  icon?:   React.ElementType;
  swatch?: React.ReactNode;
}

function PillGroup({
  options, selected, onChange, brandColor,
}: {
  options:    PillOption[];
  selected:   string | undefined;
  onChange:   (v: string | undefined) => void;
  brandColor: string;
}) {
  return (
    <>
      {options.map(opt => {
        const Icon    = opt.icon;
        const isSel   = selected === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(isSel ? undefined : opt.value)}
            className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
              isSel
                ? 'font-medium'
                : 'border-transparent bg-transparent text-text-tertiary hover:text-text-secondary hover:bg-background-tertiary/60'
            }`}
            style={isSel ? {
              borderColor:     `${brandColor}30`,
              backgroundColor: `${brandColor}12`,
              color:           brandColor,
            } : undefined}
          >
            {opt.swatch}
            {Icon && <Icon size={12} />}
            {opt.label && <span>{opt.label}</span>}
          </button>
        );
      })}
    </>
  );
}

// ── Color dot swatch ──────────────────────────────────────────────────────────

function ColorDot({ color }: { color: string }) {
  return (
    <span
      className="w-2.5 h-2.5 rounded-full border border-white/10 shrink-0"
      style={{ backgroundColor: color }}
    />
  );
}

// ── Swatch box ────────────────────────────────────────────────────────────────

function SwatchBox({ bg, border, label }: { bg: string; border?: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span
        className="w-3 h-3 rounded border shrink-0"
        style={{ backgroundColor: bg, borderColor: border ?? 'transparent' }}
      />
      <span>{label}</span>
    </span>
  );
}

// ── Main AppearancePanel ──────────────────────────────────────────────────────

interface AppearancePanelProps {
  style:                BlockStyle;
  onChange:             (patch: Partial<BlockStyle>) => void;
  platform:             'web' | 'mobile';
  onPlatformChange:     (p: 'web' | 'mobile') => void;
  brandColor:           string;
  computedProps?:       ComputedProperty[];
  conditional?:         ConditionalStyle;
  onConditionalChange?: (c: ConditionalStyle | undefined) => void;
  showLayoutControls?:  boolean;
  defaultStyle?:        BlockStyle;
}

const PADDING_OPTS: PillOption[] = [
  { value: 'none',    label: 'None' },
  { value: 'tight',   label: 'Tight' },
  { value: 'normal',  label: 'Normal' },
  { value: 'relaxed', label: 'Relaxed' },
  { value: 'loose',   label: 'Loose' },
];

const GAP_OPTS: PillOption[] = [
  { value: 'none',    label: 'None' },
  { value: 'tight',   label: 'Tight' },
  { value: 'normal',  label: 'Normal' },
  { value: 'relaxed', label: 'Relaxed' },
];

const FONT_SIZE_OPTS: PillOption[] = [
  { value: 'xs', label: 'XS' }, { value: 'sm', label: 'SM' },
  { value: 'base', label: 'Base' }, { value: 'lg', label: 'LG' },
  { value: 'xl', label: 'XL' }, { value: '2xl', label: '2XL' },
];

const FONT_WEIGHT_OPTS: PillOption[] = [
  { value: 'normal', label: 'Normal' }, { value: 'medium', label: 'Medium' },
];

const TEXT_ALIGN_OPTS: PillOption[] = [
  { value: 'left',   icon: TextAlignLeftIcon },
  { value: 'center', icon: TextAlignCenterIcon },
  { value: 'right',  icon: TextAlignRightIcon },
];

const RADIUS_OPTS: PillOption[] = [
  { value: 'none', label: 'None' }, { value: 'sm', label: 'SM' },
  { value: 'md',   label: 'MD' },   { value: 'lg', label: 'LG' },
  { value: 'xl',   label: 'XL' },   { value: 'full', label: 'Full' },
];

const BORDER_OPTS: PillOption[] = [
  { value: 'none',    label: 'None' },
  { value: 'default', label: 'Default' },
  { value: 'accent',  label: 'Accent' },
  { value: 'brand',   label: 'Brand' },
];

const WIDTH_OPTS: PillOption[] = [
  { value: 'auto',    label: 'Auto' }, { value: 'full',    label: 'Full' },
  { value: 'half',    label: 'Half' }, { value: 'third',   label: 'Third' },
  { value: 'quarter', label: '25%' },
];

const OPACITY_OPTS: PillOption[] = [
  { value: 'full', label: '100%' }, { value: '75', label: '75%' },
  { value: '50',   label: '50%' }, { value: '25', label: '25%' },
];

const OPERATOR_OPTS: PillOption[] = [
  { value: 'gt', label: '>' }, { value: 'gte', label: '≥' },
  { value: 'eq', label: '=' }, { value: 'lte', label: '≤' },
  { value: 'lt', label: '<' },
];

export function AppearancePanel({
  style, onChange, platform, onPlatformChange,
  brandColor, computedProps, conditional, onConditionalChange,
  showLayoutControls, defaultStyle,
}: AppearancePanelProps) {

  const upd = (patch: Partial<BlockStyle>) => onChange(patch);

  const textColorOpts = (bc: string): PillOption[] => [
    { value: 'primary',   swatch: <ColorDot color="var(--color-text-primary, #e2e8f0)" />, label: 'Primary' },
    { value: 'secondary', swatch: <ColorDot color="var(--color-text-secondary, #94a3b8)" />, label: 'Secondary' },
    { value: 'muted',     swatch: <ColorDot color="var(--color-text-tertiary, #64748b)" />, label: 'Muted' },
    { value: 'brand',     swatch: <ColorDot color={bc} />, label: 'Brand' },
    { value: 'success',   swatch: <ColorDot color="#22c55e" />, label: 'OK' },
    { value: 'warning',   swatch: <ColorDot color="#f59e0b" />, label: 'Warn' },
    { value: 'danger',    swatch: <ColorDot color="#ef4444" />, label: 'Danger' },
  ];

  const bgOpts = (bc: string): PillOption[] => [
    { value: 'none',     swatch: <SwatchBox bg="transparent" border="rgba(255,255,255,0.1)" label="None" /> },
    { value: 'subtle',   swatch: <SwatchBox bg="rgba(255,255,255,0.04)" label="Subtle" /> },
    { value: 'card',     swatch: <SwatchBox bg="var(--background-secondary, #1e293b)" label="Card" /> },
    { value: 'elevated', swatch: <SwatchBox bg="var(--background-secondary, #1e293b)" border="rgba(255,255,255,0.08)" label="Elevated" /> },
    { value: 'brand',    swatch: <SwatchBox bg={bc + '18'} border={bc + '30'} label="Brand" /> },
  ];

  const inputBase = 'w-full bg-background-primary border border-border-primary rounded-md px-2 py-1 text-xs text-text-primary outline-none';

  return (
    <div className="flex flex-col overflow-y-auto h-full">
      {/* Platform switcher */}
      <div className="flex gap-1 p-2 border-b border-border-primary shrink-0">
        {(['web', 'mobile'] as const).map(p => (
          <button
            key={p}
            type="button"
            onClick={() => onPlatformChange(p)}
            className={`flex-1 py-1.5 text-[11px] font-medium rounded-lg border transition-all ${
              platform === p
                ? 'bg-background-tertiary border-border-primary text-text-primary'
                : 'border-transparent text-text-tertiary hover:text-text-secondary'
            }`}
          >
            {p === 'web' ? 'Web' : 'Mobile'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* Spacing */}
        <CollapsibleSection title="Spacing" defaultOpen>
          <StyleRow label="Padding" note={style.padding_x || style.padding_y ? '(Paddings override)' : undefined}>
            <PillGroup options={PADDING_OPTS} selected={style.padding} onChange={v => upd({ padding: v as any })} brandColor={brandColor} />
          </StyleRow>
          <StyleRow label="Horizontal">
            <PillGroup options={PADDING_OPTS} selected={style.padding_x} onChange={v => upd({ padding_x: v as any })} brandColor={brandColor} />
          </StyleRow>
          <StyleRow label="Vertical">
            <PillGroup options={PADDING_OPTS} selected={style.padding_y} onChange={v => upd({ padding_y: v as any })} brandColor={brandColor} />
          </StyleRow>
          <StyleRow label="Gap">
            <PillGroup options={GAP_OPTS} selected={style.gap} onChange={v => upd({ gap: v as any })} brandColor={brandColor} />
          </StyleRow>
        </CollapsibleSection>

        {/* Typography */}
        <CollapsibleSection title="Typography">
          <StyleRow label="Size">
            <PillGroup options={FONT_SIZE_OPTS} selected={style.font_size} onChange={v => upd({ font_size: v as any })} brandColor={brandColor} />
          </StyleRow>
          <StyleRow label="Weight">
            <PillGroup options={FONT_WEIGHT_OPTS} selected={style.font_weight} onChange={v => upd({ font_weight: v as any })} brandColor={brandColor} />
          </StyleRow>
          <StyleRow label="Color">
            <div className="flex flex-wrap gap-1 justify-end">
              {textColorOpts(brandColor).map(opt => {
                const isSel = style.text_color === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => upd({ text_color: isSel ? undefined : opt.value as any })}
                    className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border transition-all ${
                      isSel ? 'font-medium' : 'border-transparent text-text-tertiary hover:text-text-secondary'
                    }`}
                    style={isSel ? { borderColor: `${brandColor}30`, backgroundColor: `${brandColor}12`, color: brandColor } : undefined}
                  >
                    {opt.swatch}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </StyleRow>
          <StyleRow label="Align">
            <PillGroup options={TEXT_ALIGN_OPTS} selected={style.text_align} onChange={v => upd({ text_align: v as any })} brandColor={brandColor} />
          </StyleRow>
        </CollapsibleSection>

        {/* Surface */}
        <CollapsibleSection title="Surface">
          <StyleRow label="Background">
            <div className="flex flex-col gap-1 w-full items-end">
              <div className="flex flex-wrap gap-1 justify-end">
                {bgOpts(brandColor).map(opt => {
                  const isSel = style.bg === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => upd({ bg: isSel ? undefined : opt.value as any })}
                      className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border transition-all ${
                        isSel ? 'font-medium' : 'border-transparent text-text-tertiary hover:text-text-secondary'
                      }`}
                      style={isSel ? { borderColor: `${brandColor}30`, backgroundColor: `${brandColor}12`, color: brandColor } : undefined}
                    >
                      {opt.swatch}
                    </button>
                  );
                })}
              </div>
            </div>
          </StyleRow>
          <StyleRow label="Border">
            <PillGroup options={BORDER_OPTS} selected={style.border} onChange={v => upd({ border: v as any })} brandColor={brandColor} />
          </StyleRow>
          <StyleRow label="Corners">
            <PillGroup options={RADIUS_OPTS} selected={style.radius} onChange={v => upd({ radius: v as any })} brandColor={brandColor} />
          </StyleRow>
        </CollapsibleSection>

        {/* Layout */}
        {showLayoutControls && (
          <CollapsibleSection title="Layout">
            <StyleRow label="Direction">
              <PillGroup
                options={[
                  { value: 'row',    label: 'Row',    icon: ArrowRightIcon },
                  { value: 'column', label: 'Column', icon: ArrowDownIcon },
                ]}
                selected={style.direction}
                onChange={v => upd({ direction: v as any })}
                brandColor={brandColor}
              />
            </StyleRow>
            <StyleRow label="Align">
              <PillGroup
                options={[
                  { value: 'start',  label: 'Start' },
                  { value: 'center', label: 'Center' },
                  { value: 'end',    label: 'End' },
                ]}
                selected={style.align}
                onChange={v => upd({ align: v as any })}
                brandColor={brandColor}
              />
            </StyleRow>
            <StyleRow label="Justify">
              <PillGroup
                options={[
                  { value: 'start',   label: 'Start' },
                  { value: 'center',  label: 'Center' },
                  { value: 'end',     label: 'End' },
                  { value: 'between', label: 'Between' },
                ]}
                selected={style.justify}
                onChange={v => upd({ justify: v as any })}
                brandColor={brandColor}
              />
            </StyleRow>
            <StyleRow label="Wrap">
              <button
                type="button"
                onClick={() => upd({ wrap: !style.wrap })}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                  style.wrap ? 'font-medium' : 'border-transparent text-text-tertiary'
                }`}
                style={style.wrap ? { borderColor: `${brandColor}30`, backgroundColor: `${brandColor}12`, color: brandColor } : undefined}
              >
                Wrap
              </button>
            </StyleRow>
          </CollapsibleSection>
        )}

        {/* Sizing */}
        <CollapsibleSection title="Sizing">
          <StyleRow label="Width">
            <PillGroup options={WIDTH_OPTS} selected={style.width} onChange={v => upd({ width: v as any })} brandColor={brandColor} />
          </StyleRow>
          <StyleRow label="Opacity">
            <PillGroup options={OPACITY_OPTS} selected={style.opacity} onChange={v => upd({ opacity: v as any })} brandColor={brandColor} />
          </StyleRow>
          <StyleRow label="Visible">
            <button
              type="button"
              onClick={() => upd({ hidden: !style.hidden })}
              className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                style.hidden ? 'font-medium' : 'border-transparent text-text-tertiary'
              }`}
              style={style.hidden ? { borderColor: `${brandColor}30`, backgroundColor: `${brandColor}12`, color: brandColor } : undefined}
            >
              {style.hidden ? 'Hidden' : 'Visible'}
            </button>
          </StyleRow>
        </CollapsibleSection>

        {/* Conditional */}
        {computedProps && computedProps.length > 0 && (
          <CollapsibleSection title="Conditional">
            {!conditional ? (
              <button
                type="button"
                onClick={() => onConditionalChange?.({
                  computed_key: computedProps[0].key,
                  operator: 'gt',
                  value: 0,
                  then_style: {},
                })}
                className="w-full py-2 rounded-xl border-2 border-dashed border-border-primary text-[11px] text-text-tertiary hover:border-modules-aly/40 hover:text-modules-aly transition-all"
              >
                + Add condition
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <StyleRow label="When">
                  <select
                    className={`${inputBase} max-w-[160px]`}
                    value={conditional.computed_key}
                    onChange={e => onConditionalChange?.({ ...conditional, computed_key: e.target.value })}
                  >
                    {computedProps.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                  </select>
                </StyleRow>
                <StyleRow label="Operator">
                  <PillGroup
                    options={OPERATOR_OPTS}
                    selected={conditional.operator}
                    onChange={v => onConditionalChange?.({ ...conditional, operator: v as any })}
                    brandColor={brandColor}
                  />
                </StyleRow>
                <StyleRow label="Value">
                  <input
                    type="number"
                    className={`${inputBase} max-w-[80px]`}
                    value={conditional.value}
                    onChange={e => onConditionalChange?.({ ...conditional, value: Number(e.target.value) })}
                  />
                </StyleRow>
                <StyleRow label="Color">
                  <PillGroup
                    options={textColorOpts(brandColor).slice(0, 5)}
                    selected={conditional.then_style.text_color}
                    onChange={v => onConditionalChange?.({ ...conditional, then_style: { ...conditional.then_style, text_color: v as any } })}
                    brandColor={brandColor}
                  />
                </StyleRow>
                <StyleRow label="BG">
                  <PillGroup
                    options={[
                      { value: 'subtle', label: 'Subtle' },
                      { value: 'card',   label: 'Card' },
                      { value: 'brand',  label: 'Brand' },
                    ]}
                    selected={conditional.then_style.bg}
                    onChange={v => onConditionalChange?.({ ...conditional, then_style: { ...conditional.then_style, bg: v as any } })}
                    brandColor={brandColor}
                  />
                </StyleRow>
                <button
                  type="button"
                  onClick={() => onConditionalChange?.(undefined)}
                  className="flex items-center gap-1.5 text-[11px] text-text-tertiary hover:text-red-400 transition-colors"
                >
                  <TrashIcon size={11} /> Remove condition
                </button>
              </div>
            )}
          </CollapsibleSection>
        )}
      </div>
    </div>
  );
}
