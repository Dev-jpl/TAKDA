"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  House,
  Sparkle,
  Calendar,
  Binoculars,
  Vault,
  CaretDown,
} from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { ASSISTANT_NAME } from '@/constants/brand';
import { ProfileMenuPopup } from '@/components/profile/ProfileMenuPopup';

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  active?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ href, icon: Icon, label, active }) => (
  <Link
    href={href}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
      active
        ? "bg-modules-aly/10 text-modules-aly border border-modules-aly/20 shadow-sm"
        : "text-text-secondary hover:bg-background-tertiary hover:text-text-primary"
    }`}
  >
    <Icon size={20} weight={active ? "fill" : "regular"} className="group-hover:scale-110 transition-transform" />
    <span className="text-sm font-semibold tracking-wide">{label}</span>
    {active && <div className="ml-auto w-1 h-4 rounded-full bg-modules-aly" />}
  </Link>
);

interface SubItem {
  href?: string;
  label: string;
  comingSoon?: boolean;
  dot?: string; // hex color for the dot
}

interface NavGroupProps {
  icon: React.ElementType;
  label: string;
  items: SubItem[];
  active?: boolean; // any child is active
  defaultOpen?: boolean;
}

const NavGroup: React.FC<NavGroupProps> = ({ icon: Icon, label, items, active, defaultOpen }) => {
  const [open, setOpen] = useState(defaultOpen ?? active ?? false);
  const pathname = usePathname();

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
          active
            ? "bg-modules-aly/10 text-modules-aly border border-modules-aly/20"
            : "text-text-secondary hover:bg-background-tertiary hover:text-text-primary"
        }`}
      >
        <Icon size={20} weight={active ? "fill" : "regular"} />
        <span className="text-sm font-semibold tracking-wide flex-1 text-left">{label}</span>
        <CaretDown
          size={13}
          weight="bold"
          className={`transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`}
        />
      </button>

      {open && (
        <div className="mt-1 ml-4 pl-4 border-l border-border-primary flex flex-col gap-0.5">
          {items.map(item => {
            const isActive = item.href ? pathname === item.href : false;
            if (item.comingSoon) {
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg opacity-40 cursor-default"
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
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
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
  const router = useRouter();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const integrationsActive = pathname.startsWith("/integrations") || pathname === "/calendar";

  return (
    <aside className="w-64 bg-background-secondary border-r border-border-primary p-6 hidden lg:flex flex-col gap-8 z-50">
      {/* Brand */}
      <div className="flex items-center gap-3 px-2">
        <div className="w-8 h-8 rounded-lg bg-modules-aly/20 flex items-center justify-center border border-modules-aly/30 shadow-lg shadow-modules-aly/10">
          <Sparkle size={18} color="var(--modules-aly)" weight="fill" />
        </div>
        <span className="text-[11px] font-bold tracking-[0.4em] text-text-tertiary">TAKDA</span>
      </div>

      {/* Main nav */}
      <nav className="flex flex-col gap-1.5 pt-4">
        <p className="text-[9px] font-bold text-text-tertiary/60 uppercase tracking-[0.2em] mb-2 px-4">Registry</p>
        <NavItem href="/dashboard" icon={House}      label="Dashboard" active={pathname === "/dashboard"} />
        <NavItem href="/spaces"    icon={Binoculars} label="Oversight"  active={pathname.startsWith("/spaces")} />
        <NavItem href="/vault"     icon={Vault}      label="The Vault"  active={pathname === "/vault"} />

        <NavGroup
          icon={Calendar}
          label="Integrations"
          active={integrationsActive}
          defaultOpen={integrationsActive}
          items={[
            { label: "Calendar",     href: "/calendar",          dot: "#4285F4" },
            { label: "Google Drive", comingSoon: true,           dot: "#34A853" },
            { label: "Strava",       href: "/integrations",      dot: "#FC4C02" },
          ]}
        />
      </nav>

      {/* Intelligence */}
      <nav className="flex flex-col gap-1.5">
        <p className="text-[9px] font-bold text-text-tertiary/60 uppercase tracking-[0.2em] mb-2 px-4">Intelligence</p>
        <NavItem href="/coordinator" icon={Sparkle} label={`Ask ${ASSISTANT_NAME}`} active={pathname === "/coordinator"} />
      </nav>

      {/* Profile */}
      <div className="mt-auto flex flex-col gap-4 relative">
        <button
          onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
          className="p-1 border border-border-primary rounded-2xl bg-background-tertiary/30 hover:bg-background-tertiary/50 transition-all cursor-pointer group"
        >
          <div className="p-3.5 rounded-xl bg-background-tertiary border border-border-primary/50 flex items-center gap-3 shadow-inner group-hover:border-modules-track/30 transition-all">
            <div className="w-10 h-10 rounded-full bg-modules-track/20 border border-modules-track/30 flex items-center justify-center text-modules-track font-bold text-xs shadow-sm group-hover:bg-modules-track/30 transition-all">
              PH
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-text-primary truncate group-hover:text-modules-track transition-colors">Patrick</p>
              <p className="text-[9px] text-text-tertiary uppercase tracking-wider font-semibold">Verified OS</p>
            </div>
          </div>
        </button>

        <ProfileMenuPopup
          isOpen={isProfileMenuOpen}
          onClose={() => setIsProfileMenuOpen(false)}
        />
      </div>
    </aside>
  );
};
