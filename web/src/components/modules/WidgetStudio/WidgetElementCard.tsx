"use client";

import React from 'react';
import { X } from '@phosphor-icons/react';
import type { WidgetElement, WidgetElementConfig, WidgetSpan } from '@/types/ui-builder';

// ── Preview renderers ─────────────────────────────────────────────────────────

function StatCardPreview({ config, brandColor }: { config: Extract<WidgetElementConfig, { type: 'stat_card' }>; brandColor: string }) {
  return (
    <div className="flex flex-col gap-0.5 p-2">
      <p className="text-[9px] text-text-tertiary uppercase tracking-widest truncate">{config.label || 'Total'}</p>
      <p className="text-2xl font-medium" style={{ color: brandColor }}>—</p>
      {config.unit && <p className="text-[9px] text-text-tertiary">{config.unit}</p>}
    </div>
  );
}

function BarChartPreview({ brandColor }: { brandColor: string }) {
  const bars = [40, 65, 50, 80, 55, 70, 45];
  return (
    <div className="flex items-end gap-0.5 h-10 px-2 pt-2">
      {bars.map((h, i) => (
        <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, backgroundColor: `${brandColor}${i === 5 ? 'ff' : '60'}` }} />
      ))}
    </div>
  );
}

function LineChartPreview({ brandColor }: { brandColor: string }) {
  const pts = [[0,30],[1,50],[2,35],[3,65],[4,45],[5,70],[6,55]];
  const w = 100; const h = 40;
  const xs = pts.map(([x]) => (x / 6) * w);
  const ys = pts.map(([, y]) => h - (y / 100) * h);
  const d = pts.map(([, , ], i) => `${i === 0 ? 'M' : 'L'}${xs[i]},${ys[i]}`).join(' ');
  return (
    <svg width="100%" height="40" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="px-1">
      <path d={d} fill="none" stroke={brandColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DonutPreview({ brandColor }: { brandColor: string }) {
  const r = 14; const cx = 20; const cy = 20;
  const circ = 2 * Math.PI * r;
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" className="mx-auto">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border-primary)" strokeWidth="5" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={brandColor} strokeWidth="5"
        strokeDasharray={`${circ * 0.65} ${circ}`} strokeDashoffset={circ * 0.25} strokeLinecap="round" />
    </svg>
  );
}

function ProgressRingPreview({ brandColor }: { brandColor: string }) {
  const r = 14; const cx = 20; const cy = 20;
  const circ = 2 * Math.PI * r;
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" className="mx-auto">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border-primary)" strokeWidth="4" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={brandColor} strokeWidth="4"
        strokeDasharray={`${circ * 0.72} ${circ}`} strokeDashoffset={circ * 0.25} strokeLinecap="round" />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="8" fill="var(--text-primary)" fontWeight="500">72%</text>
    </svg>
  );
}

function ProgressBarPreview({ brandColor }: { brandColor: string }) {
  return (
    <div className="px-2 py-3 flex flex-col gap-1">
      <div className="flex justify-between">
        <span className="text-[9px] text-text-tertiary">Progress</span>
        <span className="text-[9px]" style={{ color: brandColor }}>72%</span>
      </div>
      <div className="h-2 bg-background-tertiary rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: '72%', backgroundColor: brandColor }} />
      </div>
    </div>
  );
}

function TextPreview({ config }: { config: Extract<WidgetElementConfig, { type: 'text' }> }) {
  const sizeClass = config.size === 'lg' ? 'text-base' : config.size === 'sm' ? 'text-[11px]' : 'text-sm';
  return (
    <p className={`${sizeClass} px-2 py-1 text-text-primary truncate`} style={{ fontWeight: config.weight ?? 400, color: config.color }}>
      {config.content || 'Text block'}
    </p>
  );
}

function EntryListPreview() {
  return (
    <div className="flex flex-col gap-1 px-2 py-1.5">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-background-tertiary shrink-0" />
          <div className="h-2 bg-background-tertiary rounded flex-1" style={{ width: `${70 + i * 10}%` }} />
        </div>
      ))}
    </div>
  );
}

function ElementPreview({ config, brandColor }: { config: WidgetElementConfig; brandColor: string }) {
  switch (config.type) {
    case 'stat_card':     return <StatCardPreview config={config} brandColor={brandColor} />;
    case 'bar_chart':     return <BarChartPreview brandColor={brandColor} />;
    case 'line_chart':    return <LineChartPreview brandColor={brandColor} />;
    case 'donut_chart':   return <DonutPreview brandColor={brandColor} />;
    case 'progress_ring': return <ProgressRingPreview brandColor={brandColor} />;
    case 'progress_bar':  return <ProgressBarPreview brandColor={brandColor} />;
    case 'text':          return <TextPreview config={config} />;
    case 'divider':       return <hr className="border-border-primary mx-2 my-2" />;
    case 'spacer':        return <div className={{ sm: 'h-2', md: 'h-4', lg: 'h-8' }[config.size]} />;
    case 'entry_list':    return <EntryListPreview />;
    case 'action_button': return (
      <div className="px-2 py-1.5">
        <div className={`text-[11px] font-medium text-center rounded-lg px-3 py-1.5 pointer-events-none ${
          config.style === 'primary' ? 'text-white' : 'text-text-primary border border-border-primary'
        }`} style={config.style === 'primary' ? { backgroundColor: brandColor } : undefined}>
          {config.label || 'Action'}
        </div>
      </div>
    );
    default: return null;
  }
}

// ── Span class map ─────────────────────────────────────────────────────────────

const SPAN_CLASS: Record<WidgetSpan, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
};

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  element:    WidgetElement;
  rowId:      string;
  isSelected: boolean;
  brandColor: string;
  onSelect:   () => void;
  onRemove:   () => void;
  onSpan:     (span: WidgetSpan) => void;
}

export function WidgetElementCard({ element, rowId: _rowId, isSelected, brandColor, onSelect, onRemove, onSpan }: Props) {
  return (
    <div
      className={`relative group/el rounded-xl border cursor-pointer transition-all ${SPAN_CLASS[element.span]} min-h-[60px] bg-background-secondary overflow-hidden`}
      style={{ borderColor: isSelected ? brandColor : 'var(--border-primary)' }}
      onClick={e => { e.stopPropagation(); onSelect(); }}
    >
      <ElementPreview config={element.config} brandColor={brandColor} />

      {/* Span controls (shown on hover/select) */}
      <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover/el:opacity-100'}`}>
        {([1, 2, 3] as WidgetSpan[]).map(s => (
          <button
            key={s}
            type="button"
            onClick={e => { e.stopPropagation(); onSpan(s); }}
            className={`w-5 h-5 rounded text-[9px] font-medium transition-all border ${
              element.span === s
                ? 'text-white border-transparent'
                : 'text-text-tertiary border-border-primary bg-background-primary hover:text-text-primary'
            }`}
            style={element.span === s ? { backgroundColor: brandColor, borderColor: brandColor } : undefined}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Remove button */}
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onRemove(); }}
        className="absolute top-1 right-1 w-5 h-5 rounded-lg bg-background-primary border border-border-primary flex items-center justify-center text-text-tertiary hover:text-red-400 hover:border-red-400/30 opacity-0 group-hover/el:opacity-100 transition-all"
      >
        <X size={10} />
      </button>
    </div>
  );
}
