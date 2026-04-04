"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/services/supabase";
import { spacesService } from "@/services/spaces.service";
import { hubsService } from "@/services/hubs.service";
import { useRouter } from "next/navigation";
import {
  SignOut,
  Bell,
  ShieldCheck,
  Database,
  Key,
  IdentificationCard,
  ArrowRight,
  IconProps,
} from "@phosphor-icons/react";

interface Stats {
  spaces: number;
  hubs: number;
}

interface UserData {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
  };
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [stats, setStats] = useState<Stats>({ spaces: 0, hubs: 0 });
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user as UserData);

      if (user) {
        try {
          const spacesData = await spacesService.getSpaces(user.id);
          let hubCount = 0;
          for (const space of spacesData) {
            const hubs = await hubsService.getHubsBySpace(space.id);
            hubCount += hubs.length;
          }
          setStats({ spaces: spacesData.length, hubs: hubCount });
        } catch (e) {
          console.warn("Stats load error:", e);
        }
      }
    } catch (e) {
      console.warn("User load error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (
      !confirm(
        "Are you sure you want to sign out? Your local state will be cleared."
      )
    ) {
      return;
    }

    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      router.push("/auth");
    } catch (e) {
      console.error("Logout error:", e);
      setLoggingOut(false);
    }
  };

  const initials =
    user?.user_metadata?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-primary">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-modules-track border-transparent border-t-modules-track rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-primary">
      {/* Header */}
      <div className="border-b border-border-primary sticky top-0 z-40 bg-background-primary/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-[11px] font-bold text-text-tertiary tracking-widest uppercase">
              User Identity
            </h1>
          </motion.div>

          <button
            onClick={() => router.push("/")}
            className="text-[12px] font-medium text-text-tertiary hover:text-text-secondary transition-colors uppercase tracking-wide"
          >
            Back to System
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="space-y-8"
        >
          {/* Identity Card Section */}
          <div className="flex flex-col items-center gap-4 mb-12">
            {/* Large Avatar */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="w-24 h-24 rounded-full bg-gradient-to-br from-modules-track/20 to-modules-track/5 border border-modules-track/30 flex items-center justify-center"
            >
              <span className="text-3xl font-bold text-modules-track">
                {initials}
              </span>
            </motion.div>

            {/* User Info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="text-center space-y-2"
            >
              <h2 className="text-2xl font-medium text-text-primary">
                {user?.user_metadata?.full_name || "TAKDA User"}
              </h2>
              <p className="text-sm text-text-tertiary">{user?.email}</p>
            </motion.div>

            {/* Verified Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-border-primary bg-background-secondary"
            >
              <ShieldCheck size={14} weight="fill" className="text-modules-track" />
              <span className="text-[10px] font-bold text-text-tertiary tracking-wider uppercase">
                Secured Core
              </span>
            </motion.div>
          </div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-3 gap-px bg-border-primary rounded-lg overflow-hidden mb-12"
          >
            <div className="bg-background-secondary px-6 py-8 text-center">
              <div className="text-2xl font-bold text-text-primary">
                {stats.spaces}
              </div>
              <div className="text-[10px] font-bold text-text-tertiary tracking-wider uppercase mt-2">
                Spaces
              </div>
            </div>
            <div className="bg-background-secondary px-6 py-8 text-center">
              <div className="text-2xl font-bold text-text-primary">
                {stats.hubs}
              </div>
              <div className="text-[10px] font-bold text-text-tertiary tracking-wider uppercase mt-2">
                Hubs
              </div>
            </div>
            <div className="bg-background-secondary px-6 py-8 text-center">
              <div className="text-2xl font-bold text-text-primary">1.0</div>
              <div className="text-[10px] font-bold text-text-tertiary tracking-wider uppercase mt-2">
                Version
              </div>
            </div>
          </motion.div>

          {/* Account Control Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="space-y-4"
          >
            <h3 className="text-[11px] font-bold text-text-tertiary tracking-widest uppercase ml-1">
              Account Control
            </h3>
            <div className="border border-border-primary rounded-lg overflow-hidden bg-background-secondary divide-y divide-border-primary">
              <MenuLink icon={IdentificationCard} label="Edit Profile" />
              <MenuLink icon={Key} label="Login & Security" />
              <MenuLink icon={Bell} label="Notification Center" />
            </div>
          </motion.div>

          {/* Privacy & Data Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="space-y-4"
          >
            <h3 className="text-[11px] font-bold text-text-tertiary tracking-widest uppercase ml-1">
              Privacy & Data
            </h3>
            <div className="border border-border-primary rounded-lg overflow-hidden bg-background-secondary divide-y divide-border-primary">
              <MenuLink icon={ShieldCheck} label="Privacy Management" />
              <MenuLink icon={Database} label="Backup & Export" />
            </div>
          </motion.div>

          {/* Operations Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="space-y-4"
          >
            <h3 className="text-[11px] font-bold text-text-tertiary tracking-widest uppercase ml-1">
              Operations
            </h3>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center gap-3 px-6 py-4 rounded-lg border border-status-high/30 bg-background-secondary hover:bg-background-tertiary transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <SignOut
                size={20}
                weight="regular"
                className="text-status-high group-hover:text-status-high/80 transition-colors"
              />
              <span className="text-sm font-medium text-status-high group-hover:text-status-high/80 transition-colors">
                {loggingOut ? "Terminating Session..." : "Terminate Session"}
              </span>
            </button>
          </motion.div>

          {/* Trademark */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="text-center pt-8"
          >
            <p className="text-[10px] font-bold text-text-tertiary tracking-widest uppercase opacity-50">
              TAKDA — System Operational
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

interface MenuLinkProps {
  icon: React.ElementType<IconProps>;
  label: string;
}

function MenuLink({ icon: Icon, label }: MenuLinkProps) {
  return (
    <motion.button
      whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.02)" }}
      className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-background-tertiary/50 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <Icon
          size={18}
          weight="light"
          className="text-text-secondary group-hover:text-text-primary transition-colors"
        />
        <span className="text-sm text-text-primary group-hover:text-text-secondary transition-colors">
          {label}
        </span>
      </div>
      <ArrowRight
        size={16}
        weight="light"
        className="text-text-tertiary group-hover:text-text-secondary transition-colors opacity-0 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all"
      />
    </motion.button>
  );
}
