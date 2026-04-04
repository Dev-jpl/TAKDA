"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Envelope,
  Lock,
  ArrowRight,
  Target,
  PencilSimple,
  BookOpen,
  PaperPlaneTilt,
  Cpu,
  GoogleLogo,
  FacebookLogo,
} from "@phosphor-icons/react";
import { supabase } from "@/services/supabase";
import { useRouter } from "next/navigation";
import { LandingNavbar } from "@/components/layout/LandingNavbar";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  // Generate particle data once to avoid hydration mismatch
  const particles = useMemo(() => {
    return [...Array(15)].map((_, i) => ({
      initial: {
        x: `${Math.random() * 100}%`,
        y: `${Math.random() * 100}%`,
        opacity: 0.1 + Math.random() * 0.2,
        scale: 0.5 + Math.random() * 1.5,
      },
      animate: {
        x: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
        y: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
        opacity: [0.1, 0.3, 0.1],
      },
      transition: {
        duration: 20 + Math.random() * 40,
        repeat: Infinity,
        ease: "linear" as any,
      },
    }));
  }, []);

  // Generate SVG paths once to avoid hydration mismatch
  const svgPaths = useMemo(() => {
    return [...Array(4)].map((_, i) => ({
      points: (() => {
        const steps = 8;
        let currentX = Math.floor(Math.random() * 20) * 40;
        let currentY = Math.floor(Math.random() * 15) * 40;
        let points = `${currentX},${currentY}`;

        for (let s = 1; s < steps; s++) {
          const isXMove = s % 2 === 0;
          if (isXMove) {
            currentX += Math.random() > 0.5 ? 120 : -120;
          } else {
            currentY += Math.random() > 0.5 ? 120 : -120;
          }
          points += ` ${currentX},${currentY}`;
        }
        return points;
      })(),
      transition: {
        duration: 6 + Math.random() * 6,
        repeat: Infinity,
        delay: Math.random() * 10,
        ease: "linear" as any,
      },
    }));
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Auth failure: Logic denied.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background-primary relative overflow-hidden pt-20">
      <LandingNavbar />
      {/* Neural Voids (Random Holes in the Lattice) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[15%] left-[10%] w-[400px] h-[400px] bg-black rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-[10%] right-[15%] w-[500px] h-[500px] bg-black rounded-full blur-[150px] opacity-70" />
        <div className="absolute top-[40%] right-[5%] w-[300px] h-[300px] bg-black rounded-full blur-[100px] opacity-50" />
        <div className="absolute bottom-[30%] left-[20%] w-[350px] h-[350px] bg-black rounded-full blur-[110px] opacity-60" />
      </div>

      {/* flying particles (Neural Nodes) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {particles.map((particle, i) => (
          <motion.div
            key={i}
            initial={particle.initial}
            animate={particle.animate}
            transition={particle.transition}
            className="absolute w-1 h-1 bg-[#888888] rounded-full"
            style={{
              filter: "blur(2.09923px)",
              boxShadow: "0 0 10px rgba(136, 136, 136, 0.5)",
              opacity: 0.17919426121767867,
            }}
            suppressHydrationWarning
          />
        ))}
      </div>

      {/* Ultra-Thin Snake Pulse Racers (SVG Path Tracers) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-30">
        <svg className="w-full h-full">
          {svgPaths.map((pathData, i) => (
            <motion.polyline
              key={i}
              points={pathData.points}
              fill="none"
              stroke="#888888"
              strokeWidth="0.5"
              strokeDasharray="100 400"
              initial={{ strokeDashoffset: 500, opacity: 0 }}
              animate={{ strokeDashoffset: -500, opacity: [0, 1, 1, 0] }}
              transition={pathData.transition}
              suppressHydrationWarning
            />
          ))}
        </svg>
      </div>

      {/* Noise/Grain Overlay (Intensified) */}
      <div
        className="absolute inset-0 z-10 pointer-events-none opacity-[0.06] mix-blend-overlay shadow-inner"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* 3D Depth Perspective Container */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ perspective: "1200px" }}
      >
        <motion.div
          initial={{ rotateX: 0, rotateY: 0 }}
          animate={{ rotateX: 5, rotateY: -2 }}
          className="absolute inset-0 origin-center scale-[1.1]"
        >
          {/* Base Grid & Intersection Dots */}
          <div className="absolute inset-0 opacity-[0.08]">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(0,0,0,0.5) 1px, transparent 1px, var(--border-primary) 1px, transparent 2px),
                  linear-gradient(to bottom, rgba(0,0,0,0.5) 1px, transparent 1px, var(--border-primary) 1px, transparent 2px),
                  radial-gradient(circle at 1px 1px, var(--border-primary) 1.5px, transparent 0)
                `,
                backgroundSize: "40px 40px, 40px 40px, 40px 40px",
              }}
            />
          </div>

          {/* Radiant Masked Grid & Glowing Nodes (Static Grid, Moving Shine) */}
          <motion.div
            animate={{
              "--registry-shimmer-x": ["10%", "90%", "10%"],
              "--registry-shimmer-y": ["10%", "90%", "10%"],
            }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0"
            style={
              {
                backgroundImage: `
                linear-gradient(to right, #888888 1px, transparent 1px), 
                linear-gradient(to bottom, #888888 1px, transparent 1px),
                radial-gradient(circle at 1px 1px, #888888 2px, transparent 0)
              `,
                backgroundSize: "40px 40px, 40px 40px, 40px 40px",
                maskImage:
                  "radial-gradient(600px circle at var(--registry-shimmer-x) var(--registry-shimmer-y), black 0%, transparent 100%)",
                WebkitMaskImage:
                  "radial-gradient(600px circle at var(--registry-shimmer-x) var(--registry-shimmer-y), black 0%, transparent 100%)",
                opacity: 0.08,
              } as React.CSSProperties
            }
          />

          {/* Glare-Reactive Shadow (Follows the glare with an offset for 3D depth) */}
          <motion.div
            animate={{
              "--registry-shimmer-x": ["10%", "90%", "10%"],
              "--registry-shimmer-y": ["10%", "90%", "10%"],
            }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0"
            style={
              {
                backgroundImage: `linear-gradient(to right, black 2px, transparent 2px), linear-gradient(to bottom, black 2px, transparent 2px)`,
                backgroundSize: "40px 40px",
                maskImage:
                  "radial-gradient(600px circle at calc(var(--registry-shimmer-x) + 4px) calc(var(--registry-shimmer-y) + 4px), black 0%, transparent 100%)",
                WebkitMaskImage:
                  "radial-gradient(600px circle at calc(var(--registry-shimmer-x) + 4px) calc(var(--registry-shimmer-y) + 4px), black 0%, transparent 100%)",
                opacity: 0.02,
              } as React.CSSProperties
            }
          />
        </motion.div>
      </div>

      {/*Main Content Container  */}
      <div className="w-full max-w-7xl mx-auto px-6 flex lg:flex-row items-center justify-center gap-12 z-10 pointer-events-auto transform-gpu">
        {/* 2. LEFT PANEL: ATMOSPHERIC BRANDING (col-8) */}
        <div className="hidden lg:flex flex-col items-center justify-center lg:w-[66.6%] h-full relative z-20 pointer-events-none p-12">
          <div className="flex flex-col items-center opacity-70 relative">
            {/* The Acronym (Medium & Focused) */}
            <div className="flex gap-4 mb-6 text-text-primary relative z-10 transition-all duration-700">
              {["T", "A", "K", "D", "A"].map((letter, idx) => (
                <span
                  key={idx}
                  className="text-6xl font-black tracking-tighter"
                >
                  {letter}
                </span>
              ))}
            </div>

            {/* Mission Descriptions (Centered Metadata) */}
            <div className="flex flex-col items-center space-y-1 mb-10 transition-all duration-700">
              <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.6em] opacity-60">
                Track • Anotate • Knowledge • Deliver • Automate
              </p>
              <div className="h-[0.5px] w-16 bg-border-primary opacity-20 mt-2" />
            </div>

            {/* Neural Nest (Refined Icons "Playing" outside TAKDA boundary - Wide Orbit) */}
            <div className="absolute inset-x-[-180px] inset-y-[-180px] pointer-events-none">
              <motion.div
                animate={{
                  x: [0, 6, -4, 3, 0],
                  y: [0, -5, 6, -3, 0],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                  duration: 18,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute top-[15%] left-[15%]"
              >
                <div className="p-2.5 rounded-full border-[0.5px] border-border-primary bg-background-secondary text-text-secondary">
                  <Target size={18} weight="light" />
                </div>
              </motion.div>

              <motion.div
                animate={{
                  x: [0, -6, 5, -4, 0],
                  y: [0, 4, -6, 5, 0],
                  opacity: [0.2, 0.4, 0.2],
                }}
                transition={{
                  duration: 22,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 2,
                }}
                className="absolute top-[40%] right-[10%]"
              >
                <div className="p-2.5 rounded-full border-[0.5px] border-border-primary bg-background-secondary text-text-secondary">
                  <PencilSimple size={16} weight="light" />
                </div>
              </motion.div>

              <motion.div
                animate={{
                  x: [0, 5, -7, 4, 0],
                  y: [0, 7, -5, 6, 0],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 5,
                }}
                className="absolute bottom-[25%] left-[10%]"
              >
                <div className="p-2.5 rounded-full border-[0.5px] border-border-primary bg-background-secondary text-text-secondary">
                  <BookOpen size={16} weight="light" />
                </div>
              </motion.div>

              <motion.div
                animate={{
                  x: [0, -5, 8, -4, 0],
                  y: [0, -7, 5, -8, 0],
                  opacity: [0.2, 0.5, 0.2],
                }}
                transition={{
                  duration: 25,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 8,
                }}
                className="absolute bottom-[15%] right-[15%]"
              >
                <div className="p-2.5 rounded-full border-[0.5px] border-border-primary bg-background-secondary text-text-secondary">
                  <PaperPlaneTilt size={16} weight="light" />
                </div>
              </motion.div>

              <motion.div
                animate={{
                  scale: [1, 1.02, 0.98, 1],
                  opacity: [0.1, 0.2, 0.1],
                }}
                transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[1.05]"
              >
                <div className="p-4 rounded-full border-[0.5px] border-border-primary bg-background-secondary/20 text-text-tertiary">
                  <Cpu size={22} weight="light" />
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* 3. RIGHT PANEL: INDUCTION REGISTRY (col-4) */}
        <div className="lg:w-[33.3%] w-full min-h-[calc(100vh-5rem)] flex items-center justify-center relative z-20">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full max-w-5xl mx-auto bg-background-secondary border-[0.5px] border-border-primary rounded-[14px] p-6 sm:p-8 lg:p-10 relative overflow-hidden"
          >
            <div className="flex flex-col items-center mb-12">
              {/* Induction Header (Design Guide Compliance - Centered) */}
              <h2 className="text-2xl font-medium text-text-primary tracking-tight mb-4 leading-none text-center">
                Login
              </h2>
              <div className="flex items-center gap-4">
                <div className="h-[0.5px] w-6 bg-border-primary" />
                <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.2em] text-center">
                  System Induction
                </p>
                <div className="h-[0.5px] w-6 bg-border-primary" />
              </div>
            </div>

            <form onSubmit={handleAuth} className="space-y-6">
              <div className="space-y-4">
                <div className="group relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-modules-aly transition-colors">
                    <Envelope size={18} weight="light" />
                  </div>
                  <input
                    type="email"
                    placeholder="Registry Identifier"
                    className="w-full bg-background-tertiary border-[0.5px] border-border-primary rounded-[10px] py-2.5 pl-12 pr-4 text-[13px] text-text-primary outline-none focus:border-modules-aly/60 transition-all placeholder:text-text-tertiary/60 font-normal"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="group relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-modules-aly transition-colors">
                      <Lock size={18} weight="light" />
                    </div>
                    <input
                      type="password"
                      placeholder="Validation Protocol"
                      className="w-full bg-background-tertiary border-[0.5px] border-border-primary rounded-[10px] py-2.5 pl-12 pr-4 text-[13px] text-text-primary outline-none focus:border-modules-aly/60 transition-all placeholder:text-text-tertiary/60 font-normal"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.1em] hover:text-text-secondary transition-colors"
                    >
                      Forgot Protocol?
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-modules-aly text-white font-medium py-3 rounded-[10px] flex items-center justify-center gap-3 hover:opacity-90 active:opacity-100 transition-all disabled:opacity-40 shadow-none"
                >
                  <span className="uppercase tracking-[0.1em] text-[13px]">
                    {loading ? "Verifying..." : "Login"}
                  </span>
                  <ArrowRight size={16} weight="light" />
                </button>

                <div className="flex flex-col items-center gap-4">
                  <button
                    type="button"
                    className="text-[12px] font-normal text-text-tertiary hover:text-text-primary transition-colors"
                  >
                    Identity not registered?{" "}
                    <span className="text-modules-aly font-medium">Signup</span>
                  </button>

                  <div className="flex items-center gap-4 w-full">
                    <div className="h-[0.5px] flex-1 bg-border-primary opacity-50" />
                    <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.2em]">
                      Matrix Registry
                    </span>
                    <div className="h-[0.5px] flex-1 bg-border-primary opacity-50" />
                  </div>

                  <div className="grid grid-cols-2 gap-3 w-full">
                    <button
                      type="button"
                      className="flex items-center justify-center gap-2 bg-background-tertiary border-[0.5px] border-border-primary rounded-[10px] py-2.5 hover:bg-background-secondary transition-all"
                    >
                      <GoogleLogo
                        size={18}
                        weight="light"
                        className="text-text-secondary"
                      />
                      <span className="text-[11px] font-medium text-text-secondary uppercase tracking-[0.1em]">
                        Gmail
                      </span>
                    </button>
                    <button
                      type="button"
                      className="flex items-center justify-center gap-2 bg-background-tertiary border-[0.5px] border-border-primary rounded-[10px] py-2.5 hover:bg-background-secondary transition-all"
                    >
                      <FacebookLogo
                        size={18}
                        weight="light"
                        className="text-text-secondary"
                      />
                      <span className="text-[11px] font-medium text-text-secondary uppercase tracking-[0.1em]">
                        Facebook
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-urgent text-[11px] uppercase font-medium tracking-[0.2em] text-center">
                  Registry Error: {error}
                </p>
              )}
            </form>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
