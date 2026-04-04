"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/services/supabase";
import { useRouter } from "next/navigation";
import { FileText, SignOut, Gear } from "@phosphor-icons/react";
import Link from "next/link";

interface ProfileMenuPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileMenuPopup: React.FC<ProfileMenuPopupProps> = ({
  isOpen,
  onClose,
}) => {
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose]);

  const handleLogout = async () => {
    if (
      !confirm(
        "Are you sure you want to sign out?"
      )
    ) {
      return;
    }

    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      onClose();
      router.push("/auth");
    } catch (e) {
      console.error("Logout error:", e);
      setLoggingOut(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15 }}
          className="absolute bottom-full mb-2 right-0 w-48 bg-background-secondary border border-border-primary rounded-lg overflow-hidden shadow-lg z-50"
        >
          {/* View Profile */}
          <Link href="/profile" onClick={onClose}>
            <motion.button
              whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-background-tertiary transition-colors border-b border-border-primary/50"
            >
              <FileText
                size={16}
                weight="light"
                className="text-text-secondary flex-shrink-0"
              />
              <span className="text-sm font-medium text-text-primary">
                View Profile
              </span>
            </motion.button>
          </Link>

          {/* Settings */}
          <Link href="/settings" onClick={onClose}>
            <motion.button
              whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-background-tertiary transition-colors border-b border-border-primary/50"
            >
              <Gear
                size={16}
                weight="light"
                className="text-text-secondary flex-shrink-0"
              />
              <span className="text-sm font-medium text-text-primary">
                Settings
              </span>
            </motion.button>
          </Link>

          {/* Logout */}
          <motion.button
            whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-background-tertiary transition-colors disabled:opacity-50"
          >
            <SignOut
              size={16}
              weight="light"
              className="text-status-high flex-shrink-0"
            />
            <span className="text-sm font-medium text-status-high">
              {loggingOut ? "Logging out..." : "Logout"}
            </span>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
