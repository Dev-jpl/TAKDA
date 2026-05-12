import { AuthForm } from "@/components/auth-form";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";

export default function SignupPage() {
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
          <h1 className="handwritten text-4xl mb-1">Start a notebook</h1>
          <p className="text-sm text-ink-muted mb-8">
            Your daily aralin starts here.
          </p>
          <AuthForm mode="signup" />
          <p className="mt-6 text-sm text-ink-muted">
            Already have one?{" "}
            <Link href="/login" className="text-ink underline underline-offset-4">
              Open it
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
