"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type {
  Container,
  Element,
  Field,
  Id,
  LayoutNode,
  Module,
} from "@/lib/module/types";
import { deleteEntry, listEntries, type Entry } from "@/lib/module/entries";
import {
  evaluateStat,
  formatStat,
  readStatConfig,
} from "@/lib/module/stat";
import {
  evaluateChart,
  evaluateDonut,
  evaluateHeatmap,
  readChartConfig,
  type DonutSlice,
  type HeatmapCell,
} from "@/lib/module/chart";
import {
  spacingStyle,
  surfaceStyle,
  swatchFor,
  textStyle,
  type ColorToken,
} from "@/lib/module/palette";
import type { TextStyle as TextStyleConfig } from "@/lib/module/types";
import { evaluateVisibility } from "@/lib/module/validation";
import { ModuleIcon } from "@/components/module-icon";

export type FormState = Record<string, unknown>; // keyed by `${collectionId}::${fieldId}`
export type FormErrors = Record<string, string>; // same key shape as FormState

export function bindingKey(collectionId: Id, fieldId: Id): string {
  return `${collectionId}::${fieldId}`;
}

interface FormErrorsCtx {
  errors: FormErrors;
  clearError: (key: string) => void;
}

const FormErrorsContext = createContext<FormErrorsCtx>({
  errors: {},
  clearError: () => {},
});

export function FormErrorsProvider({
  errors,
  onClear,
  children,
}: {
  errors: FormErrors;
  onClear: (key: string) => void;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({ errors, clearError: onClear }),
    [errors, onClear],
  );
  return (
    <FormErrorsContext.Provider value={value}>
      {children}
    </FormErrorsContext.Provider>
  );
}

function useFieldError(fieldKey: string | null): string | null {
  const { errors } = useContext(FormErrorsContext);
  if (!fieldKey) return null;
  return errors[fieldKey] ?? null;
}

function useClearError() {
  return useContext(FormErrorsContext).clearError;
}

export function LiveContainer({
  container,
  module,
  formState,
  setFormState,
  onAction,
  entriesVersion,
  onEntriesChange,
  __depth = 0,
}: {
  container: Container;
  module: Module;
  formState: FormState;
  setFormState: (next: FormState) => void;
  onAction: (kind: string, params?: Record<string, unknown>) => void;
  entriesVersion: number;
  onEntriesChange: () => void;
  __depth?: number;
}) {
  if (container.collapsible) {
    return (
      <CollapsibleContainer
        container={container}
        module={module}
        formState={formState}
        setFormState={setFormState}
        onAction={onAction}
        entriesVersion={entriesVersion}
        onEntriesChange={onEntriesChange}
      />
    );
  }
  const bgSwatch = container.bgColor
    ? swatchFor(container.bgColor as ColorToken)
    : null;
  const borderSwatch = container.borderColor
    ? swatchFor(container.borderColor as ColorToken)
    : null;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: container.direction,
        gap: container.gap ?? 12,
        padding: container.padding ?? 24,
        alignItems: alignToFlex(container.align),
        justifyContent: justifyToFlex(container.justify),
        flexWrap: container.wrap ? "wrap" : "nowrap",
        backgroundColor: bgSwatch?.soft,
        border: container.border
          ? `1px solid ${borderSwatch?.fill ?? "var(--rule)"}`
          : undefined,
        borderRadius: container.border || bgSwatch ? 6 : undefined,
      }}
    >
      {container.children.map((node) => (
        <LiveNode
          key={node.id}
          node={node}
          module={module}
          formState={formState}
          setFormState={setFormState}
          onAction={onAction}
          entriesVersion={entriesVersion}
          onEntriesChange={onEntriesChange}
        />
      ))}
    </div>
  );
}

