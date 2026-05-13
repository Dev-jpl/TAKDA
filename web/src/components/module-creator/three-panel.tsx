import type { ReactNode } from "react";

export function ThreePanel({
  left,
  center,
  right,
}: {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
}) {
  return (
    <>
      <aside className="w-64 shrink-0 border-r border-rule bg-paper overflow-y-auto">
        {left}
      </aside>
      <div className="flex-1 min-w-0 overflow-auto">{center}</div>
      <aside className="w-72 shrink-0 border-l border-rule bg-paper overflow-y-auto">
        {right}
      </aside>
    </>
  );
}

export function PanelHeading({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 py-3 border-b border-rule text-[10px] tracking-[0.18em] uppercase text-ink-faint">
      {children}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 py-6 text-sm text-ink-muted">{children}</div>
  );
}
