"use client";

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";
import { AlyFAB } from "@/components/aly/AlyFAB";
import { AlyAssistant } from "@/components/aly/AlyAssistant";
import { LandingNavbar } from "@/components/layout/LandingNavbar";
import { supabase } from '@/services/supabase';

export function AppWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isAlyOpen, setIsAlyOpen] = useState(false);
  const [userId,    setUserId]    = useState<string | null>(null);

  const isPublicPage = pathname === "/" || pathname?.startsWith("/auth");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  if (isPublicPage) {
    return (
      <div className="relative min-h-screen bg-background-primary flex flex-col">
        <LandingNavbar />
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden bg-background-primary">
        <TopNav userId={userId} />
        <div className="flex-1 overflow-y-auto relative">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>

          {/* Assistant Entry Point — hidden on the dedicated chat page */}
          {pathname !== '/chat' && (
            <>
              <AlyFAB isOpen={isAlyOpen} onClick={() => setIsAlyOpen(true)} />
              <AlyAssistant isOpen={isAlyOpen} onClose={() => setIsAlyOpen(false)} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
