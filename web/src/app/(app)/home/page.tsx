import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center min-h-[calc(100vh-65px)]">
      <h1 className="text-2xl font-medium text-ink">Your notebook is empty</h1>
      <p className="mt-3 max-w-md text-sm text-ink-muted">
        Start by designing a module — its schema, capture form, and views.
      </p>
      <Link
        href="/module-creator"
        className="mt-10 inline-flex items-center gap-2 rounded-md border border-ink bg-ink text-paper px-5 py-2 text-sm hover:opacity-90 transition-opacity"
      >
        <span>✎</span> Open module creator
      </Link>
    </div>
  );
}
