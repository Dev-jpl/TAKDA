"use client";

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from "@/components/layout/Sidebar";
import { AlyFAB } from "@/components/aly/AlyFAB";
import { AlyAssistant } from "@/components/aly/AlyAssistant";
import { LandingNavbar } from "@/components/layout/LandingNavbar";

export function AppWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isAlyOpen, setIsAlyOpen] = useState(false);
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
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-y-auto bg-background-primary relative">
        <div className="max-w-7xl mx-auto min-h-full">
          {children}
        </div>
        
        {/* Assistant Entry Point */}
        <AlyFAB isOpen={isAlyOpen} onClick={() => setIsAlyOpen(true)} />
        <AlyAssistant isOpen={isAlyOpen} onClose={() => setIsAlyOpen(false)} />
      </div>
    </div>
  );
}
