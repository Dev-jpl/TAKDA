"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'takda_sidebar_collapsed';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SidebarState {
  isCollapsed:     boolean;
  isHoverExpanded: boolean;
  /** True when the sidebar should visually render as collapsed (no labels, icon-only) */
  visuallyCollapsed: boolean;
  toggle:           () => void;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const SidebarContext = createContext<SidebarState>({
  isCollapsed:      false,
  isHoverExpanded:  false,
  visuallyCollapsed: false,
  toggle:           () => {},
  handleMouseEnter: () => {},
  handleMouseLeave: () => {},
});

// ── Provider ──────────────────────────────────────────────────────────────────

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed,     setIsCollapsed]     = useState(false);
  const [isHoverExpanded, setIsHoverExpanded] = useState(false);

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'true') setIsCollapsed(true);
    } catch { /* private browsing / no access */ }
  }, []);

  const toggle = useCallback(() => {
    setIsCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
      if (!next) setIsHoverExpanded(false); // expanding: clear any hover state
      return next;
    });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHoverExpanded(prev => (isCollapsed ? true : prev));
  }, [isCollapsed]);

  const handleMouseLeave = useCallback(() => {
    setIsHoverExpanded(false);
  }, []);

  return (
    <SidebarContext.Provider value={{
      isCollapsed,
      isHoverExpanded,
      visuallyCollapsed: isCollapsed && !isHoverExpanded,
      toggle,
      handleMouseEnter,
      handleMouseLeave,
    }}>
      {children}
    </SidebarContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSidebar() {
  return useContext(SidebarContext);
}
