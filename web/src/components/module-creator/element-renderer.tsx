"use client";

import type {
  Container,
  Element,
  Field,
  LayoutNode,
  Module,
} from "@/lib/module/types";
import {
  spacingStyle,
  surfaceStyle,
  swatchFor,
  textStyle,
  type ColorToken,
} from "@/lib/module/palette";
import type { TextStyle as TextStyleConfig } from "@/lib/module/types";
import { ModuleIcon } from "@/components/module-icon";

function DesignLineMock({
  sample,
  tint,
  area,
  height,
  marginTop,
}: {
  sample: number[];
  tint: string;
  area: boolean;
  height: number;
  marginTop: number;
}) {
  const max = Math.max(...sample, 1);
  const n = sample.length;
  const W = 100;
  const H = 100;
  const stepX = n > 1 ? (W - 4) / (n - 1) : 0;
  const toY = (v: number) => H - 4 - (v / max) * (H - 8);
  const pts = sample.map((v, i) => ({ x: 2 + i * stepX, y: toY(v) }));
  const linePath = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L ${(2 + (n - 1) * stepX).toFixed(2)} ${H - 4} L 2 ${H - 4} Z`;
  return (
    <div style={{ height, marginTop }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        width="100%"
        height="100%"
      >
        {area && <path d={areaPath} fill={tint} opacity={0.15} />}
        <path
          d={linePath}
          fill="none"
          stroke={tint}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

function DesignDonutMock({ tint }: { tint: string }) {
  const slices = [
    { v: 0.45, color: tint },
    { v: 0.30, color: "#d97552" },
    { v: 0.25, color: "#4b8bc4" },
  ];
  const R = 42;
  const r = 26;
  const cx = 50;
  const cy = 50;
  let angle = -Math.PI / 2;
  return (
    <div className="shrink-0" style={{ width: 100, height: 100 }}>
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        {slices.map((s, i) => {
          const a0 = angle;
          const a1 = angle + s.v * 2 * Math.PI;
          angle = a1;
          const large = a1 - a0 > Math.PI ? 1 : 0;
          const x0 = cx + R * Math.cos(a0);
          const y0 = cy + R * Math.sin(a0);
          const x1 = cx + R * Math.cos(a1);
          const y1 = cy + R * Math.sin(a1);
          const xi0 = cx + r * Math.cos(a1);
          const yi0 = cy + r * Math.sin(a1);
          const xi1 = cx + r * Math.cos(a0);
          const yi1 = cy + r * Math.sin(a0);
          const d = `M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${xi0} ${yi0} A ${r} ${r} 0 ${large} 0 ${xi1} ${yi1} Z`;
          return <path key={i} d={d} fill={s.color} />;
        })}
      </svg>
    </div>
  );
}

function DesignHeatmapMock({ tint, days }: { tint: string; days: number }) {
  const cells = Array.from({ length: days }, (_, i) =>
    Math.max(0, Math.sin(i * 0.7) * 0.5 + 0.4 + (i % 7 === 0 ? 0.3 : 0)),
  );
  const today = new Date();
  const firstDow = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - (days - 1),
  ).getDay();
  const padded: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) padded.push(null);
  padded.push(...cells);
  while (padded.length % 7 !== 0) padded.push(null);
  const cols = padded.length / 7;
  return (
    <div className="mt-3 overflow-x-auto">
      <div
        className="inline-grid gap-0.5"
        style={{
          gridTemplateColumns: `repeat(${cols}, 10px)`,
          gridTemplateRows: "repeat(7, 10px)",
          gridAutoFlow: "column",
        }}
      >
        {padded.map((v, i) => (
          <div
            key={i}
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              backgroundColor:
                v == null
                  ? "transparent"
                  : `color-mix(in srgb, ${tint} ${Math.round(
                      0.18 * 100 + v * 82,
                    )}%, transparent)`,
              outline: v != null ? "1px solid var(--rule)" : undefined,
              outlineOffset: -1,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function ContainerRenderer({
  container,
  module,
  selectedId,
  onSelect,
}: {
  container: Container;
  module: Module;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: container.direction,
        gap: container.gap ?? 8,
        padding: container.padding ?? 0,
        justifyContent: justifyMap(container.justify),
        alignItems: alignMap(container.align),
        flexWrap: container.wrap ? "wrap" : "nowrap",
        background: container.background,
        minHeight: container.children.length === 0 ? 200 : undefined,
      }}
    >
      {container.children.length === 0 ? (
        <div className="m-auto text-xs text-ink-faint">
          Empty — add an element
        </div>
      ) : (
        container.children.map((node) => (
          <NodeRenderer
            key={node.id}
            node={node}
            module={module}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))
      )}
    </div>
  );
}

function NodeRenderer({
  node,
  module,
  selectedId,
  onSelect,
}: {
  node: LayoutNode;
  module: Module;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (node.kind === "container") {
    return (
      <div className="border border-dashed border-rule rounded p-1">
        <ContainerRenderer
          container={node}
          module={module}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      </div>
    );
  }
  return (
    <ElementRenderer
      element={node}
      module={module}
      selected={selectedId === node.id}
      onSelect={() => onSelect(node.id)}
    />
  );
}

function ElementRenderer({
  element,
  module,
  selected,
  onSelect,
}: {
  element: Element;
  module: Module;
  selected: boolean;
  onSelect: () => void;
}) {
  const boundField = resolveBoundField(element, module);
  const label = boundField?.label ?? (element.config?.text as string | undefined);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`relative rounded transition-colors cursor-pointer ${
        selected
          ? "ring-2 ring-ink ring-offset-2 ring-offset-paper"
          : "hover:ring-1 hover:ring-ink-faint"
      }`}
      style={{ flexGrow: element.grow, width: element.width }}
    >
      <ElementBody
        element={element}
        module={module}
        boundField={boundField}
        label={label}
      />
    </div>
  );
}

export function RenderedElement({
  element,
  module,
}: {
  element: Element;
  module: Module;
}) {
  const boundField = resolveBoundField(element, module);
  const label =
    boundField?.label ?? (element.config?.text as string | undefined);
  return (
    <ElementBody
      element={element}
      module={module}
      boundField={boundField}
      label={label}
    />
  );
}

export function ElementBody({
  element,
  module,
  boundField,
  label,
}: {
  element: Element;
  module: Module;
  boundField: Field | null;
  label?: string;
}) {
  const cfg = element.config ?? {};
  switch (element.type) {
    case "heading":
      return (
        <h3
          className={
            cfg.size === "xl"
              ? "text-2xl font-medium"
              : cfg.size === "lg"
                ? "text-xl font-medium"
                : "text-base font-medium"
          }
        >
          {(cfg.text as string) || "Heading"}
        </h3>
      );
    case "paragraph":
      return (
        <p className="text-sm text-ink-muted">
          {(cfg.text as string) || "Paragraph text."}
        </p>
      );
    case "label":
      return (
        <div className="text-xs text-ink-muted">
          {(cfg.text as string) || "Label"}
        </div>
      );
    case "divider":
      return <hr className="border-rule" />;
    case "icon": {
      const colorToken = cfg.color as ColorToken | undefined;
      const swatch = swatchFor(colorToken);
      const size = (cfg.size as number | undefined) ?? 24;
      const align = (cfg.align as string) ?? "left";
      const weight =
        (cfg.weight as "thin" | "light" | "regular" | "bold" | "fill" | "duotone" | undefined) ??
        "regular";
      const justify =
        align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";
      return (
        <div style={{ display: "flex", justifyContent: justify, color: colorToken ? swatch.fill : undefined }}>
          <ModuleIcon icon={(cfg.name as string) || "ph:Heart"} size={size} weight={weight} />
        </div>
      );
    }
    case "spacer":
      return <div style={{ height: (cfg.size as number) ?? 16 }} />;
    case "button": {
      const fullWidth = !!cfg.fullWidth;
      const align = (cfg.align as string) ?? "left";
      const variant = cfg.variant ?? "primary";
      const colorToken = cfg.color as ColorToken | undefined;
      const swatch = swatchFor(colorToken);
      const styled = !!colorToken;
      const btnStyle: React.CSSProperties = styled
        ? variant === "primary"
          ? { backgroundColor: swatch.fill, color: swatch.on }
          : { borderColor: swatch.fill, color: swatch.fill }
        : {};
      const btn = (
        // Not `disabled` so click events still bubble out of the preview — that
        // lets the design canvas + Behavior-mode page thumbnails detect clicks
        // on the button and wire them. The button itself does nothing.
        <button
          type="button"
          onClick={(e) => e.preventDefault()}
          data-element-type="button"
          data-element-id={element.id}
          style={btnStyle}
          className={`text-sm px-4 py-1.5 rounded cursor-pointer ${
            fullWidth ? "w-full" : ""
          } ${
            styled
              ? variant === "primary"
                ? ""
                : "border"
              : variant === "primary"
                ? "bg-ink text-paper"
                : "border border-rule text-ink"
          }`}
        >
          {(cfg.text as string) || "Button"}
        </button>
      );
      if (fullWidth) return btn;
      const justify =
        align === "center"
          ? "center"
          : align === "right"
            ? "flex-end"
            : "flex-start";
      return (
        <div style={{ display: "flex", justifyContent: justify }}>{btn}</div>
      );
    }
    case "text_input":
    case "long_text_input": {
      const Tag = element.type === "long_text_input" ? "textarea" : "input";
      return (
        <FieldWrap label={label}>
          <Tag
            disabled
            placeholder={(cfg.placeholder as string) || ""}
            className="w-full bg-transparent border-b border-rule py-1.5 text-sm cursor-not-allowed text-ink-muted"
            rows={element.type === "long_text_input" ? 3 : undefined}
          />
        </FieldWrap>
      );
    }
    case "number_input":
      return (
        <FieldWrap label={label}>
          <div className="flex items-center gap-2">
            <input
              disabled
              type="number"
              placeholder={(cfg.placeholder as string) || "0"}
              className="flex-1 bg-transparent border-b border-rule py-1.5 text-sm cursor-not-allowed text-ink-muted"
            />
            {boundField?.type === "number" && boundField.unit && (
              <span className="text-xs text-ink-faint">{boundField.unit}</span>
            )}
          </div>
        </FieldWrap>
      );
    case "boolean_toggle": {
      const displayAs = (cfg.displayAs as string) ?? "switch";
      const on = !!cfg.defaultValue;
      if (displayAs === "checkbox") {
        return (
          <FieldWrap label={label} inline>
            <input
              type="checkbox"
              disabled
              checked={on}
              readOnly
              className="cursor-not-allowed"
            />
          </FieldWrap>
        );
      }
      // Switch UI (default)
      return (
        <FieldWrap label={label} inline>
          <span
            role="switch"
            aria-checked={on}
            className={`relative inline-block h-6 w-11 rounded-full transition-colors ${
              on ? "bg-ink" : "bg-rule"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-paper shadow-sm transition-transform ${
                on ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </span>
        </FieldWrap>
      );
    }
    case "date_input":
      return (
        <FieldWrap label={label}>
          <input
            disabled
            type="date"
            className="w-full bg-transparent border-b border-rule py-1.5 text-sm cursor-not-allowed text-ink-muted"
          />
        </FieldWrap>
      );
    case "select_input": {
      const displayAs = (cfg.displayAs as string) ?? "dropdown";
      const options =
        boundField && (boundField.type === "select" || boundField.type === "multi_select")
          ? boundField.options
          : [];
      const isMulti = boundField?.type === "multi_select";

      if (options.length === 0 && displayAs !== "dropdown") {
        return (
          <FieldWrap label={label}>
            <div className="text-xs text-ink-faint italic">
              No options yet — add them on the bound field.
            </div>
          </FieldWrap>
        );
      }

      if (displayAs === "chips") {
        return (
          <FieldWrap label={label}>
            <div className="flex flex-wrap gap-1.5">
              {options.map((o) => (
                <span
                  key={o.value}
                  className="text-xs px-3 py-1.5 rounded-full border border-rule text-ink-muted"
                >
                  {o.label}
                </span>
              ))}
            </div>
          </FieldWrap>
        );
      }

      if (displayAs === "radio" || displayAs === "checkbox") {
        const inputType = displayAs === "radio" || !isMulti ? "radio" : "checkbox";
        return (
          <FieldWrap label={label}>
            <div className="flex flex-col gap-2">
              {options.map((o) => (
                <label
                  key={o.value}
                  className="flex items-center gap-2 text-sm text-ink-muted"
                >
                  <input
                    type={inputType}
                    name={element.id}
                    disabled
                    className="cursor-not-allowed"
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </FieldWrap>
        );
      }

      return (
        <FieldWrap label={label}>
          <select
            disabled
            className="w-full bg-transparent border-b border-rule py-1.5 text-sm cursor-not-allowed text-ink-muted"
          >
            <option>{(cfg.placeholder as string) || "Choose..."}</option>
            {options.map((o) => (
              <option key={o.value}>{o.label}</option>
            ))}
          </select>
        </FieldWrap>
      );
    }
    case "relation_picker":
      return (
        <FieldWrap label={label}>
          <div className="w-full border-b border-rule py-1.5 text-sm text-ink-faint italic">
            → relation picker
          </div>
        </FieldWrap>
      );
    case "file_input":
      return (
        <FieldWrap label={label}>
          <div className="w-full border border-dashed border-rule rounded p-3 text-xs text-ink-faint text-center">
            📎 file
          </div>
        </FieldWrap>
      );
    case "progress_bar": {
      const pcfg = cfg as Record<string, unknown>;
      const labelText = (pcfg.label as string) || "Progress";
      const goalSource = pcfg.goalSource as
        | { collectionId?: string; fieldId?: string }
        | undefined;
      const isFieldGoal = !!(goalSource?.collectionId && goalSource?.fieldId);
      const goal = isFieldGoal ? 100 : ((pcfg.goal as number) ?? 100);
      const sampleValue = Math.round(goal * 0.6);
      const pct = Math.max(0, Math.min(100, (sampleValue / goal) * 100));
      const showText = pcfg.showText !== false;
      const suffix = (pcfg.suffix as string) ?? "";
      const sfx = surfaceStyle(element.surface, { border: true, radius: 6 });
      const spc = spacingStyle(element.spacing);
      const pHasBg = !!element.surface?.bgColor;
      const pStyle = (pcfg.style as string) ?? "linear";
      const barFill = pcfg.color
        ? swatchFor(pcfg.color as ColorToken).fill
        : "var(--ink)";
      return (
        <div
          style={{
            ...sfx,
            ...spc,
            paddingTop: spc.paddingTop ?? 12,
            paddingRight: spc.paddingRight ?? 16,
            paddingBottom: spc.paddingBottom ?? 12,
            paddingLeft: spc.paddingLeft ?? 16,
          }}
          className={`w-full ${pHasBg ? "" : "bg-paper"}`}
        >
          {pStyle === "radial" ? (
            (() => {
              const size = 140;
              const stroke = 10;
              const r = (size - stroke) / 2;
              const c = 2 * Math.PI * r;
              const dash = (pct / 100) * c;
              const radialAlign =
                (pcfg.align as string | undefined) ?? "center";
              const alignClass =
                radialAlign === "left"
                  ? "items-start"
                  : radialAlign === "right"
                    ? "items-end"
                    : "items-center";
              return (
                <div className={`flex flex-col ${alignClass}`}>
                  <span
                    style={textStyle(
                      pcfg.labelText as TextStyleConfig | undefined,
                    )}
                    className="text-xs text-ink-muted mb-2"
                  >
                    {labelText}
                  </span>
                  <div
                    className="relative"
                    style={{ width: size, height: size }}
                  >
                    <svg
                      width={size}
                      height={size}
                      viewBox={`0 0 ${size} ${size}`}
                      style={{ transform: "rotate(-90deg)" }}
                    >
                      <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={r}
                        fill="none"
                        stroke="var(--rule)"
                        strokeWidth={stroke}
                      />
                      <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={r}
                        fill="none"
                        stroke={barFill}
                        strokeWidth={stroke}
                        strokeLinecap="round"
                        strokeDasharray={`${dash} ${c}`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span
                        style={textStyle(
                          pcfg.valueText as TextStyleConfig | undefined,
                        )}
                        className="text-2xl font-medium text-ink leading-none"
                      >
                        {Math.round(pct)}%
                      </span>
                      {showText && (
                        <span className="text-[10px] text-ink-faint font-mono mt-1">
                          {sampleValue} / {goal}
                          {suffix ? ` ${suffix}` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <span
                  style={textStyle(
                    pcfg.labelText as TextStyleConfig | undefined,
                  )}
                  className="text-xs text-ink-muted"
                >
                  {labelText}
                </span>
                {showText && (
                  <span
                    style={textStyle(
                      pcfg.valueText as TextStyleConfig | undefined,
                    )}
                    className="text-[11px] text-ink-faint font-mono"
                  >
                    {sampleValue} / {goal}
                    {suffix ? ` ${suffix}` : ""}
                  </span>
                )}
              </div>
              <div className="mt-2 h-2 rounded-full bg-rule overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: barFill }}
                />
              </div>
            </>
          )}
        </div>
      );
    }
    case "chart": {
      const chartCfg = cfg as Record<string, unknown>;
      const style = (chartCfg.style as string) ?? "bar";
      const labelText =
        (chartCfg.label as string) ||
        (() => {
          const c = module.collections.find(
            (col) => col.id === (chartCfg.collectionId as string),
          );
          return c
            ? `${(chartCfg.aggregation as string) ?? "count"} · ${c.name}`
            : "Chart";
        })();
      const range = Math.max(
        1,
        Math.min(style === "heatmap" ? 365 : 60, (chartCfg.range as number) ?? (style === "heatmap" ? 90 : 7)),
      );
      const tint = chartCfg.color
        ? swatchFor(chartCfg.color as ColorToken).fill
        : "var(--ink)";
      const chartSfx = surfaceStyle(element.surface, {
        border: true,
        radius: 6,
      });
      const chartSpc = spacingStyle(element.spacing);
      const chartHasBg = !!element.surface?.bgColor;
      const isSpark = style === "spark";

      // Generate stable mock data
      const sample = Array.from({ length: Math.min(range, 14) }, (_, i) =>
        Math.round(20 + ((i * 37) % 80)),
      );
      const max = Math.max(...sample, 1);

      const wrapStyle = {
        ...chartSfx,
        ...chartSpc,
        paddingTop: chartSpc.paddingTop ?? (isSpark ? 6 : 12),
        paddingRight: chartSpc.paddingRight ?? (isSpark ? 8 : 16),
        paddingBottom: chartSpc.paddingBottom ?? (isSpark ? 6 : 12),
        paddingLeft: chartSpc.paddingLeft ?? (isSpark ? 8 : 16),
      };

      return (
        <div style={wrapStyle} className={`w-full ${chartHasBg ? "" : "bg-paper"}`}>
          {!isSpark && (
            <div className="flex items-baseline justify-between gap-2">
              <span
                style={textStyle(
                  chartCfg.labelText as TextStyleConfig | undefined,
                )}
                className="text-xs text-ink-muted"
              >
                {labelText}
              </span>
              <span
                style={textStyle(
                  chartCfg.totalText as TextStyleConfig | undefined,
                )}
                className="text-[11px] text-ink-faint font-mono"
              >
                ·
              </span>
            </div>
          )}

          {style === "bar" && (
            <div className="mt-3 flex items-end gap-1 h-24">
              {sample.map((v, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm"
                  style={{
                    height: `${(v / max) * 100}%`,
                    backgroundColor: tint,
                  }}
                />
              ))}
            </div>
          )}

          {(style === "line" || style === "area" || isSpark) && (
            <DesignLineMock
              sample={sample}
              tint={tint}
              area={style === "area" || isSpark}
              height={isSpark ? 40 : 96}
              marginTop={isSpark ? 0 : 12}
            />
          )}

          {style === "donut" && (
            <div className="mt-3 flex items-center gap-4">
              <DesignDonutMock tint={tint} />
              <ul className="flex-1 space-y-1 text-xs text-ink-muted">
                {["Category A", "Category B", "Category C"].map((c, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ backgroundColor: ["#5fa869", "#d97552", "#4b8bc4"][i] }}
                    />
                    <span className="flex-1 truncate">{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {style === "heatmap" && (
            <DesignHeatmapMock tint={tint} days={Math.min(range, 90)} />
          )}
        </div>
      );
    }
    case "stat": {
      const statCfg = cfg as Record<string, unknown>;
      const collection = module.collections.find(
        (c) => c.id === (statCfg.collectionId as string),
      );
      const labelText =
        (statCfg.label as string) ||
        (collection
          ? `${(statCfg.aggregation as string) ?? "count"} · ${collection.name}`
          : "Stat");
      const sample =
        (statCfg.aggregation as string) === "count" ? "12" : "1,240";
      const suffix = (statCfg.suffix as string) ?? "";
      const statColor = statCfg.color as ColorToken | undefined;
      const statSwatch = swatchFor(statColor);
      const statSfx = surfaceStyle(element.surface, {
        border: true,
        radius: 6,
      });
      const statSpc = spacingStyle(element.spacing);
      const statHasBg = !!element.surface?.bgColor;
      const statHasCustomSurface =
        !!element.surface?.bgColor || element.surface?.border !== undefined;
      // Legacy tint from `color` (before surface existed). Only applies when
      // the user hasn't taken control via the new Surface inspector.
      const legacyTint =
        statColor && !statHasCustomSurface
          ? { backgroundColor: statSwatch.soft, borderColor: statSwatch.fill }
          : {};
      return (
        <div
          className={`inline-flex flex-col ${statHasBg ? "" : "bg-paper"}`}
          style={{
            ...statSfx,
            ...legacyTint,
            ...statSpc,
            paddingTop: statSpc.paddingTop ?? 12,
            paddingRight: statSpc.paddingRight ?? 16,
            paddingBottom: statSpc.paddingBottom ?? 12,
            paddingLeft: statSpc.paddingLeft ?? 16,
          }}
        >
          <span
            style={textStyle(statCfg.labelText as TextStyleConfig | undefined)}
            className="text-[10px] uppercase tracking-[0.18em] text-ink-faint"
          >
            {labelText}
          </span>
          <span
            className="text-2xl font-medium text-ink mt-1"
            style={{
              ...(statColor ? { color: statSwatch.fill } : {}),
              ...textStyle(statCfg.valueText as TextStyleConfig | undefined),
            }}
          >
            {(statCfg.prefix as string) ?? ""}
            {sample}
            {suffix ? ` ${suffix}` : ""}
          </span>
        </div>
      );
    }
    case "list": {
      const collectionId =
        element.binding?.kind === "collection"
          ? element.binding.collectionId
          : null;
      const collection = collectionId
        ? module.collections.find((c) => c.id === collectionId)
        : null;
      const headerFields = collection ? collection.fields.slice(0, 3) : [];
      const title = (cfg.title as string) || collection?.name || "List";
      // Sample rows so the designer sees real layout dimensions.
      const sampleCount = 2;
      const listSfx = surfaceStyle(element.surface, {
        border: true,
        radius: 6,
      });
      const listSpc = spacingStyle(element.spacing);
      const listHasBg = !!element.surface?.bgColor;
      return (
        <div
          style={{ ...listSfx, ...listSpc }}
          className={`rounded-md overflow-hidden ${listHasBg ? "" : "bg-paper"}`}
        >
          <div className="px-4 py-2 border-b border-rule flex items-center justify-between">
            <span className="text-sm font-medium">{title}</span>
            <span className="text-[10px] text-ink-faint uppercase tracking-[0.18em]">
              {collection ? `${sampleCount} preview` : "no collection"}
            </span>
          </div>
          {!collection ? (
            <div className="px-4 py-6 text-center text-xs text-ink-faint italic">
              Bind this list to a collection to preview rows.
            </div>
          ) : (
            <ul>
              {Array.from({ length: sampleCount }).map((_, i) => (
                <li
                  key={i}
                  className="px-4 py-3 border-b last:border-b-0 border-rule flex items-baseline gap-3"
                >
                  {headerFields.map((f) => (
                    <span
                      key={f.id}
                      className={`${
                        f === headerFields[0]
                          ? "text-sm text-ink"
                          : "text-xs text-ink-muted"
                      } truncate`}
                    >
                      {f.label} {i + 1}
                    </span>
                  ))}
                  <span className="ml-auto text-[10px] text-ink-faint">
                    sample
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }
    default:
      return (
        <div className="text-xs text-ink-faint italic px-2 py-1 border border-dashed border-rule rounded">
          {element.type}
        </div>
      );
  }
}

function FieldWrap({
  label,
  inline,
  children,
}: {
  label?: string;
  inline?: boolean;
  children: React.ReactNode;
}) {
  if (inline) {
    return (
      <div className="flex items-center gap-3">
        {children}
        {label && <span className="text-sm text-ink">{label}</span>}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <div className="text-xs text-ink-muted">{label}</div>
      )}
      {children}
    </div>
  );
}

export function resolveBoundField(
  element: Element,
  module: Module,
): Field | null {
  if (!element.binding || element.binding.kind !== "field") return null;
  const { collectionId, fieldId } = element.binding;
  const coll = module.collections.find((c) => c.id === collectionId);
  if (!coll) return null;
  return coll.fields.find((f) => f.id === fieldId) ?? null;
}

function justifyMap(j?: string): string | undefined {
  if (!j) return undefined;
  if (j === "between") return "space-between";
  return `flex-${j}`;
}

function alignMap(a?: string): string | undefined {
  if (!a) return undefined;
  if (a === "stretch") return "stretch";
  return `flex-${a}`;
}
