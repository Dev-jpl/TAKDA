"use client";

import { useEffect, useState } from "react";
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

export type FormState = Record<string, unknown>; // keyed by `${collectionId}::${fieldId}`

export function bindingKey(collectionId: Id, fieldId: Id): string {
  return `${collectionId}::${fieldId}`;
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
      <div style={{ flexGrow: 1 }}>
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
  const setValue = (v: unknown) => {
    if (!fieldKey) return;
    setFormState({ ...formState, [fieldKey]: v });
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
    case "spacer":
      return <div style={{ height: (cfg.size as number) ?? 16 }} />;
    case "button": {
      const fullWidth = !!cfg.fullWidth;
      const align = (cfg.align as string) ?? "left";
      const action = (cfg.action as string) ?? "save_entry";
      const btn = (
        <button
          type="button"
          onClick={() =>
            onAction(action, {
              targetScreenId: cfg.targetScreenId,
            })
          }
          className={`text-sm px-4 py-2 rounded transition-opacity hover:opacity-90 ${
            fullWidth ? "w-full" : ""
          } ${
            cfg.variant === "primary"
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
        <FieldWrap label={label}>
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
        <FieldWrap label={label}>
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
          <FieldWrap label={label} inline>
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setValue(e.target.checked)}
            />
          </FieldWrap>
        );
      }
      return (
        <FieldWrap label={label} inline>
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
        <FieldWrap label={label}>
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
          <FieldWrap label={label}>
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
          <FieldWrap label={label}>
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
        <FieldWrap label={label}>
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
        <FieldWrap label={label}>
          <div className="w-full border-b border-rule py-1.5 text-sm text-ink-faint italic">
            → relation picker (coming soon)
          </div>
        </FieldWrap>
      );
    case "file_input":
      return (
        <FieldWrap label={label}>
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
      {label && <div className="text-xs text-ink-muted">{label}</div>}
      {children}
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

  return (
    <div className="border border-rule rounded-md overflow-hidden bg-paper">
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

  return (
    <div className="rounded-md border border-rule bg-paper px-4 py-3 inline-flex flex-col">
      <span className="text-[10px] uppercase tracking-[0.18em] text-ink-faint">
        {label}
      </span>
      <span className="text-2xl font-medium text-ink mt-1">{display}</span>
    </div>
  );
}

function formatSelect(field: Field, value: unknown): string {
  if (field.type !== "select" && field.type !== "multi_select") return String(value);
  const vals = Array.isArray(value) ? value : [value];
  return vals
    .map((v) => field.options.find((o) => o.value === v)?.label ?? String(v))
    .join(", ");
}