function CollapsibleContainer({
  container,
  module,
  formState,
  setFormState,
  onAction,
  entriesVersion,
  onEntriesChange,
}: {
  container: Container;
  module: Module;
  formState: FormState;
  setFormState: (next: FormState) => void;
  onAction: (kind: string, params?: Record<string, unknown>) => void;
  entriesVersion: number;
  onEntriesChange: () => void;
}) {
  const [expanded, setExpanded] = useState(container.defaultExpanded !== false);

  return (
    <div className="rounded-md border border-rule bg-paper overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-2 border-b border-rule text-sm hover:bg-rule/20 transition-colors text-left"
      >
        <span
          className="text-ink-faint inline-block transition-transform"
          style={{ transform: expanded ? "rotate(0deg)" : "rotate(-90deg)" }}
        >
          ▾
        </span>
        <span className="font-medium text-ink">
          {container.title || "Section"}
        </span>
      </button>
      {expanded && (
        <div
          style={{
            display: "flex",
            flexDirection: container.direction,
            gap: container.gap ?? 12,
            padding: container.padding ?? 16,
            alignItems: alignToFlex(container.align),
            justifyContent: justifyToFlex(container.justify),
            flexWrap: container.wrap ? "wrap" : "nowrap",
          }}
        >
          {container.children.map((node) => (
            <LiveNode
              key={node.id}
              node={node}
              module={module}
              formState={formState}
              setFormState={setFormState}
              onAction={onAction}
              entriesVersion={entriesVersion}
              onEntriesChange={onEntriesChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LiveNode({
  node,
  module,
  formState,
  setFormState,
  onAction,
  entriesVersion,
  onEntriesChange,
}: {
  node: LayoutNode;
  module: Module;
  formState: FormState;
  setFormState: (next: FormState) => void;
  onAction: (kind: string, params?: Record<string, unknown>) => void;
  entriesVersion: number;
  onEntriesChange: () => void;
  __depth?: number;
}) {
  if (node.kind === "container") {
    return (
      <div
        style={{
          // Match the editor's behavior: explicit width/grow overrides the
          // default grow-to-fill.
          flexGrow: node.grow ?? (node.width !== undefined ? 0 : 1),
          width: node.width,
        }}
      >
        <LiveContainer
          container={node}
          module={module}
          formState={formState}
          setFormState={setFormState}
          onAction={onAction}
          entriesVersion={entriesVersion}
          onEntriesChange={onEntriesChange}
        />
      </div>
    );
  }

  // Conditional visibility: skip render when the rule doesn't pass.
  if (node.visibleIf) {
    const r = node.visibleIf;
    const key = bindingKey(r.collectionId, r.fieldId);
    // Prefer the current in-flight form value; fall back to most recent entry
    // value for the bound collection (handy in display-only screens).
    let observed: unknown = formState[key];
    if (observed === undefined) {
      const list = listEntries(module.id, r.collectionId);
      observed = list[0]?.values[r.fieldId];
    }
    if (!evaluateVisibility(r, observed)) return null;
  }

  return (
    <div style={{ flexGrow: node.grow, width: node.width }}>
      <LiveElement
        element={node}
        module={module}
        formState={formState}
        setFormState={setFormState}
        onAction={onAction}
        entriesVersion={entriesVersion}
        onEntriesChange={onEntriesChange}
      />
    </div>
  );
}

function LiveElement({
  element,
  module,
  formState,
  setFormState,
  onAction,
  entriesVersion,
  onEntriesChange,
}: {
  element: Element;
  module: Module;
  formState: FormState;
  setFormState: (next: FormState) => void;
  onAction: (kind: string, params?: Record<string, unknown>) => void;
  entriesVersion: number;
  onEntriesChange: () => void;
  __depth?: number;
}) {
  const cfg = element.config ?? {};
  const boundField = resolveBoundField(element, module);
  const label = boundField?.label ?? (cfg.text as string | undefined);
  const fieldKey =
    element.binding?.kind === "field"
      ? bindingKey(element.binding.collectionId, element.binding.fieldId)
      : null;
  const value = fieldKey ? formState[fieldKey] : undefined;
  const clearError = useClearError();
  const error = useFieldError(fieldKey);
  const setValue = (v: unknown) => {
    if (!fieldKey) return;
    setFormState({ ...formState, [fieldKey]: v });
    if (error) clearError(fieldKey);
  };

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
      return <p className="text-sm text-ink-muted">{(cfg.text as string) || ""}</p>;
    case "label":
      return <div className="text-xs text-ink-muted">{(cfg.text as string) || ""}</div>;
    case "divider":
      return <hr className="border-rule" />;
    case "icon": {
      const colorToken = cfg.color as ColorToken | undefined;
      const swatch = swatchFor(colorToken);
      const size = (cfg.size as number | undefined) ?? 24;
      const align = (cfg.align as string) ?? "left";
      const weight =
        (cfg.weight as
          | "thin"
          | "light"
          | "regular"
          | "bold"
          | "fill"
          | "duotone"
          | undefined) ?? "regular";
      const justify =
        align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";
      return (
        <div
          style={{
            display: "flex",
            justifyContent: justify,
            color: colorToken ? swatch.fill : undefined,
          }}
        >
          <ModuleIcon
            icon={(cfg.name as string) || "ph:Heart"}
            size={size}
            weight={weight}
          />
        </div>
      );
    }
    case "spacer":
      return <div style={{ height: (cfg.size as number) ?? 16 }} />;
    case "button": {
      const fullWidth = !!cfg.fullWidth;
      const align = (cfg.align as string) ?? "left";
      const action = (cfg.action as string) ?? "save_entry";
      const thenAction = cfg.thenAction as string | undefined;
      const variant = (cfg.variant as string) ?? "primary";
      const swatch = swatchFor(cfg.color as ColorToken | undefined);
      const customColor = (cfg.color as ColorToken | undefined) !== undefined;
      const btnStyle: React.CSSProperties = customColor
        ? variant === "primary"
          ? { backgroundColor: swatch.fill, color: swatch.on }
          : { borderColor: swatch.fill, color: swatch.fill }
        : {};
      const btn = (
        <button
          type="button"
          onClick={() => {
            // First try the visual flow graph (element_clicked edges wired in
            // Behavior mode). The runtime returns whether any edge fired; if
            // it did, skip the legacy cfg.action fallback to avoid double-fire.
            onAction("element_clicked", {
              elementId: element.id,
              fallback: {
                action,
                targetScreenId: cfg.targetScreenId,
                thenAction,
                thenTargetScreenId: cfg.thenTargetScreenId,
              },
            });
          }}
          style={btnStyle}
          className={`text-sm px-4 py-2 rounded transition-opacity hover:opacity-90 ${
            fullWidth ? "w-full" : ""
          } ${
            customColor
              ? variant === "primary"
                ? ""
                : "border"
              : variant === "primary"
                ? "bg-ink text-paper"
                : "border border-rule text-ink"
          }`}
        >
          {(cfg.text as string) || "Save"}
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
      const Tag =
        element.type === "long_text_input" ? "textarea" : ("input" as const);
      return (
        <FieldWrap label={label} error={error} required={boundField?.required}>
          <Tag
            value={(value as string) ?? ""}
            onChange={(e) => setValue(e.target.value)}
            placeholder={(cfg.placeholder as string) || ""}
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1.5 text-sm"
            rows={element.type === "long_text_input" ? 3 : undefined}
          />
        </FieldWrap>
      );
    }
    case "number_input":
      return (
        <FieldWrap label={label} error={error} required={boundField?.required}>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={(value as string | number | undefined) ?? ""}
              onChange={(e) =>
                setValue(e.target.value === "" ? null : Number(e.target.value))
              }
              placeholder={(cfg.placeholder as string) || "0"}
              className="flex-1 bg-transparent border-b border-rule focus:border-ink outline-none py-1.5 text-sm"
            />
            {boundField?.type === "number" && boundField.unit && (
              <span className="text-xs text-ink-faint">{boundField.unit}</span>
            )}
          </div>
        </FieldWrap>
      );
    case "boolean_toggle": {
      const displayAs = (cfg.displayAs as string) ?? "switch";
      const checked = !!value;
      if (displayAs === "checkbox") {
        return (
          <FieldWrap label={label} inline error={error} required={boundField?.required}>
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setValue(e.target.checked)}
            />
          </FieldWrap>
        );
      }
      return (
        <FieldWrap label={label} inline error={error} required={boundField?.required}>
          <button
            type="button"
            onClick={() => setValue(!checked)}
            className={`relative h-6 w-11 rounded-full transition-colors shrink-0 ${
              checked ? "bg-ink" : "bg-rule"
            }`}
          >
            <span
              style={{
                transform: `translateX(${checked ? 22 : 2}px)`,
              }}
              className="absolute top-0.5 left-0 h-5 w-5 rounded-full bg-paper shadow-[0_1px_2px_rgba(0,0,0,0.25)] transition-transform duration-150"
            />
          </button>
        </FieldWrap>
      );
    }
    case "date_input":
      return (
        <FieldWrap label={label} error={error} required={boundField?.required}>
          <input
            type="date"
            value={(value as string) ?? ""}
            onChange={(e) => setValue(e.target.value)}
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1.5 text-sm"
          />
        </FieldWrap>
      );
    case "select_input": {
      const displayAs = (cfg.displayAs as string) ?? "dropdown";
      const options =
        boundField &&
        (boundField.type === "select" || boundField.type === "multi_select")
          ? boundField.options
          : [];
      const isMulti = boundField?.type === "multi_select";

      if (displayAs === "chips") {
        const selected: string[] = Array.isArray(value)
          ? (value as string[])
          : value
            ? [value as string]
            : [];
        const toggle = (val: string) => {
          if (isMulti) {
            setValue(
              selected.includes(val)
                ? selected.filter((v) => v !== val)
                : [...selected, val],
            );
          } else {
            setValue(val);
          }
        };
        return (
          <FieldWrap label={label} error={error} required={boundField?.required}>
            <div className="flex flex-wrap gap-1.5">
              {options.map((o) => {
                const active = selected.includes(o.value);
                return (
                  <button
                    type="button"
                    key={o.value}
                    onClick={() => toggle(o.value)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      active
                        ? "border-ink bg-ink text-paper"
                        : "border-rule text-ink-muted hover:border-ink hover:text-ink"
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </FieldWrap>
        );
      }

      if (displayAs === "radio" || displayAs === "checkbox") {
        const inputType =
          displayAs === "radio" || !isMulti ? "radio" : "checkbox";
        return (
          <FieldWrap label={label} error={error} required={boundField?.required}>
            <div className="flex flex-col gap-2">
              {options.map((o) => {
                const checked =
                  inputType === "radio"
                    ? value === o.value
                    : Array.isArray(value) && (value as string[]).includes(o.value);
                return (
                  <label
                    key={o.value}
                    className="flex items-center gap-2 text-sm text-ink-muted cursor-pointer"
                  >
                    <input
                      type={inputType}
                      name={element.id}
                      checked={checked}
                      onChange={(e) => {
                        if (inputType === "radio") setValue(o.value);
                        else {
                          const cur = Array.isArray(value)
                            ? (value as string[])
                            : [];
                          setValue(
                            e.target.checked
                              ? [...cur, o.value]
                              : cur.filter((v) => v !== o.value),
                          );
                        }
                      }}
                    />
                    {o.label}
                  </label>
                );
              })}
            </div>
          </FieldWrap>
        );
      }

      return (
        <FieldWrap label={label} error={error} required={boundField?.required}>
          <select
            value={(value as string) ?? ""}
            onChange={(e) => setValue(e.target.value || null)}
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1.5 text-sm"
          >
            <option value="">{(cfg.placeholder as string) || "Choose..."}</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </FieldWrap>
      );
    }
    case "relation_picker":
      return (
        <FieldWrap label={label} error={error} required={boundField?.required}>
          <div className="w-full border-b border-rule py-1.5 text-sm text-ink-faint italic">
            → relation picker (coming soon)
          </div>
        </FieldWrap>
      );
    case "file_input":
      return (
        <FieldWrap label={label} error={error} required={boundField?.required}>
          <div className="w-full border border-dashed border-rule rounded p-3 text-xs text-ink-faint text-center">
            📎 file upload (coming soon)
          </div>
        </FieldWrap>
      );
    case "list":
      return (
        <LiveList
          element={element}
          module={module}
          version={entriesVersion}
          onChange={onEntriesChange}
        />
      );
    case "stat":
      return (
        <LiveStat
          element={element}
          module={module}
          version={entriesVersion}
        />
      );
    case "progress_bar":
      return (
        <LiveProgressBar
          element={element}
          module={module}
          version={entriesVersion}
        />
      );
    case "chart":
      return (
        <LiveChart
          element={element}
          module={module}
          version={entriesVersion}
        />
      );
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
  error,
  required,
  children,
}: {
  label?: string;
  inline?: boolean;
  error?: string | null;
  required?: boolean;
  children: React.ReactNode;
}) {
  // When a field has an error, wrap it in a soft red-tinted card so it
  // visually pops above the surrounding inputs.
  const errorCardClass =
    "rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2";

  if (inline) {
    return (
      <div className={`flex flex-col gap-1 ${error ? errorCardClass : ""}`}>
        <div className="flex items-center gap-3">
          {children}
          {label && (
            <span className="text-sm text-ink">
              {label}
              {required && <span className="text-ink-faint"> *</span>}
            </span>
          )}
        </div>
        {error && (
          <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }
  return (
    <div className={`flex flex-col gap-1 ${error ? errorCardClass : ""}`}>
      {label && (
        <div className="text-xs text-ink-muted">
          {label}
          {required && <span className="text-ink-faint"> *</span>}
        </div>
      )}
      <div
        className={
          error
            ? "[&_input]:border-red-500! [&_textarea]:border-red-500! [&_select]:border-red-500!"
            : undefined
        }
      >
        {children}
      </div>
      {error && (
        <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

function resolveBoundField(element: Element, module: Module): Field | null {
  if (!element.binding || element.binding.kind !== "field") return null;
  const { collectionId, fieldId } = element.binding;
  const coll = module.collections.find((c) => c.id === collectionId);
  if (!coll) return null;
  return coll.fields.find((f) => f.id === fieldId) ?? null;
}

function alignToFlex(a?: string): string | undefined {
  if (!a) return undefined;
  if (a === "stretch") return "stretch";
  return `flex-${a}`;
}

function justifyToFlex(j?: string): string | undefined {
  if (!j) return undefined;
  if (j === "between") return "space-between";
  return `flex-${j}`;
}

function LiveList({
  element,
  module,
  version,
  onChange,
}: {
  element: Element;
  module: Module;
  version: number;
  onChange: () => void;
}) {
  const collectionId =
    element.binding?.kind === "collection" ? element.binding.collectionId : null;
  const collection = collectionId
    ? module.collections.find((c) => c.id === collectionId)
    : null;
  const cfg = element.config ?? {};
  const title = (cfg.title as string) || collection?.name || "List";

  const [entries, setEntries] = useState<Entry[]>([]);
  useEffect(() => {
    if (!collection) return;
    setEntries(listEntries(module.id, collection.id));
  }, [module.id, collection?.id, collection, version]);

  if (!collection) {
    return (
      <div className="border border-dashed border-rule rounded-md px-4 py-6 text-xs text-ink-faint text-center italic">
        List not bound to a collection.
      </div>
    );
  }

  const groupByFieldId = (cfg.groupBy as Id | undefined) || null;
  const groupByField = groupByFieldId
    ? collection.fields.find((f) => f.id === groupByFieldId)
    : null;

  const grouped: Record<string, Entry[]> = {};
  if (groupByField) {
    for (const e of entries) {
      const raw = e.values[groupByField.id];
      const key = raw == null ? "—" : String(raw);
      grouped[key] = grouped[key] ?? [];
      grouped[key].push(e);
    }
  }

  const renderRow = (e: Entry) => {
    const fields = collection.fields.slice(0, 3);
    return (
      <li
        key={e.id}
        className="group px-4 py-3 border-b last:border-b-0 border-rule hover:bg-rule/10 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            {fields.map((f, i) => {
              const v = e.values[f.id];
              if (v == null || v === "") return null;
              const formatted =
                f.type === "select" || f.type === "multi_select"
                  ? formatSelect(f, v)
                  : Array.isArray(v)
                    ? v.join(", ")
                    : String(v);
              return (
                <span
                  key={f.id}
                  className={
                    i === 0
                      ? "text-sm text-ink"
                      : "text-xs text-ink-muted"
                  }
                >
                  {i === 0 ? formatted : `${f.label}: ${formatted}`}
                </span>
              );
            })}
            <span className="text-[10px] text-ink-faint">
              {new Date(e.createdAt).toLocaleString()}
            </span>
          </div>
          <button
            onClick={() => {
              deleteEntry(module.id, collection.id, e.id);
              onChange();
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-ink-faint hover:text-ink"
            aria-label="Delete entry"
          >
            ✕
          </button>
        </div>
      </li>
    );
  };

  const surfaceCss = surfaceStyle(element.surface, { border: true, radius: 6 });
  const spacingCss = spacingStyle(element.spacing);
  const hasBg = !!element.surface?.bgColor;

  return (
    <div
      style={{ ...surfaceCss, ...spacingCss }}
      className={`rounded-md overflow-hidden ${hasBg ? "" : "bg-paper"}`}
    >
      <div className="px-4 py-2 border-b border-rule flex items-center justify-between">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-[10px] text-ink-faint uppercase tracking-[0.18em]">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </span>
      </div>
      {entries.length === 0 ? (
        <div className="px-4 py-8 text-center text-xs text-ink-faint italic">
          No entries yet.
        </div>
      ) : groupByField ? (
        <div>
          {Object.entries(grouped).map(([key, items]) => (
            <div key={key}>
              <div className="px-4 py-1.5 text-[10px] uppercase tracking-[0.18em] text-ink-faint bg-rule/20 border-b border-rule">
                {groupByField.type === "select" ||
                groupByField.type === "multi_select"
                  ? formatSelect(groupByField, key)
                  : key}
                <span className="ml-2 normal-case tracking-normal text-ink-faint/70">
                  · {items.length}
                </span>
              </div>
              <ul>{items.map(renderRow)}</ul>
            </div>
          ))}
        </div>
      ) : (
        <ul>{entries.map(renderRow)}</ul>
      )}
    </div>
  );
}

function LiveStat({
  element,
  module,
  version,
}: {
  element: Element;
  module: Module;
  version: number;
}) {
  const cfg = readStatConfig(element);
  const collection = cfg.collectionId
    ? module.collections.find((c) => c.id === cfg.collectionId)
    : null;

  const [result, setResult] = useState<{
    value: number | null;
    suffix?: string;
  }>({ value: null });

  useEffect(() => {
    if (!collection) {
      setResult({ value: null });
      return;
    }
    const entries = listEntries(module.id, collection.id);
    setResult(evaluateStat(module, entries, cfg));
  }, [module, collection, version, cfg.aggregation, cfg.fieldId, cfg.filter]);

  const label =
    cfg.label ||
    (collection
      ? `${(cfg.aggregation ?? "count").toUpperCase()} · ${collection.name}`
      : "Stat");

  const display = collection
    ? formatStat(result.value, cfg, result.suffix)
    : "—";

  const colorToken = (cfg as { color?: ColorToken }).color;
  const swatch = swatchFor(colorToken);
  const surfaceCss = surfaceStyle(element.surface, { border: true, radius: 6 });
  const spacingCss = spacingStyle(element.spacing);
  const hasBg = !!element.surface?.bgColor;
  // Legacy: stat used `cfg.color` to tint its own card before surface existed.
  const legacyTint: React.CSSProperties =
    colorToken && !hasBg && !element.surface?.border
      ? { backgroundColor: swatch.soft, borderColor: swatch.fill }
      : {};
  const valueStyle: React.CSSProperties = colorToken
    ? { color: swatch.fill }
    : {};

  return (
    <div
      style={{
        ...surfaceCss,
        ...legacyTint,
        ...spacingCss,
        paddingTop: spacingCss.paddingTop ?? 12,
        paddingRight: spacingCss.paddingRight ?? 16,
        paddingBottom: spacingCss.paddingBottom ?? 12,
        paddingLeft: spacingCss.paddingLeft ?? 16,
      }}
      className={`inline-flex flex-col ${hasBg ? "" : "bg-paper"}`}
    >
      <span
        style={textStyle((cfg as { labelText?: TextStyleConfig }).labelText)}
        className="text-[10px] uppercase tracking-[0.18em] text-ink-faint"
      >
        {label}
      </span>
      <span
        style={{
          ...valueStyle,
          ...textStyle((cfg as { valueText?: TextStyleConfig }).valueText),
        }}
        className="text-2xl font-medium text-ink mt-1"
      >
        {display}
      </span>
    </div>
  );
}

function LiveProgressBar({
  element,
  module,
  version,
}: {
  element: Element;
  module: Module;
  version: number;
}) {
  const cfg = readStatConfig(element);
  const collection = cfg.collectionId
    ? module.collections.find((c) => c.id === cfg.collectionId)
    : null;
  const showText = element.config?.showText !== false;
  const label = cfg.label || "Progress";

  // Resolve goal: a literal number, or read from a (collection, field) source —
  // useful with a singleton collection so end users can edit their goal.
  const goalSource = element.config?.goalSource as
    | { collectionId?: string; fieldId?: string }
    | undefined;
  let goal = (element.config?.goal as number) ?? 100;
  if (goalSource?.collectionId && goalSource?.fieldId) {
    const goalEntries = listEntries(module.id, goalSource.collectionId);
    const raw = goalEntries[0]?.values[goalSource.fieldId];
    if (typeof raw === "number") goal = raw;
  }

  const [result, setResult] = useState<{
    value: number | null;
    suffix?: string;
  }>({ value: null });

  useEffect(() => {
    if (!collection) {
      setResult({ value: null });
      return;
    }
    const entries = listEntries(module.id, collection.id);
    setResult(evaluateStat(module, entries, cfg));
  }, [module, collection, version, cfg.aggregation, cfg.fieldId, cfg.filter]);

  const value = result.value ?? 0;
  const suffix = cfg.suffix ?? result.suffix ?? "";
  const pct =
    goal > 0 ? Math.max(0, Math.min(100, (value / goal) * 100)) : 0;
  const isOver = goal > 0 && value > goal;
  const colorToken = (cfg as { color?: ColorToken }).color;
  const swatch = swatchFor(colorToken);
  const surfaceCss = surfaceStyle(element.surface, { border: true, radius: 6 });
  const spacingCss = spacingStyle(element.spacing);
  const hasBg = !!element.surface?.bgColor;

  const progressStyle = ((cfg as { style?: string }).style ?? "linear") as
    | "linear"
    | "radial";
  const radialAlign = ((cfg as { align?: string }).align ?? "center") as
    | "left"
    | "center"
    | "right";
  const barFill = isOver
    ? "var(--color-red, #d44)"
    : colorToken
      ? swatch.fill
      : "var(--ink)";

  return (
    <div
      style={{
        ...surfaceCss,
        ...spacingCss,
        paddingTop: spacingCss.paddingTop ?? 12,
        paddingRight: spacingCss.paddingRight ?? 16,
        paddingBottom: spacingCss.paddingBottom ?? 12,
        paddingLeft: spacingCss.paddingLeft ?? 16,
      }}
      className={`w-full ${hasBg ? "" : "bg-paper"}`}
    >
      {progressStyle === "radial" ? (
        <RadialProgress
          label={label}
          value={value}
          goal={goal}
          pct={pct}
          suffix={suffix}
          showText={showText}
          barFill={barFill}
          align={radialAlign}
          labelStyle={textStyle(
            (cfg as { labelText?: TextStyleConfig }).labelText,
          )}
          valueStyle={textStyle(
            (cfg as { valueText?: TextStyleConfig }).valueText,
          )}
        />
      ) : (
        <>
          <div className="flex items-baseline justify-between gap-2">
            <span
              style={textStyle(
                (cfg as { labelText?: TextStyleConfig }).labelText,
              )}
              className="text-xs text-ink-muted"
            >
              {label}
            </span>
            {showText && (
              <span
                style={textStyle(
                  (cfg as { valueText?: TextStyleConfig }).valueText,
                )}
                className="text-[11px] text-ink-faint font-mono"
              >
                {formatNumber(value)} / {formatNumber(goal)}
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

function RadialProgress({
  label,
  value,
  goal,
  pct,
  suffix,
  showText,
  barFill,
  align,
  labelStyle,
  valueStyle,
}: {
  label: string;
  value: number;
  goal: number;
  pct: number;
  suffix: string;
  showText: boolean;
  barFill: string;
  align: "left" | "center" | "right";
  labelStyle: React.CSSProperties;
  valueStyle: React.CSSProperties;
}) {
  const size = 140;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const dash = (pct / 100) * circumference;
  const alignClass =
    align === "left"
      ? "items-start"
      : align === "right"
        ? "items-end"
        : "items-center";
  return (
    <div className={`flex flex-col ${alignClass}`}>
      <span style={labelStyle} className="text-xs text-ink-muted mb-2">
        {label}
      </span>
      <div className="relative" style={{ width: size, height: size }}>
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
            strokeDasharray={`${dash} ${circumference}`}
            style={{ transition: "stroke-dasharray 0.3s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            style={valueStyle}
            className="text-2xl font-medium text-ink leading-none"
          >
            {Math.round(pct)}%
          </span>
          {showText && (
            <span className="text-[10px] text-ink-faint font-mono mt-1">
              {formatNumber(value)} / {formatNumber(goal)}
              {suffix ? ` ${suffix}` : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

type ChartWindow = "week" | "month" | "year";

const CHART_WINDOWS: {
  id: ChartWindow;
  label: string;
  bucket: "day" | "week" | "month";
  range: number;
}[] = [
  { id: "week", label: "Week", bucket: "day", range: 7 },
  { id: "month", label: "Month", bucket: "day", range: 30 },
  { id: "year", label: "Year", bucket: "month", range: 12 },
];

const HEATMAP_WINDOWS: { id: ChartWindow; label: string; days: number }[] = [
  { id: "week", label: "Week", days: 7 },
  { id: "month", label: "Month", days: 30 },
  { id: "year", label: "Year", days: 365 },
];

function inferWindow(
  bucket: string | undefined,
  range: number | undefined,
): ChartWindow {
  if (bucket === "month") return "year";
  if (bucket === "week") return "year";
  if (bucket === "day" && (range ?? 7) >= 28) return "month";
  return "week";
}

function LiveChart({
  element,
  module,
  version,
}: {
  element: Element;
  module: Module;
  version: number;
}) {
  const cfg = readChartConfig(element);
  const style = cfg.style ?? "bar";
  const collection = cfg.collectionId
    ? module.collections.find((c) => c.id === cfg.collectionId)
    : null;

  const isSpark = style === "spark";
  const isDonut = style === "donut";
  const isHeatmap = style === "heatmap";
  const showWindowSwitcher = !isSpark && !isDonut;

  // Default window from saved bucket+range; user can flip at runtime.
  const [window, setWindow] = useState<ChartWindow>(() =>
    inferWindow(cfg.bucket, cfg.range),
  );

  const effectiveCfg = useMemo(() => {
    if (!showWindowSwitcher) return cfg;
    if (isHeatmap) {
      const w = HEATMAP_WINDOWS.find((x) => x.id === window) ?? HEATMAP_WINDOWS[0];
      return { ...cfg, range: w.days };
    }
    const w = CHART_WINDOWS.find((x) => x.id === window) ?? CHART_WINDOWS[0];
    return { ...cfg, bucket: w.bucket, range: w.range };
  }, [cfg, window, isHeatmap, showWindowSwitcher]);

  const [points, setPoints] = useState<
    { label: string; value: number }[]
  >([]);
  const [slices, setSlices] = useState<DonutSlice[]>([]);
  const [heatCells, setHeatCells] = useState<HeatmapCell[]>([]);
  const [heatMax, setHeatMax] = useState(0);
  const [suffix, setSuffix] = useState<string | undefined>();

  useEffect(() => {
    if (!collection) {
      setPoints([]);
      setSlices([]);
      setHeatCells([]);
      return;
    }
    const entries = listEntries(module.id, collection.id);
    if (style === "donut") {
      const result = evaluateDonut(module, entries, effectiveCfg);
      setSlices(result.slices);
      setSuffix(effectiveCfg.suffix ?? result.suffix);
    } else if (style === "heatmap") {
      const result = evaluateHeatmap(module, entries, effectiveCfg);
      setHeatCells(result.cells);
      setHeatMax(result.max);
      setSuffix(effectiveCfg.suffix ?? result.suffix);
    } else {
      const result = evaluateChart(module, entries, effectiveCfg);
      setPoints(result.points.map(({ label, value }) => ({ label, value })));
      setSuffix(effectiveCfg.suffix ?? result.suffix);
    }
  }, [
    module,
    collection,
    version,
    style,
    effectiveCfg.aggregation,
    effectiveCfg.fieldId,
    effectiveCfg.bucket,
    effectiveCfg.range,
    effectiveCfg.groupBy,
    effectiveCfg.suffix,
  ]);

  const label =
    cfg.label ||
    (collection
      ? `${(cfg.aggregation ?? "count").toUpperCase()} · ${collection.name}`
      : "Chart");

  const colorToken = (cfg as { color?: ColorToken }).color;
  const swatch = swatchFor(colorToken);
  const surfaceCss = surfaceStyle(element.surface, { border: true, radius: 6 });
  const spacingCss = spacingStyle(element.spacing);
  const hasBg = !!element.surface?.bgColor;

  const totalForHeader =
    style === "donut"
      ? slices.reduce((s, x) => s + x.value, 0)
      : style === "heatmap"
        ? heatCells.reduce((s, c) => s + c.value, 0)
        : points.reduce((s, p) => s + p.value, 0);
  const showEmpty =
    (style === "donut" && slices.length === 0) ||
    (style === "heatmap" && heatCells.length === 0) ||
    ((style === "bar" || style === "line" || style === "area" || isSpark) &&
      points.length === 0);

  return (
    <div
      style={{
        ...surfaceCss,
        ...spacingCss,
        paddingTop: spacingCss.paddingTop ?? (isSpark ? 6 : 12),
        paddingRight: spacingCss.paddingRight ?? (isSpark ? 8 : 16),
        paddingBottom: spacingCss.paddingBottom ?? (isSpark ? 6 : 12),
        paddingLeft: spacingCss.paddingLeft ?? (isSpark ? 8 : 16),
      }}
      className={`w-full ${hasBg ? "" : "bg-paper"}`}
    >
      {!isSpark && (
        <div className="flex items-center justify-between gap-2">
          <span
            style={textStyle(
              (cfg as { labelText?: TextStyleConfig }).labelText,
            )}
            className="text-xs text-ink-muted"
          >
            {label}
          </span>
          <div className="flex items-center gap-2">
            {showWindowSwitcher && (
              <div className="inline-flex rounded border border-rule overflow-hidden">
                {(isHeatmap ? HEATMAP_WINDOWS : CHART_WINDOWS).map((w) => {
                  const active = window === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setWindow(w.id)}
                      className={`px-2 py-0.5 text-[10px] uppercase tracking-widest transition-colors ${
                        active
                          ? "bg-ink text-paper"
                          : "text-ink-muted hover:text-ink"
                      }`}
                    >
                      {w.label}
                    </button>
                  );
                })}
              </div>
            )}
            <span
              style={textStyle(
                (cfg as { totalText?: TextStyleConfig }).totalText,
              )}
              className="text-[11px] text-ink-faint font-mono"
            >
              {formatNumber(totalForHeader)}
              {suffix ? ` ${suffix}` : ""}
            </span>
          </div>
        </div>
      )}

      {showEmpty ? (
        <div
          className={`mt-3 flex items-center justify-center text-xs text-ink-faint italic ${
            isSpark ? "h-8" : "h-24"
          }`}
        >
          {collection ? "No data" : "Pick a collection"}
        </div>
      ) : style === "bar" ? (
        <ChartBars
          points={points}
          colorToken={colorToken}
          swatchFill={swatch.fill}
          suffix={suffix}
          showLabels
        />
      ) : style === "line" || style === "area" ? (
        <ChartLine
          points={points}
          area={style === "area"}
          colorToken={colorToken}
          swatchFill={swatch.fill}
          suffix={suffix}
          height={96}
          showLabels
        />
      ) : isSpark ? (
        <ChartLine
          points={points}
          area
          colorToken={colorToken}
          swatchFill={swatch.fill}
          suffix={suffix}
          height={40}
          showLabels={false}
        />
      ) : style === "donut" ? (
        <ChartDonut slices={slices} colorToken={colorToken} suffix={suffix} />
      ) : (
        <ChartHeatmap
          cells={heatCells}
          max={heatMax}
          colorToken={colorToken}
          swatchFill={swatch.fill}
          suffix={suffix}
        />
      )}
    </div>
  );
}

function ChartBars({
  points,
  colorToken,
  swatchFill,
  suffix,
  showLabels,
}: {
  points: { label: string; value: number }[];
  colorToken: ColorToken | undefined;
  swatchFill: string;
  suffix: string | undefined;
  showLabels: boolean;
}) {
  const max = points.reduce((m, p) => Math.max(m, p.value), 0);
  return (
    <>
      <div className="mt-3 flex items-end gap-1 h-24">
        {points.map((p, i) => {
          const h = max > 0 ? (p.value / max) * 100 : 0;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end gap-1"
              title={`${p.label}: ${formatNumber(p.value)}${
                suffix ? ` ${suffix}` : ""
              }`}
            >
              <div
                className={`w-full rounded-sm transition-all ${
                  colorToken ? "" : "bg-ink"
                }`}
                style={{
                  height: `${h}%`,
                  minHeight: p.value > 0 ? 2 : 0,
                  ...(colorToken ? { backgroundColor: swatchFill } : {}),
                }}
              />
            </div>
          );
        })}
      </div>
      {showLabels && (
        <div className="mt-1 flex gap-1">
          {points.map((p, i) => (
            <div
              key={i}
              className="flex-1 text-[9px] text-ink-faint text-center truncate"
            >
              {p.label}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function ChartLine({
  points,
  area,
  colorToken,
  swatchFill,
  suffix,
  height,
  showLabels,
}: {
  points: { label: string; value: number }[];
  area: boolean;
  colorToken: ColorToken | undefined;
  swatchFill: string;
  suffix: string | undefined;
  height: number;
  showLabels: boolean;
}) {
  const max = points.reduce((m, p) => Math.max(m, p.value), 0);
  const stroke = colorToken ? swatchFill : "var(--ink)";
  const n = points.length;
  // Layout in a unit viewBox so it stretches; padding 2 units on each side.
  const W = 100;
  const H = 100;
  const stepX = n > 1 ? (W - 4) / (n - 1) : 0;
  const toY = (v: number) =>
    max > 0 ? H - 4 - (v / max) * (H - 8) : H - 4;
  const pts = points.map((p, i) => ({ x: 2 + i * stepX, y: toY(p.value) }));
  const linePath = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L ${(2 + (n - 1) * stepX).toFixed(2)} ${H - 4} L 2 ${H - 4} Z`;
  return (
    <>
      <div style={{ height }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          width="100%"
          height="100%"
        >
          {area && (
            <path
              d={areaPath}
              fill={stroke}
              opacity={0.15}
            />
          )}
          <path
            d={linePath}
            fill="none"
            stroke={stroke}
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {pts.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={1.4}
              fill={stroke}
              vectorEffect="non-scaling-stroke"
            >
              <title>{`${points[i].label}: ${formatNumber(points[i].value)}${
                suffix ? ` ${suffix}` : ""
              }`}</title>
            </circle>
          ))}
        </svg>
      </div>
      {showLabels && (
        <div className="mt-1 flex gap-1">
          {points.map((p, i) => (
            <div
              key={i}
              className="flex-1 text-[9px] text-ink-faint text-center truncate"
            >
              {p.label}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function ChartDonut({
  slices,
  colorToken,
  suffix,
}: {
  slices: DonutSlice[];
  colorToken: ColorToken | undefined;
  suffix: string | undefined;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  // Choose a palette mid tier; if the user picked a single color, derive
  // the rest by walking the palette adjacent hues. Cheap approach: rotate.
  const baseFills = [
    "#5fa869", // sage
    "#d97552", // clay
    "#e0a82e", // ochre
    "#4b8bc4", // slate
    "#a368c4", // plum
    "#e0708a", // rose
    "#2c8f5b", // forest
    "#7a766e", // gray
  ];
  const userColor = colorToken ? swatchFor(colorToken).fill : null;
  const fill = (i: number) =>
    userColor && i === 0 ? userColor : baseFills[i % baseFills.length];

  // Build SVG arcs.
  const R = 42;
  const r = 26; // inner ring → donut
  const cx = 50;
  const cy = 50;
  let angle = -Math.PI / 2;
  const arcs = slices.map((s, i) => {
    const frac = s.value / total;
    const a0 = angle;
    const a1 = angle + frac * 2 * Math.PI;
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
    return { d, slice: s, color: fill(i), pct: frac * 100 };
  });

  return (
    <div className="mt-3 flex items-center gap-4">
      <div className="shrink-0" style={{ width: 100, height: 100 }}>
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          {arcs.map((a, i) => (
            <path key={i} d={a.d} fill={a.color}>
              <title>{`${a.slice.label}: ${formatNumber(a.slice.value)} (${a.pct.toFixed(0)}%)`}</title>
            </path>
          ))}
        </svg>
      </div>
      <ul className="flex-1 space-y-1 min-w-0">
        {arcs.map((a, i) => (
          <li key={i} className="flex items-center gap-2 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: a.color }}
            />
            <span className="flex-1 truncate text-ink-muted">
              {a.slice.label}
            </span>
            <span className="text-[11px] text-ink-faint font-mono">
              {formatNumber(a.slice.value)}
              {suffix ? ` ${suffix}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChartHeatmap({
  cells,
  max,
  colorToken,
  swatchFill,
  suffix,
}: {
  cells: HeatmapCell[];
  max: number;
  colorToken: ColorToken | undefined;
  swatchFill: string;
  suffix: string | undefined;
}) {
  if (cells.length === 0) return null;
  // Lay out columns of 7 rows (weeks). Start column may have leading nulls
  // so weekdays align (Sun..Sat from top to bottom).
  const firstDow = cells[0].date.getDay();
  const padded: (HeatmapCell | null)[] = [];
  for (let i = 0; i < firstDow; i++) padded.push(null);
  padded.push(...cells);
  // Pad end so cols * 7 covers all.
  while (padded.length % 7 !== 0) padded.push(null);
  const cols = padded.length / 7;

  const color = colorToken ? swatchFill : "var(--ink)";
  const intensity = (v: number) => {
    if (max <= 0 || v <= 0) return 0;
    return Math.min(1, 0.18 + (v / max) * 0.82);
  };

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
        {padded.map((cell, i) => (
          <div
            key={i}
            title={
              cell
                ? `${cell.date.toLocaleDateString()}: ${formatNumber(cell.value)}${
                    suffix ? ` ${suffix}` : ""
                  }`
                : undefined
            }
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              backgroundColor: cell
                ? `color-mix(in srgb, ${color} ${intensity(cell.value) * 100}%, transparent)`
                : "transparent",
              outline: cell ? "1px solid var(--rule)" : undefined,
              outlineOffset: -1,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function formatNumber(n: number): string {
  if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
  return n.toFixed(1);
}

function formatSelect(field: Field, value: unknown): string {
  if (field.type !== "select" && field.type !== "multi_select") return String(value);
  const vals = Array.isArray(value) ? value : [value];
  return vals
    .map((v) => field.options.find((o) => o.value === v)?.label ?? String(v))
    .join(", ");
}
