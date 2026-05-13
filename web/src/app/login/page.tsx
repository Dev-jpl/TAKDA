import { AuthForm } from "@/components/auth-form";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-8 py-6">
        <Link href="/" className="handwritten text-2xl">
          TAKDA
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-medium mb-1">Welcome back</h1>
          <p className="text-sm text-ink-muted mb-8">Open your notebook.</p>
          <AuthForm mode="login" />
          <p className="mt-6 text-sm text-ink-muted">
            New here?{" "}
            <Link href="/signup" className="text-ink underline underline-offset-4">
              Start a notebook
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
