import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar email={user.email ?? ""} />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-end gap-3 px-6 py-4 border-b border-rule bg-paper">
          <span className="text-xs text-ink-muted">{user.email}</span>
          <ThemeToggle />
          <SignOutButton />
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
