"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  House, 
  Sparkle, 
  Calendar, 
  Binoculars, 
  SignOut,
  Vault,
  User,
} from '@phosphor-icons/react';
import { ASSISTANT_NAME } from '@/constants/brand';
import { supabase } from '@/services/supabase';
import { useRouter } from 'next/navigation';
import { ProfileMenuPopup } from '@/components/profile/ProfileMenuPopup';

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  active?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ href, icon: Icon, label, active }) => {
  return (
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
};

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  return (
    <aside className="w-64 bg-background-secondary border-r border-border-primary p-6 hidden lg:flex flex-col gap-8 z-50">
      {/* Brand Section */}
      <div className="flex items-center gap-3 px-2">
        <div className="w-8 h-8 rounded-lg bg-modules-aly/20 flex items-center justify-center border border-modules-aly/30 shadow-lg shadow-modules-aly/10">
          <Sparkle size={18} color="var(--modules-aly)" weight="fill" />
        </div>
        <span className="text-[11px] font-bold tracking-[0.4em] text-text-tertiary">TAKDA</span>
      </div>

      {/* Main Navigation */}
      <nav className="flex flex-col gap-1.5 pt-4">
        <p className="text-[9px] font-bold text-text-tertiary/60 uppercase tracking-[0.2em] mb-2 px-4">Registry</p>
        <NavItem href="/dashboard" icon={House} label="Dashboard" active={pathname === "/dashboard"} />
        <NavItem href="/calendar" icon={Calendar} label="Calendar" active={pathname === "/calendar"} />
        <NavItem href="/spaces" icon={Binoculars} label="Oversight" active={pathname === "/spaces"} />
        <NavItem href="/vault" icon={Vault} label="The Vault" active={pathname === "/vault"} />
      </nav>

      <nav className="flex flex-col gap-1.5">
        <p className="text-[9px] font-bold text-text-tertiary/60 uppercase tracking-[0.2em] mb-2 px-4">Intelligence</p>
        <NavItem href="/coordinator" icon={Sparkle} label={`Ask ${ASSISTANT_NAME}`} active={pathname === "/coordinator"} />
      </nav>

      {/* Profile Section */}
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
