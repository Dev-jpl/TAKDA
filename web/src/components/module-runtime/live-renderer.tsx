"use client";

import type {
  Container,
  Element,
  Field,
  Id,
  LayoutNode,
  Module,
} from "@/lib/module/types";

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
}: {
  container: Container;
  module: Module;
  formState: FormState;
  setFormState: (next: FormState) => void;
  onAction: (kind: string) => void;
}) {
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
        />
      ))}
    </div>
  );
}

function LiveNode({
  node,
  module,
  formState,
  setFormState,
  onAction,
}: {
  node: LayoutNode;
  module: Module;
  formState: FormState;
  setFormState: (next: FormState) => void;
  onAction: (kind: string) => void;
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
}: {
  element: Element;
  module: Module;
  formState: FormState;
  setFormState: (next: FormState) => void;
  onAction: (kind: string) => void;
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
      const btn = (
        <button
          type="button"
          onClick={() => onAction((cfg.action as string) ?? "save_entry")}
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
