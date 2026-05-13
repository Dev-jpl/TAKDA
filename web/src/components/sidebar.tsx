"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  glyph: string;
};

const NAV: NavItem[] = [
  { href: "/home", label: "Home", glyph: "✦" },
  { href: "/module-creator", label: "Module Creator", glyph: "✎" },
];

export function Sidebar({ email: _email }: { email: string }) {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r border-rule flex flex-col bg-paper">
      <div className="px-6 py-6 border-b border-rule">
        <Link href="/home" className="handwritten text-2xl block">
          TAKDA
        </Link>
        <p className="text-[10px] uppercase tracking-[0.18em] text-ink-faint mt-1">
          takdang aralin
        </p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-ink text-paper"
                  : "text-ink-muted hover:text-ink hover:bg-rule/40"
              }`}
            >
              <span
                className={`text-base leading-none ${
                  active ? "text-paper" : "text-ink-faint group-hover:text-ink"
                }`}
              >
                {item.glyph}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-4 border-t border-rule text-[10px] text-ink-faint">
        v2 · m0
      </div>
    </aside>
  );
}
