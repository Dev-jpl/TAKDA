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
} from '@phosphor-icons/react';
import { ASSISTANT_NAME } from '@/constants/brand';
import { ProfileMenuPopup } from '@/components/profile/ProfileMenuPopup';
import { supabase } from '@/services/supabase';

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  active?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ href, icon: Icon, label, active }) => (
  <Link
    href={href}
    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
      active
        ? "bg-modules-aly/10 text-modules-aly border border-modules-aly/20"
        : "text-text-secondary hover:bg-background-tertiary hover:text-text-primary"
    }`}
  >
    <Icon size={18} weight={active ? "fill" : "regular"} />
    <span className="text-sm font-medium">{label}</span>
    {active && <div className="ml-auto w-1 h-3.5 rounded-full bg-modules-aly" />}
  </Link>
);

interface SubItem {
  href?: string;
  label: string;
  comingSoon?: boolean;
  dot?: string;
}

interface NavGroupProps {
  icon: React.ElementType;
  label: string;
  items: SubItem[];
  active?: boolean;
  defaultOpen?: boolean;
}

const NavGroup: React.FC<NavGroupProps> = ({ icon: Icon, label, items, active, defaultOpen }) => {
  const [open, setOpen] = useState(defaultOpen ?? active ?? false);
  const pathname = usePathname();

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
          active
            ? "bg-modules-aly/10 text-modules-aly border border-modules-aly/20"
            : "text-text-secondary hover:bg-background-tertiary hover:text-text-primary"
        }`}
      >
        <Icon size={18} weight={active ? "fill" : "regular"} />
        <span className="text-sm font-medium flex-1 text-left">{label}</span>
        <CaretDown
          size={12}
          weight="bold"
          className={`transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`}
        />
      </button>

      {open && (
        <div className="mt-1 ml-3.5 pl-4 border-l border-border-primary/60 flex flex-col gap-0.5">
          {items.map(item => {
            const isActive = item.href ? pathname === item.href : false;
            if (item.comingSoon) {
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg opacity-40 cursor-default"
                >
                  {item.dot && (
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.dot }} />
                  )}
                  <span className="text-xs text-text-tertiary">{item.label}</span>
                  <span className="ml-auto text-[9px] font-semibold text-text-tertiary border border-border-primary rounded px-1.5 py-0.5 uppercase tracking-wide">
                    Soon
                  </span>
                </div>
              );
            }
            return (
              <Link
                key={item.label}
                href={item.href!}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors ${
                  isActive
                    ? "text-modules-aly bg-modules-aly/5"
                    : "text-text-tertiary hover:text-text-primary hover:bg-background-tertiary"
                }`}
              >
                {item.dot && (
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: isActive ? "var(--modules-aly)" : item.dot }}
                  />
                )}
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [userName, setUserName] = useState<string>("You");
  const [initials, setInitials] = useState<string>("—");

  const integrationsActive = pathname.startsWith("/integrations") || pathname === "/calendar";

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const full  = user.user_metadata?.full_name || user.email || "";
        const parts = full.split(" ");
        const first = parts[0] || "";
        const last  = parts[1] || "";
        setUserName(first || full);
        setInitials(
          first && last
            ? `${first[0]}${last[0]}`.toUpperCase()
            : full.slice(0, 2).toUpperCase()
        );
      }
    });
  }, []);

  return (
    <aside className="w-60 bg-background-secondary border-r border-border-primary hidden lg:flex flex-col z-50">
      {/* Brand — matches TopNav h-12 exactly */}
      <div className="h-12 flex items-center gap-2.5 px-5 border-b border-border-primary shrink-0">
        <div className="w-7 h-7 rounded-lg bg-modules-aly/15 flex items-center justify-center border border-modules-aly/25">
          <Sparkle size={15} color="var(--modules-aly)" weight="fill" />
        </div>
        <span className="text-[11px] font-bold tracking-[0.35em] text-text-tertiary">TAKDA</span>
      </div>

      {/* Main nav */}
      <div className="flex flex-col gap-6 px-4 py-6 flex-1 overflow-y-auto">
        <nav className="flex flex-col gap-0.5">
        <NavItem href="/dashboard" icon={House}                  label="Home"     active={pathname === "/dashboard"} />
        <NavItem href="/spaces"    icon={FolderOpen}             label="Spaces"   active={pathname.startsWith("/spaces")} />
        <NavItem href="/screens"   icon={AppWindow}              label="Screens"  active={pathname.startsWith("/screens")} />
        <NavItem href="/vault"     icon={Tray}                   label="Vault"    active={pathname === "/vault"} />
        <NavItem href="/automate"     icon={TreeStructure}          label="Automate"     active={pathname.startsWith("/automate")} />
        <NavItem href="/marketplace"  icon={HandbagIcon}            label="Marketplace"  active={pathname.startsWith("/marketplace")} />
        <NavItem href="/history"      icon={ClockCounterClockwise}  label="History"      active={pathname === "/history"} />
        <NavGroup
          icon={Plugs}
          label="Integrations"
          active={integrationsActive}
          defaultOpen={integrationsActive}
          items={[
            { label: "Calendar",     href: "/calendar",     dot: "#4285F4" },
            { label: "Google Drive", comingSoon: true,      dot: "#34A853" },
            { label: "Strava",       href: "/integrations", dot: "#FC4C02" },
          ]}
        />
      </nav>

      {/* Ask Aly */}
      <nav className="flex flex-col gap-0.5">
        <p className="text-[10px] font-semibold text-text-tertiary/50 uppercase tracking-wider mb-1 px-3">Assistant</p>
        <NavItem href="/chat" icon={Sparkle} label={`Ask ${ASSISTANT_NAME}`} active={pathname === "/chat"} />
      </nav>

      {/* Profile */}
      <div className="mt-auto relative">
        <button
          onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-background-tertiary transition-all group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-modules-track/20 border border-modules-track/30 flex items-center justify-center text-modules-track font-bold text-xs shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-text-primary truncate">{userName}</p>
            <p className="text-[10px] text-text-tertiary">Personal workspace</p>
          </div>
        </button>

        <ProfileMenuPopup
          isOpen={isProfileMenuOpen}
          onClose={() => setIsProfileMenuOpen(false)}
        />
      </div>
      </div>
    </aside>
  );
};
