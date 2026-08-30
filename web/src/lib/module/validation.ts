import type { Field, VisibilityRule } from "./types";

/** Validate a value against a field's rules. Returns an error string, or null
 *  when the value is acceptable. Empty values are reported as "Required" only
 *  when the field is marked required — otherwise empty passes. */
export function validateValue(field: Field, value: unknown): string | null {
  const isEmpty =
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);

  if (isEmpty) {
    return field.required ? `${field.label} is required.` : null;
  }

  if (field.type === "text" || field.type === "long_text") {
    const s = String(value);
    if (typeof field.minLength === "number" && s.length < field.minLength) {
      return `${field.label} must be at least ${field.minLength} characters.`;
    }
    if (typeof field.maxLength === "number" && s.length > field.maxLength) {
      return `${field.label} must be at most ${field.maxLength} characters.`;
    }
    if (field.pattern) {
      try {
        const re = new RegExp(field.pattern);
        if (!re.test(s)) return `${field.label} does not match the expected format.`;
      } catch {
        // Bad regex in config — fail soft so author can fix.
        return null;
      }
    }
  }

  if (field.type === "number") {
    const n = typeof value === "number" ? value : Number(value);
    if (Number.isNaN(n)) return `${field.label} must be a number.`;
    if (typeof field.min === "number" && n < field.min) {
      return `${field.label} must be ≥ ${field.min}.`;
    }
    if (typeof field.max === "number" && n > field.max) {
      return `${field.label} must be ≤ ${field.max}.`;
    }
  }

  return null;
}

/** Resolve a visibility rule against the current value. Returns true when the
 *  element should render. An undefined rule always passes (show by default). */
export function evaluateVisibility(
  rule: VisibilityRule | undefined,
  value: unknown,
): boolean {
  if (!rule) return true;
  const isEmpty =
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);

  switch (rule.op) {
    case "truthy":
      return !isEmpty && value !== false;
    case "falsy":
      return isEmpty || value === false;
    case "equals":
      return String(value) === String(rule.value ?? "");
    case "not_equals":
      return String(value) !== String(rule.value ?? "");
    case "gt": {
      const n = typeof value === "number" ? value : Number(value);
      const r = typeof rule.value === "number" ? rule.value : Number(rule.value);
      return !Number.isNaN(n) && !Number.isNaN(r) && n > r;
    }
    case "lt": {
      const n = typeof value === "number" ? value : Number(value);
      const r = typeof rule.value === "number" ? rule.value : Number(rule.value);
      return !Number.isNaN(n) && !Number.isNaN(r) && n < r;
    }
  }
}

/** Resolve a field's default value into something usable at prefill time.
 *  Recognises the "__today__" sentinel for date/datetime fields. */
export function resolveDefault(field: Field): unknown {
  const d = field.defaultValue;
  if (d === undefined) return undefined;
  if (d === "__today__" && (field.type === "date" || field.type === "datetime")) {
    const now = new Date();
    if (field.type === "date") {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      return `${y}-${m}-${dd}`;
    }
    return now.toISOString();
  }
  return d;
}
