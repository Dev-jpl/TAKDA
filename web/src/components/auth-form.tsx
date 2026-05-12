"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const supabase = createClient();
    const { error } =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (mode === "signup") {
      setInfo("Check your email to confirm your account.");
      return;
    }
    router.push("/home");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-xs text-ink-muted">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-2 text-ink placeholder:text-ink-faint"
          placeholder="you@example.com"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-ink-muted">Password</label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-2 text-ink placeholder:text-ink-faint"
          placeholder="••••••••"
        />
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {info && <p className="text-xs text-ink-muted">{info}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md border border-ink bg-ink text-paper py-2 text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {loading
          ? "…"
          : mode === "login"
            ? "Open notebook"
            : "Create notebook"}
      </button>
    </form>
  );
}
