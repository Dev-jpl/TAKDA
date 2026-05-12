import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-8 py-6">
        <span className="handwritten text-2xl">TAKDA</span>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <h1 className="handwritten text-6xl sm:text-7xl text-ink">
          <span className="sketch-underline">takdang aralin</span>
        </h1>
        <p className="mt-6 max-w-md text-ink-muted">
          Capture your day. Design your tools. A notebook you can program.
        </p>

        <div className="mt-10 flex gap-3">
          <Link
            href="/login"
            className="rounded-md border border-ink bg-ink text-paper px-6 py-2 text-sm hover:opacity-90 transition-opacity"
          >
            Open notebook
          </Link>
          <Link
            href="/signup"
            className="rounded-md border border-rule px-6 py-2 text-sm text-ink-muted hover:text-ink hover:border-ink transition-colors"
          >
            New here
          </Link>
        </div>
      </main>

      <footer className="px-8 py-6 text-xs text-ink-faint">
        v2 · in development
      </footer>
    </div>
  );
}
