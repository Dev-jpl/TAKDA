"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Envelope,
  Lock,
  ArrowRight,
  User,
  Eye,
  EyeSlash,
  Sparkle,
  GoogleLogo,
} from "@phosphor-icons/react";
import { supabase } from "@/services/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Mode = "login" | "register";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Background particles — generated once
  const particles = useMemo(() =>
    [...Array(18)].map((_, i) => ({
      x: `${(i * 37 + 11) % 100}%`,
      y: `${(i * 53 + 7) % 100}%`,
      duration: 18 + (i % 7) * 4,
      delay: i * 1.1,
      size: 1 + (i % 3),
    })), []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (mode === "register") {
      if (!name.trim()) { setError("Please enter your name."); return; }
      if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
      if (password !== confirmPassword) { setError("Passwords don't match."); return; }
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name.trim() } },
        });
        if (error) throw error;
        setSuccess("Account created! Check your email to confirm, then sign in.");
        setMode("login");
        setPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: Mode) => {
    setError(null);
    setSuccess(null);
    setMode(next);
  };

  return (
    <main className="min-h-screen bg-background-primary flex items-center justify-center relative overflow-hidden px-4">

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.12, 0.2, 0.12] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[10%] w-[50%] h-[50%] bg-modules-aly/30 rounded-full blur-[140px]"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.08, 0.15, 0.08] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          className="absolute bottom-[-5%] right-[10%] w-[40%] h-[40%] bg-modules-track/20 rounded-full blur-[120px]"
        />
      </div>

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(var(--border-primary) 1px, transparent 1px), linear-gradient(90deg, var(--border-primary) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((p, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-modules-aly/40"
            style={{ left: p.x, top: p.y, width: p.size, height: p.size }}
            animate={{ y: [0, -30, 0], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Brand */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-modules-aly/10 border border-modules-aly/20 flex items-center justify-center overflow-hidden">
            <img 
              src="/favicon.ico" 
              alt="TAKDA Logo" 
              className="w-7 h-7 object-contain"
            />
          </div>
          <span className="text-sm font-bold tracking-[0.4em] text-text-primary">TAKDA</span>
        </div>

        <div className="bg-background-secondary border border-border-primary rounded-2xl p-8 shadow-2xl shadow-black/40">
          {/* Mode toggle */}
          <div className="flex rounded-xl bg-background-tertiary p-1 mb-8 border border-border-primary">
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all capitalize ${
                  mode === m
                    ? "bg-background-secondary text-text-primary shadow-sm border border-border-primary"
                    : "text-text-tertiary hover:text-text-secondary"
                }`}
              >
                {m === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {/* Success message */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4 p-3 rounded-xl bg-modules-annotate/10 border border-modules-annotate/20 text-xs text-modules-annotate text-center"
              >
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="popLayout">
              {/* Name field — register only */}
              {mode === "register" && (
                <motion.div
                  key="name"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <Field
                    icon={<User size={16} />}
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={setName}
                    autoComplete="name"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <Field
              icon={<Envelope size={16} />}
              type="email"
              placeholder="Email address"
              value={email}
              onChange={setEmail}
              autoComplete="email"
            />

            <PasswordField
              placeholder="Password"
              value={password}
              onChange={setPassword}
              show={showPassword}
              onToggleShow={() => setShowPassword(s => !s)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />

            <AnimatePresence mode="popLayout">
              {mode === "register" && (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <PasswordField
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    show={showPassword}
                    onToggleShow={() => setShowPassword(s => !s)}
                    autoComplete="new-password"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {mode === "login" && (
              <div className="flex justify-end -mt-1">
                <button
                  type="button"
                  className="text-[11px] text-text-tertiary hover:text-modules-aly transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-red-400 text-center bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-modules-aly text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 text-sm mt-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === "login" ? "Sign in" : "Create account"}</span>
                  <ArrowRight size={15} weight="bold" />
                </>
              )}
            </button>
          </form>

          {/* Divider + Google */}
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border-primary" />
              <span className="text-[11px] text-text-tertiary">or</span>
              <div className="flex-1 h-px bg-border-primary" />
            </div>

            <button
              type="button"
              className="w-full flex items-center justify-center gap-2.5 bg-background-tertiary border border-border-primary rounded-xl py-2.5 hover:bg-background-secondary/80 transition-colors text-sm text-text-secondary font-medium"
            >
              <GoogleLogo size={17} />
              <span>Continue with Google</span>
            </button>
          </div>

          {/* Switch mode footer */}
          <p className="mt-6 text-center text-xs text-text-tertiary">
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <button onClick={() => switchMode("register")} className="text-modules-aly font-semibold hover:opacity-80 transition-opacity">
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button onClick={() => switchMode("login")} className="text-modules-aly font-semibold hover:opacity-80 transition-opacity">
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>

        <p className="mt-6 text-center text-[11px] text-text-tertiary/50">
          By signing in, you agree to our{" "}
          <Link href="#" className="hover:text-text-tertiary transition-colors">Terms</Link>
          {" "}and{" "}
          <Link href="#" className="hover:text-text-tertiary transition-colors">Privacy Policy</Link>
        </p>
      </motion.div>
    </main>
  );
}

// ─── Field components ─────────────────────────────────────────────────────────

function Field({
  icon, type, placeholder, value, onChange, autoComplete,
}: {
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  return (
    <div className="relative group">
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-modules-aly transition-colors">
        {icon}
      </div>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        className="w-full bg-background-tertiary border border-border-primary rounded-xl py-3 pl-10 pr-4 text-sm text-text-primary outline-none focus:border-modules-aly/50 transition-all placeholder:text-text-tertiary/50"
      />
    </div>
  );
}

function PasswordField({
  placeholder, value, onChange, show, onToggleShow, autoComplete,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  autoComplete?: string;
}) {
  return (
    <div className="relative group">
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-modules-aly transition-colors">
        <Lock size={16} />
      </div>
      <input
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        className="w-full bg-background-tertiary border border-border-primary rounded-xl py-3 pl-10 pr-10 text-sm text-text-primary outline-none focus:border-modules-aly/50 transition-all placeholder:text-text-tertiary/50"
      />
      <button
        type="button"
        onClick={onToggleShow}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
      >
        {show ? <EyeSlash size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
