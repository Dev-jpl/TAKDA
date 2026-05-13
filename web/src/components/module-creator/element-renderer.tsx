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
      <ElementBody element={element} boundField={boundField} label={label} />
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
  return <ElementBody element={element} boundField={boundField} label={label} />;
}

export function ElementBody({
  element,
  boundField,
  label,
}: {
  element: Element;
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
    case "button":
      return (
        <button
          disabled
          className={`text-sm px-4 py-1.5 rounded cursor-not-allowed ${
            cfg.variant === "primary"
              ? "bg-ink text-paper"
              : "border border-rule text-ink"
          }`}
        >
          {(cfg.text as string) || "Button"}
        </button>
      );
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
    case "boolean_toggle":
      return (
        <FieldWrap label={label} inline>
          <input type="checkbox" disabled className="cursor-not-allowed" />
        </FieldWrap>
      );
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
