"use client";

import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rule text-ink-muted hover:text-ink hover:border-ink transition-colors"
    >
      <span className="text-base leading-none">
        {theme === "dark" ? "☾" : "✎"}
      </span>
    </button>
  );
}
