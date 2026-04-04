"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Bell,
  ShieldCheck,
  Key,
  Palette,
  Moon,
  Database,
  Megaphone,
  CaretRight,
  Calendar,
  Plus,
  Trash,
  Plug,
  EnvelopeOpen,
  FolderOpen,
  IconProps,
} from "@phosphor-icons/react";
import { integrationsService, UserIntegration } from "@/services/integrations.service";
import { supabase } from "@/services/supabase";

interface SettingItemProps {
  icon: React.ElementType<IconProps>;
  label: string;
  description: string;
  value?: string | boolean;
  onClick?: () => void;
}



type SettingsTab = "integrations" | "notifications" | "display" | "security" | "advanced";

const SettingItem: React.FC<SettingItemProps> = ({
  icon: Icon,
  label,
  description,
  value,
  onClick,
}) => (
  <motion.button
    whileHover={{ backgroundColor: "rgba(255,255,255,0.02)" }}
    onClick={onClick}
    className="w-full flex items-center justify-between px-6 py-4 rounded-lg border border-border-primary bg-background-tertiary/20 hover:bg-background-tertiary/40 transition-all group text-left"
  >
    <div className="flex items-center gap-4 flex-1">
      <Icon
        size={20}
        weight="light"
        className="text-modules-aly flex-shrink-0"
      />
      <div className="flex-1">
        <p className="text-sm font-semibold text-text-primary">{label}</p>
        <p className="text-xs text-text-tertiary mt-1">{description}</p>
      </div>
    </div>
    <div className="flex items-center gap-3">
      {value !== undefined && (
        <span className="text-xs font-medium text-text-secondary">
          {typeof value === "boolean" ? (value ? "On" : "Off") : value}
        </span>
      )}
      <CaretRight
        size={16}
        weight="light"
        className="text-text-tertiary group-hover:text-text-secondary transition-colors"
      />
    </div>
  </motion.button>
);


interface TabButtonProps {
  label: string;
  icon: React.ElementType<IconProps>;
  isActive: boolean;
  onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ label, icon: Icon, isActive, onClick }) => (
  <motion.button
    onClick={onClick}
    className={`w-full px-4 py-2.5 text-left text-xs font-medium transition-colors flex items-center gap-3 ${
      isActive
        ? "bg-background-tertiary text-text-primary border-l-2 border-modules-knowledge"
        : "text-text-secondary hover:bg-background-secondary/50"
    }`}
    whileHover={{ x: 4 }}
  >
    <Icon size={16} weight={isActive ? "fill" : "regular"} />
    {label}
  </motion.button>
);

interface IntegrationItemProps {
  name: string;
  provider: string;
  email?: string;
  enabled: boolean;
  onToggle: () => void;
  onRemove: () => void;
}

