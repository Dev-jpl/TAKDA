import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/sign-out-button";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-8 py-6 border-b border-rule">
        <span className="handwritten text-2xl">TAKDA</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-muted">{user?.email}</span>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <h1 className="handwritten text-5xl">Your notebook is empty</h1>
        <p className="mt-4 max-w-md text-ink-muted">
          Soon you&apos;ll be able to design your first module from scratch —
          schema, capture form, views.
        </p>
        <div className="mt-10 inline-flex items-center gap-2 rounded-md border border-dashed border-rule px-4 py-2 text-xs text-ink-faint">
          module creator · coming next
        </div>
      </main>
    </div>
  );
}
