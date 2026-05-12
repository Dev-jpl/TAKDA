"""
Pure helper functions extracted from nodes.py so they can be tested
without importing langchain, supabase, or any network dependency.
"""
from __future__ import annotations
import re
from datetime import datetime, timezone, timedelta


# ── Window filter ─────────────────────────────────────────────────────────────

def window_filter(entries: list, window: str | None) -> list:
    if not window or window == "all":
        return entries
    now = datetime.now(timezone.utc)

    def ts(e):
        try:
            return datetime.fromisoformat(e.get("created_at", "").replace("Z", "+00:00"))
        except Exception:
            return now

    if window == "today":
        today = now.date()
        return [e for e in entries if ts(e).date() == today]
    if window in ("week", "last_7d"):
        cutoff = now - timedelta(days=7)
        return [e for e in entries if ts(e) >= cutoff]
    if window == "month":
        return [e for e in entries if ts(e).month == now.month and ts(e).year == now.year]
    if window == "last_30d":
        cutoff = now - timedelta(days=30)
        return [e for e in entries if ts(e) >= cutoff]
    return entries


def previous_window_entries(entries: list, window: str | None) -> list:
    now = datetime.now(timezone.utc)

    if window == "today":
        yesterday = (now - timedelta(days=1)).date()
        def ts(e):
            try: return datetime.fromisoformat(e.get("created_at","").replace("Z","+00:00"))
            except: return now
        return [e for e in entries if ts(e).date() == yesterday]
    if window in ("week", "last_7d"):
        end   = now - timedelta(days=7)
        start = now - timedelta(days=14)
        def ts(e):
            try: return datetime.fromisoformat(e.get("created_at","").replace("Z","+00:00"))
            except: return now
        return [e for e in entries if start <= ts(e) < end]
    if window == "month":
        prev = now.month - 1 or 12
        year = now.year if now.month > 1 else now.year - 1
        def ts(e):
            try: return datetime.fromisoformat(e.get("created_at","").replace("Z","+00:00"))
            except: return now
        return [e for e in entries if ts(e).month == prev and ts(e).year == year]
    if window == "last_30d":
        end   = now - timedelta(days=30)
        start = now - timedelta(days=60)
        def ts(e):
            try: return datetime.fromisoformat(e.get("created_at","").replace("Z","+00:00"))
            except: return now
        return [e for e in entries if start <= ts(e) < end]
    return []


# ── Computed property evaluator ───────────────────────────────────────────────

def eval_computed_prop(prop: dict, entries: list):
    ptype  = prop.get("type", "")
    field  = prop.get("source_field", "")
    windowed = window_filter(entries, prop.get("window"))

    try:
        if ptype == "count":
            return len(windowed)
        if not field:
            return None

        values = []
        for e in windowed:
            raw = e.get("data", {}).get(field)
            try:
                n = float(raw)
                if n == n:
                    values.append(n)
            except (TypeError, ValueError):
                pass

        if ptype == "sum":   return sum(values)
        if ptype == "avg":   return sum(values) / len(values) if values else None
        if ptype == "min":   return min(values) if values else None
        if ptype == "max":   return max(values) if values else None
    except Exception:
        pass
    return None


def fmt_cv(value, prop: dict):
    if value is None:
        return None
    unit      = prop.get("unit", "")
    fmt       = prop.get("format", "")
    precision = prop.get("precision", 0)
    suffix    = f" {unit}" if unit else ""
    try:
        n = float(value)
        if fmt == "percent":  return f"{round(n)}%"
        if fmt == "decimal":  return f"{n:.{precision}f}{suffix}"
        rounded = int(n) if n == int(n) else round(n, 1)
        return f"{rounded}{suffix}"
    except (TypeError, ValueError):
        return str(value)


# ── Insight condition evaluator ───────────────────────────────────────────────

_OP_MAP = {
    "exceeds":      ">",  "above": ">",   "over": ">",   "greater than": ">", ">": ">",
    "below":        "<",  "under": "<",   "less than":   "<",                  "<": "<",
    "at least":     ">=", ">=":    ">=",
    "at most":      "<=", "<=":    "<=",
    "equals":       "==", "is":    "==",  "=":  "==",   "==": "==",
}


def check_insight_condition(condition: str, computed_values: dict) -> bool:
    if not condition or not computed_values:
        return True
    cond = condition.strip().lower()
    for prefix in ("when ", "if "):
        if cond.startswith(prefix):
            cond = cond[len(prefix):]

    for op_word, op_sym in sorted(_OP_MAP.items(), key=lambda x: -len(x[0])):
        pattern = rf"^(.+?)\s+{re.escape(op_word)}\s+([\d.]+)$"
        m = re.match(pattern, cond)
        if not m:
            continue
        key_phrase = m.group(1).strip()
        try:
            threshold = float(m.group(2))
        except ValueError:
            continue

        actual = None
        for cv_label, cv_display in computed_values.items():
            if key_phrase in cv_label.lower() or cv_label.lower() in key_phrase:
                try:
                    actual = float(str(cv_display).split()[0].replace(",", ""))
                except (ValueError, IndexError):
                    pass
                if actual is not None:
                    break

        if actual is None:
            return True

        try:
            return eval(f"{actual} {op_sym} {threshold}")  # safe: only numbers + operator
        except Exception:
            return True

    return True


# ── Vault routing ─────────────────────────────────────────────────────────────

_FOOD_KEYWORDS    = {"calorie", "calories", "kcal", "food", "meal", "ate",
                     "eat", "lunch", "dinner", "breakfast", "snack", "protein", "carb", "fat"}
_EXPENSE_KEYWORDS = {"spent", "expense", "bought", "paid", "cost", "purchase",
                     "money", "piso", "peso", "php", "₱"}


def detect_module_slug(content: str, explicit_module: str) -> str:
    if explicit_module and explicit_module != "track":
        return explicit_module
    lower = content.lower()
    if any(k in lower for k in _FOOD_KEYWORDS):
        return "calorie_counter"
    if any(k in lower for k in _EXPENSE_KEYWORDS):
        return "expense_tracker"
    return "track"
