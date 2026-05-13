"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/sign-out-button";

const FULLSCREEN_PATTERNS = [/^\/module-creator\/[^/]+/];

export function AppShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const fullscreen = FULLSCREEN_PATTERNS.some((p) => p.test(pathname));

  if (fullscreen) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar email={email} />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-end gap-3 px-6 py-4 border-b border-rule bg-paper">
          <span className="text-xs text-ink-muted">{email}</span>
          <ThemeToggle />
          <SignOutButton />
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
