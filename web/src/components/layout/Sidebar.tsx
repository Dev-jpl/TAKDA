"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  House,
  Sparkle,
  FolderOpen,
  Tray,
  CaretDown,
  Plugs,
  ClockCounterClockwise,
  TreeStructure,
  AppWindow,
  HandbagIcon,
  PencilLine,
  ChartPie,
  CaretDoubleLeft,
  CaretDoubleRight,
  CalendarBlank,
  IconWeight,
} from '@phosphor-icons/react';
import { ProfileMenuPopup } from '@/components/profile/ProfileMenuPopup';
import { supabase } from '@/services/supabase';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useSidebar } from '@/contexts/SidebarContext';

// ── Dimensions ────────────────────────────────────────────────────────────────

export const SIDEBAR_EXPANDED_W  = 240; // px — must match CSS class w-60
export const SIDEBAR_COLLAPSED_W =  56; // px — must match CSS class w-14

// ── Label animation helpers ───────────────────────────────────────────────────

function labelStyle(visuallyCollapsed: boolean): React.CSSProperties {
  return {
    opacity:          visuallyCollapsed ? 0 : 1,
    transform:        visuallyCollapsed ? 'translateX(-4px)' : 'translateX(0)',
    transitionProperty: 'opacity, transform',
    transitionDuration:  '150ms',
    transitionDelay:    visuallyCollapsed ? '0ms' : '50ms',
    whiteSpace:       'nowrap',
    overflow:         'hidden',
  };
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function Tooltip({ label, show }: { label: string; show: boolean }) {
  if (!show) return null;
  return (
    <div className="
      absolute left-full top-1/2 -translate-y-1/2 ml-3 z-200
      px-2.5 py-1.5 bg-background-secondary border border-border-primary
      rounded-lg text-xs font-medium text-text-primary whitespace-nowrap
      shadow-xl pointer-events-none
      opacity-0 group-hover:opacity-100
      transition-opacity duration-150 group-hover:delay-400
    ">
      {label}
      {/* left arrow */}
      <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-border-primary" />
    </div>
  );
}

// ── NavItem ───────────────────────────────────────────────────────────────────

interface NavItemProps {
  href:   string;
  icon:   React.ElementType;
  label:  string;
  active?: boolean;
}

function NavItem({ href, icon: Icon, label, active }: NavItemProps) {
  const { visuallyCollapsed } = useSidebar();

  return (
    <div className="relative group">
      <Link
        href={href}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-150 ${
          active
            ? 'bg-modules-aly/10 text-modules-aly border border-modules-aly/20'
            : 'text-text-secondary hover:bg-background-tertiary hover:text-text-primary'
        }`}
      >
        <Icon size={18} weight={(active ? 'fill' : 'regular') as IconWeight} className="shrink-0" />
        <span style={labelStyle(visuallyCollapsed)} className="text-sm font-medium flex-1">
          {label}
        </span>
        {active && !visuallyCollapsed && (
          <div className="ml-auto w-1 h-3.5 rounded-full bg-modules-aly shrink-0" />
        )}
      </Link>
      <Tooltip label={label} show={visuallyCollapsed} />
    </div>
  );
}

// ── NavGroup (expandable) ─────────────────────────────────────────────────────

interface SubItem {
  href?: string;
  label: string;
  comingSoon?: boolean;
  dot?: string;
}

interface NavGroupProps {
  icon:        React.ElementType;
  label:       string;
  items:       SubItem[];
  active?:     boolean;
  defaultOpen?: boolean;
}

function NavGroup({ icon: Icon, label, items, active, defaultOpen }: NavGroupProps) {
  const { visuallyCollapsed } = useSidebar();
  const [open, setOpen] = useState(defaultOpen ?? active ?? false);
  const pathname = usePathname();

  // In collapsed mode, render as a single icon pointing to the first linkable item
  if (visuallyCollapsed) {
    const firstHref = items.find(i => i.href && !i.comingSoon)?.href ?? '#';
    return (
      <div className="relative group">
        <Link
          href={firstHref}
          className={`flex items-center justify-center px-3 py-2.5 rounded-xl transition-colors duration-150 ${
            active
              ? 'bg-modules-aly/10 text-modules-aly border border-modules-aly/20'
              : 'text-text-secondary hover:bg-background-tertiary hover:text-text-primary'
          }`}
        >
          <Icon size={18} weight={(active ? 'fill' : 'regular') as IconWeight} className="shrink-0" />
        </Link>
        <Tooltip label={label} show />
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-150 ${
          active
            ? 'bg-modules-aly/10 text-modules-aly border border-modules-aly/20'
            : 'text-text-secondary hover:bg-background-tertiary hover:text-text-primary'
        }`}
      >
        <Icon size={18} weight={(active ? 'fill' : 'regular') as IconWeight} />
        <span className="text-sm font-medium flex-1 text-left">{label}</span>
        <CaretDown
          size={12}
          weight="bold"
          className={`transition-transform duration-200 shrink-0 ${open ? 'rotate-0' : '-rotate-90'}`}
        />
      </button>

      {open && (
        <div className="mt-1 ml-3.5 pl-4 border-l border-border-primary/60 flex flex-col gap-0.5">
          {items.map(item => {
            const isActive = item.href ? pathname === item.href : false;
            if (item.comingSoon) {
              return (
                <div key={item.label} className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg opacity-40 cursor-default">
                  {item.dot && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.dot }} />}
                  <span className="text-xs text-text-tertiary">{item.label}</span>
                  <span className="ml-auto text-[9px] font-semibold text-text-tertiary border border-border-primary rounded px-1.5 py-0.5 uppercase tracking-wide">Soon</span>
                </div>
              );
            }
            return (
              <Link
                key={item.label}
                href={item.href!}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors ${
                  isActive ? 'text-modules-aly bg-modules-aly/5' : 'text-text-tertiary hover:text-text-primary hover:bg-background-tertiary'
                }`}
              >
                {item.dot && (
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: isActive ? 'var(--modules-aly)' : item.dot }} />
                )}
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export const Sidebar: React.FC = () => {
  const pathname      = usePathname();
  const { assistantName } = useUserProfile();
  const { isCollapsed, isHoverExpanded, visuallyCollapsed, toggle, handleMouseEnter, handleMouseLeave } = useSidebar();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [userName, setUserName] = useState<string>('You');
  const [initials, setInitials] = useState<string>('—');
  const [navPins,  setNavPins]  = useState<any[]>([]);

  const integrationsActive = pathname.startsWith('/integrations') || pathname === '/calendar';

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const full  = user.user_metadata?.full_name || user.email || '';
      const parts = full.split(' ');
      const first = parts[0] || '';
      const last  = parts[1] || '';
      setUserName(first || full);
      setInitials(
        first && last
          ? `${first[0]}${last[0]}`.toUpperCase()
          : full.slice(0, 2).toUpperCase()
      );

      supabase
        .from('user_profiles')
        .upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true })
        .then(() =>
          supabase.from('user_profiles').select('nav_pins').eq('id', user.id).maybeSingle()
        )
        .then(({ data }) => {
          if (data?.nav_pins && Array.isArray(data.nav_pins)) setNavPins(data.nav_pins);
        });
    });
  }, []);

  const ICONS: Record<string, React.ElementType> = {
    House, FolderOpen, AppWindow, Tray, TreeStructure,
    HandbagIcon, ClockCounterClockwise, Plugs, Sparkle, PencilLine, ChartPie,
  };

  const defaultNav = [
    { type: 'item', href: '/dashboard',        icon: 'House',                label: 'Home'        },
    { type: 'item', href: '/spaces',           icon: 'FolderOpen',           label: 'Spaces'      },
    { type: 'item', href: '/screens',          icon: 'AppWindow',            label: 'Screens'     },
    { type: 'item', href: '/vault',            icon: 'Tray',                 label: 'Vault'       },
    { type: 'item', href: '/automate',         icon: 'TreeStructure',        label: 'Automate'    },
    { type: 'item', href: '/marketplace',      icon: 'HandbagIcon',          label: 'Marketplace' },
    { type: 'item', href: '/module-creator',   icon: 'PencilLine',           label: 'Creator'     },
    { type: 'item', href: '/creator/dashboard',icon: 'ChartPie',             label: 'Earnings'    },
    { type: 'item', href: '/history',          icon: 'ClockCounterClockwise',label: 'History'     },
  ];

  const pinsToRender = navPins.length > 0 ? navPins : defaultNav;

  // Computed sidebar width
  const sidebarWidth = visuallyCollapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_EXPANDED_W;

  return (
    <aside
      style={{
        position:   'fixed',
        left:       0,
        top:        0,
        height:     '100vh',
        width:      sidebarWidth,
        transition: 'width 200ms ease-out',
        zIndex:     50,
        // Hover-expanded overlays content; otherwise it's in-flow (kept fixed regardless)
        // Shadow only in hover-expanded to indicate overlay
        boxShadow: isHoverExpanded ? '4px 0 24px rgba(0,0,0,0.35)' : 'none',
      }}
      className="bg-background-secondary border-r border-border-primary hidden lg:flex flex-col overflow-hidden"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* ── Brand header ──────────────────────────────────────────────────── */}
      <div className="h-12 flex items-center gap-2.5 border-b border-border-primary shrink-0 px-3 relative overflow-hidden">
        {/* Logo icon — always visible */}
        <div className="w-7 h-7 rounded-lg bg-modules-aly/15 flex items-center justify-center border border-modules-aly/25 shrink-0">
          <Sparkle size={15} color="var(--modules-aly)" weight="fill" />
        </div>

        {/* Brand name — fades out when collapsed */}
        <span
          className="text-[11px] font-bold tracking-[0.35em] text-text-tertiary flex-1 min-w-0"
          style={labelStyle(visuallyCollapsed)}
        >
          TAKDA
        </span>

        {/* Toggle button — always accessible */}
        <button
          onClick={toggle}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-text-tertiary hover:bg-background-tertiary hover:text-text-primary transition-colors"
          style={{
            // In collapsed+not-hovered, position absolute so it stays visible
            // even though brand text is gone
            position: visuallyCollapsed ? 'absolute' : 'relative',
            right:    visuallyCollapsed ? 6 : undefined,
          }}
        >
          {visuallyCollapsed
            ? <CaretDoubleRight size={11} weight="bold" />
            : <CaretDoubleLeft  size={11} weight="bold" />
          }
        </button>
      </div>

      {/* ── Main nav ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-6 px-2 py-4 flex-1 overflow-y-auto overflow-x-hidden">

        {/* Primary navigation */}
        <nav className="flex flex-col gap-0.5">
          {pinsToRender.map((pin, i) => {
            if (pin.type === 'item') {
              const active = pin.href === '/' ? pathname === '/' : pathname.startsWith(pin.href);
              return (
                <NavItem
                  key={i}
                  href={pin.href}
                  icon={ICONS[pin.icon] || AppWindow}
                  label={pin.label}
                  active={active}
                />
              );
            }
            return null;
          })}

          {/* Integrations group */}
          <NavGroup
            icon={Plugs}
            label="Integrations"
            active={integrationsActive}
            defaultOpen={integrationsActive}
            items={[
              { label: 'Calendar',     href: '/calendar',     dot: '#4285F4' },
              { label: 'Google Drive', comingSoon: true,      dot: '#34A853' },
              { label: 'Strava',       href: '/integrations', dot: '#FC4C02' },
            ]}
          />
        </nav>

        {/* Assistant section */}
        <nav className="flex flex-col gap-0.5">
          {/* Section label — hidden when collapsed */}
          <p
            className="text-[10px] font-semibold text-text-tertiary/50 uppercase tracking-wider mb-1 px-3"
            style={labelStyle(visuallyCollapsed)}
          >
            Assistant
          </p>
          <NavItem
            href="/chat"
            icon={Sparkle}
            label={`Ask ${assistantName}`}
            active={pathname === '/chat'}
          />
        </nav>

        {/* Profile — bottom */}
        <div className="mt-auto relative">
          <div className="relative group">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-background-tertiary transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-modules-track/20 border border-modules-track/30 flex items-center justify-center text-modules-track font-bold text-xs shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0 text-left" style={labelStyle(visuallyCollapsed)}>
                <p className="text-sm font-medium text-text-primary truncate">{userName}</p>
                <p className="text-[10px] text-text-tertiary">Personal workspace</p>
              </div>
            </button>
            <Tooltip label={userName} show={visuallyCollapsed} />
          </div>

          <ProfileMenuPopup
            isOpen={isProfileMenuOpen}
            onClose={() => setIsProfileMenuOpen(false)}
          />
        </div>
      </div>
    </aside>
  );
};
