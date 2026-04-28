"use client";

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";
import { AlyFAB } from "@/components/aly/AlyFAB";
import { AlyAssistant } from "@/components/aly/AlyAssistant";
import { LandingNavbar } from "@/components/layout/LandingNavbar";
import { supabase } from '@/services/supabase';
import { UserProfileProvider, useUserProfile } from '@/contexts/UserProfileContext';
import { Sparkle } from '@phosphor-icons/react';
import { ASSISTANT_NAME } from '@/constants/brand';
import { motion, AnimatePresence } from 'framer-motion';

// ── First-login: assistant naming modal ──────────────────────────────────────

function AssistantNameModal() {
  const { profile, loading, updateProfile } = useUserProfile();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const isVisible = !loading && profile?.assistant_name === null;

  const handleSave = async () => {
    const trimmed = name.trim() || ASSISTANT_NAME;
    setSaving(true);
    await updateProfile({ assistant_name: trimmed });
    setSaving(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-100"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed inset-0 z-101 flex items-center justify-center px-4"
          >
            <div className="w-full max-w-sm bg-background-secondary border border-border-primary rounded-2xl p-8 shadow-2xl flex flex-col gap-6">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-modules-aly/10 border border-modules-aly/20 flex items-center justify-center">
                  <Sparkle size={28} className="text-modules-aly" weight="fill" />
                </div>
                <h2 className="text-lg font-bold text-text-primary">Name your assistant</h2>
                <p className="text-sm text-text-tertiary leading-relaxed">
                  Give your personal AI a name. You can always change it later in your profile settings.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                  placeholder={ASSISTANT_NAME}
                  maxLength={32}
                  className="w-full bg-background-tertiary border border-border-primary rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary/50 outline-none focus:border-modules-aly/50 transition-all text-center font-semibold"
                  autoFocus
                />
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-modules-aly text-white font-semibold py-3 rounded-xl text-sm hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    `Let's go${name.trim() ? ` — call me ${name.trim()}` : ''}`
                  )}
                </button>
                <button
                  onClick={() => updateProfile({ assistant_name: ASSISTANT_NAME })}
                  className="text-xs text-text-tertiary hover:text-text-secondary text-center transition-colors"
                >
                  Skip — use &quot;{ASSISTANT_NAME}&quot;
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Inner layout (needs context) ─────────────────────────────────────────────

function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isAlyOpen, setIsAlyOpen] = useState(false);
  const [userId,    setUserId]    = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const isPublicPage = pathname === "/" || pathname?.startsWith("/auth");

  if (isPublicPage) {
    return (
      <div className="relative min-h-screen bg-background-primary flex flex-col">
        <LandingNavbar />
        {children}
      </div>
    );
  }

  return (
    <>
      <AssistantNameModal />
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden bg-background-primary">
          <TopNav userId={userId} />
          <div className="flex-1 overflow-y-auto relative">
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>

            {pathname !== '/chat' && (
              <>
                <AlyFAB isOpen={isAlyOpen} onClick={() => setIsAlyOpen(true)} />
                <AlyAssistant isOpen={isAlyOpen} onClose={() => setIsAlyOpen(false)} />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Export ───────────────────────────────────────────────────────────────────

export function AppWrapper({ children }: { children: React.ReactNode }) {
  return (
    <UserProfileProvider>
      <AppLayout>{children}</AppLayout>
    </UserProfileProvider>
  );
}
