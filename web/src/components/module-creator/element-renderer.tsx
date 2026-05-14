"use client";

import type {
  Container,
  Element,
  Field,
  LayoutNode,
  Module,
} from "@/lib/module/types";

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
    case "spacer":
      return <div style={{ height: (cfg.size as number) ?? 16 }} />;
    case "button": {
      const fullWidth = !!cfg.fullWidth;
      const align = (cfg.align as string) ?? "left";
      const btn = (
        <button
          disabled
          className={`text-sm px-4 py-1.5 rounded cursor-not-allowed ${
            fullWidth ? "w-full" : ""
          } ${
            cfg.variant === "primary"
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
      return (
        <div className="rounded-md border border-rule bg-paper px-4 py-3 w-full">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs text-ink-muted">{labelText}</span>
            {showText && (
              <span className="text-[11px] text-ink-faint font-mono">
                {sampleValue} / {goal}
                {suffix ? ` ${suffix}` : ""}
              </span>
            )}
          </div>
          <div className="mt-2 h-2 rounded-full bg-rule overflow-hidden">
            <div
              className="h-full bg-ink rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
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
      return (
        <div className="rounded-md border border-rule bg-paper px-4 py-3 inline-flex flex-col">
          <span className="text-[10px] uppercase tracking-[0.18em] text-ink-faint">
            {labelText}
          </span>
          <span className="text-2xl font-medium text-ink mt-1">
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
      return (
        <div className="border border-rule rounded-md overflow-hidden bg-paper">
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
