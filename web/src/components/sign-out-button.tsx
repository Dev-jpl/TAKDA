"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };
  return (
    <button
      onClick={signOut}
      className="text-xs text-ink-muted hover:text-ink underline-offset-4 hover:underline transition-colors"
    >
      Sign out
    </button>
  );
}