const IntegrationItem: React.FC<IntegrationItemProps> = ({
  name,
  provider,
  email,
  enabled,
  onToggle,
  onRemove,
}) => {
  const getProviderColor = (provider: string) => {
    const colors: { [key: string]: string } = {
      Google: "bg-status-high text-white",
      Gmail: "bg-status-high text-white",
      Apple: "bg-text-tertiary text-white",
      Microsoft: "bg-modules-annotate text-white",
      Outlook: "bg-modules-annotate text-white",
      Drive: "bg-modules-deliver text-white",
    };
    return colors[provider] || "bg-text-tertiary text-white";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between p-3 rounded-lg border border-border-secondary bg-background-secondary hover:bg-background-tertiary transition-colors"
    >
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-xs font-medium text-text-primary">{name}</h4>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${getProviderColor(provider)}`}>
            {provider}
          </span>
        </div>
        {email && <p className="text-[10px] text-text-secondary">{email}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Toggle Switch */}
        <button
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? "bg-modules-knowledge" : "bg-text-tertiary"
          }`}
        >
          <motion.span
            layout
            className="inline-block h-4 w-4 transform rounded-full bg-white"
            animate={{ x: enabled ? 20 : 2 }}
          />
        </button>

        {/* Remove Button */}
        <button
          onClick={onRemove}
          className="p-2 hover:bg-background-tertiary rounded transition-colors text-text-secondary hover:text-status-high"
        >
          <Trash size={18} />
        </button>
      </div>
    </motion.div>
  );
};

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>("integrations");

  // Integration States
  const [activeIntegrations, setActiveIntegrations] = useState<UserIntegration[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchIntegrations = useCallback(async () => {
    const data = await integrationsService.getIntegrations();
    setActiveIntegrations(data);
  }, []);

  const handleAddCalendar = async () => {
    if (!userId) return;
    await integrationsService.initiateGoogleAuth(userId);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
    
    const init = async () => {
      await fetchIntegrations();
    };
    init();
  }, [fetchIntegrations]);

  // Settings States
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [twoFactorAuth, setTwoFactorAuth] = useState(true);
  const [dataCollection, setDataCollection] = useState(false);
  return (
    <div className="min-h-screen bg-background-primary">
      {/* Header */}
      <div className="border-b border-border-primary sticky top-0 z-40 bg-background-primary/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-[9px] font-bold text-text-tertiary tracking-widest uppercase">
              System Settings
            </h1>
          </motion.div>

          <button
            onClick={() => router.back()}
            className="text-[10px] font-medium text-text-tertiary hover:text-text-secondary transition-colors uppercase tracking-wide"
          >
            Back
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="w-64 flex-shrink-0"
          >
            <div className="rounded-lg border border-border-secondary bg-background-secondary overflow-hidden">
              <TabButton
                label="Integrations"
                icon={Plug}
                isActive={activeTab === "integrations"}
                onClick={() => setActiveTab("integrations")}
              />
              <TabButton
                label="Notifications"
                icon={Bell}
                isActive={activeTab === "notifications"}
                onClick={() => setActiveTab("notifications")}
              />
              <TabButton
                label="Display"
                icon={Palette}
                isActive={activeTab === "display"}
                onClick={() => setActiveTab("display")}
              />
              <TabButton
                label="Security"
                icon={ShieldCheck}
                isActive={activeTab === "security"}
                onClick={() => setActiveTab("security")}
              />
              <TabButton
                label="Advanced"
                icon={Database}
                isActive={activeTab === "advanced"}
                onClick={() => setActiveTab("advanced")}
              />
            </div>
          </motion.div>

          {/* Main Content Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex-1"
          >
            {/* Integrations Tab */}
            {activeTab === "integrations" && (
              <div className="space-y-8">
                {/* Calendar Integration */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-modules-knowledge" />
                    <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                      Calendar
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {activeIntegrations.filter(i => i.provider === 'google').map((integration) => (
                      <IntegrationItem
                        key={integration.id}
                        name="Google Calendar"
                        provider="Google"
                        email={integration.metadata?.email as string | undefined}
                        enabled={true}
                        onToggle={() => {}}
                        onRemove={() => integrationsService.removeIntegration(integration.id).then(fetchIntegrations)}
                      />
                    ))}
                    <motion.button
                      whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                      onClick={handleAddCalendar}
                      className="w-full flex items-center justify-center gap-2 px-6 py-2 rounded-lg border border-dashed border-modules-knowledge/40 bg-modules-knowledge/5 hover:bg-modules-knowledge/10 transition-all"
                    >
                      <Plus size={16} className="text-modules-knowledge" />
                      <span className="text-xs font-medium text-modules-knowledge">
                        Add Google Calendar
                      </span>
                    </motion.button>
                  </div>
                </motion.div>

                {/* Gmail Integration */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2">
                    <EnvelopeOpen size={18} className="text-status-high" />
                    <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                      Gmail
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {activeIntegrations.filter(i => i.provider === 'google').map((integration) => (
                      <IntegrationItem
                        key={integration.id}
                        name="Gmail Inbox"
                        provider="Gmail"
                        email={integration.metadata?.email as string | undefined}
                        enabled={true}
                        onToggle={() => {}}
                        onRemove={() => integrationsService.removeIntegration(integration.id).then(fetchIntegrations)}
                      />
                    ))}
                    <motion.button
                      whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                      onClick={handleAddCalendar}
                      className="w-full flex items-center justify-center gap-2 px-6 py-2 rounded-lg border border-dashed border-status-high/40 bg-status-high/5 hover:bg-status-high/10 transition-all"
                    >
                      <Plus size={16} className="text-status-high" />
                      <span className="text-xs font-medium text-status-high">
                        Add Gmail Account
                      </span>
                    </motion.button>
                  </div>
                </motion.div>

                {/* Google Drive Integration */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2">
                    <FolderOpen size={18} className="text-modules-deliver" />
                    <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                      Google Drive
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {activeIntegrations.filter(i => i.provider === 'google').map((integration) => (
                      <IntegrationItem
                        key={integration.id}
                        name="Google Drive"
                        provider="Drive"
                        email={integration.metadata?.email as string | undefined}
                        enabled={true}
                        onToggle={() => {}}
                        onRemove={() => integrationsService.removeIntegration(integration.id).then(fetchIntegrations)}
                      />
                    ))}
                    <motion.button
                      whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                      onClick={() => console.log("Add drive")}
                      className="w-full flex items-center justify-center gap-2 px-6 py-2 rounded-lg border border-dashed border-modules-deliver/40 bg-modules-deliver/5 hover:bg-modules-deliver/10 transition-all"
                    >
                      <Plus size={16} className="text-modules-deliver" />
                      <span className="text-xs font-medium text-modules-deliver">
                        Add Google Drive
                      </span>
                    </motion.button>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-4">
                  Notification Preferences
                </h2>
                <SettingItem
                  icon={Bell}
                  label="Push Notifications"
                  description="Receive push notifications from TAKDA"
                  value={pushNotifications}
                  onClick={() => setPushNotifications(!pushNotifications)}
                />
                <SettingItem
                  icon={Megaphone}
                  label="Email Notifications"
                  description="Receive email summaries and alerts"
                  value={emailNotifications}
                  onClick={() => setEmailNotifications(!emailNotifications)}
                />
              </motion.div>
            )}

            {/* Display Tab */}
            {activeTab === "display" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-4">
                  Display & Theme
                </h2>
                <SettingItem
                  icon={Moon}
                  label="Dark Mode"
                  description="Use dark theme for TAKDA interface"
                  value={darkMode}
                  onClick={() => setDarkMode(!darkMode)}
                />
                <SettingItem
                  icon={Palette}
                  label="Reduce Motion"
                  description="Minimize animations and transitions"
                  value={reducedMotion}
                  onClick={() => setReducedMotion(!reducedMotion)}
                />
              </motion.div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-4">
                  Security & Privacy
                </h2>
                <SettingItem
                  icon={Key}
                  label="Change Password"
                  description="Update your account password"
                />
                <SettingItem
                  icon={ShieldCheck}
                  label="Two-Factor Authentication"
                  description="Add extra security to your account"
                  value={twoFactorAuth}
                  onClick={() => setTwoFactorAuth(!twoFactorAuth)}
                />
                <SettingItem
                  icon={Database}
                  label="Data Collection"
                  description="Manage how your data is collected and used"
                  value={dataCollection}
                  onClick={() => setDataCollection(!dataCollection)}
                />
              </motion.div>
            )}

            {/* Advanced Tab */}
            {activeTab === "advanced" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-4">
                  Advanced Options
                </h2>
                <SettingItem
                  icon={Database}
                  label="Export Data"
                  description="Download all your TAKDA data as JSON"
                />
                <SettingItem
                  icon={Database}
                  label="Clear Cache"
                  description="Clear application cache and temporary files"
                />
                <SettingItem
                  icon={Database}
                  label="Reset System"
                  description="Clear all data and reset to defaults"
                />
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
