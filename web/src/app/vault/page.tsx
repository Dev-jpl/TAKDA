"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tray, FileText, LinkSimple, ImageSquare, Microphone,
  CheckCircle, X, Sparkle, Plus, Trash, ArrowLeft,
  FloppyDisk, MagnifyingGlass, ArrowSquareOut,
} from "@phosphor-icons/react";
import { supabase } from "@/services/supabase";
import { API_URL } from "@/services/apiConfig";
import { useUserProfile } from "@/contexts/UserProfileContext";

// ── Types & Constants ─────────────────────────────────────────────────────────

interface VaultItem {
  id: string;
  content: string;
  content_type: string;
  status: string;
  aly_suggestion?: {
    reason?: string;
    hub_id?: string;
    module?: string;
  };
  created_at: string;
}

const TABS = ["Inbox", "Suggested", "Archive"] as const;
type Tab = (typeof TABS)[number];

const TAB_STATUS: Record<Tab, string | null> = {
  Inbox: "unprocessed",
  Suggested: "suggested",
  Archive: null,
};

const TYPE_FILTERS = [
  { id: "all",   label: "All",    icon: Tray        },
  { id: "text",  label: "Text",   icon: FileText    },
  { id: "link",  label: "Links",  icon: LinkSimple  },
  { id: "photo", label: "Images", icon: ImageSquare },
  { id: "voice", label: "Voice",  icon: Microphone  },
];

const TYPE_ICONS: Record<string, React.ElementType> = {
  text:  FileText,
  link:  LinkSimple,
  photo: ImageSquare,
  voice: Microphone,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

async function fetchVault(userId: string, status: string | null): Promise<VaultItem[]> {
  const url = new URL(`${API_URL}/vault/${userId}`);
  if (status) url.searchParams.set("status", status);
  const res = await fetch(url.toString());
  if (!res.ok) return [];
  return res.json();
}

async function acceptSuggestion(itemId: string, hubId?: string, module?: string) {
  await fetch(`${API_URL}/vault/${itemId}/accept`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hub_id: hubId, module }),
  });
}

async function dismissSuggestion(itemId: string) {
  await fetch(`${API_URL}/vault/${itemId}/dismiss`, { method: "PATCH" });
}

async function createVaultItem(userId: string, content: string, type = "text") {
  const res = await fetch(`${API_URL}/vault/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, content, content_type: type }),
  });
  if (!res.ok) throw new Error("Failed to create item");
  return res.json();
}

async function updateVaultItem(itemId: string, content: string) {
  const res = await fetch(`${API_URL}/vault/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error("Failed to update item");
  return res.json();
}

async function deleteVaultItem(itemId: string) {
  await fetch(`${API_URL}/vault/${itemId}`, { method: "DELETE" });
}

// ── VaultCard ─────────────────────────────────────────────────────────────────

function VaultCard({
  item,
  isSelected,
  onSelect,
  onDelete,
}: {
  item: VaultItem;
  isSelected?: boolean;
  onSelect: (item: VaultItem) => void;
  onDelete: (id: string) => void;
}) {
  const { assistantName } = useUserProfile();
  const Icon = TYPE_ICONS[item.content_type] || FileText;
  const isSuggested = item.status === "suggested";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onSelect(item)}
      className={`relative p-3.5 rounded-xl border transition-all cursor-pointer group ${
        isSelected
          ? "bg-background-secondary border-modules-annotate/40 ring-1 ring-modules-annotate/10"
          : "bg-background-primary border-border-primary hover:bg-background-secondary hover:border-border-primary"
      }`}
    >
      {/* Left accent bar when selected */}
      {isSelected && (
        <div className="absolute left-0 top-0 h-full w-0.5 bg-modules-annotate rounded-l-xl" />
      )}

      <div className="flex gap-3 pl-1">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
          isSelected
            ? "bg-modules-annotate/15 text-modules-annotate"
            : "bg-background-tertiary text-text-tertiary group-hover:text-text-secondary"
        }`}>
          <Icon size={15} weight={isSelected ? "bold" : "regular"} />
        </div>

        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
              {timeAgo(item.created_at)}
            </span>
            {isSuggested && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-modules-aly/10 border border-modules-aly/20 text-[9px] font-bold text-modules-aly uppercase tracking-widest">
                <Sparkle size={8} weight="fill" />
                {assistantName}
              </span>
            )}
          </div>
          <p className={`text-sm leading-snug truncate ${
            isSelected ? "text-text-primary font-semibold" : "text-text-secondary"
          }`}>
            {item.content}
          </p>
        </div>
      </div>

      <button
        onClick={e => { e.stopPropagation(); onDelete(item.id); }}
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-text-tertiary hover:text-red-400 transition-all"
      >
        <Trash size={14} />
      </button>
    </motion.div>
  );
}

// ── VaultEditor ───────────────────────────────────────────────────────────────

function VaultEditor({
  item,
  isNew = false,
  onSave,
  onAccept,
  onDismiss,
  onClose,
}: {
  item: Partial<VaultItem>;
  isNew?: boolean;
  onSave: (content: string) => Promise<void>;
  onAccept: (item: VaultItem) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  const { assistantName } = useUserProfile();
  const [content, setContent]               = useState(item.content || "");
  const [saving, setSaving]                 = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(true);

  useEffect(() => { setContent(item.content || ""); }, [item]);

  const handleSave = async () => {
    if (!content.trim() || content === item.content) return;
    setSaving(true);
    try { await onSave(content); }
    catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const Icon = TYPE_ICONS[item.content_type || "text"] || FileText;
  const isDirty = content.trim() && content !== item.content;

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Editor pane ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full bg-background-primary">

        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border-primary shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg hover:bg-background-secondary text-text-tertiary transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-modules-annotate"><Icon size={13} weight="bold" /></span>
              <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
                {isNew ? "New Capture" : `Captured ${new Date(item.created_at!).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isNew && item.aly_suggestion && (
              <button
                onClick={() => setShowSuggestion(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  showSuggestion
                    ? "bg-modules-aly/10 border-modules-aly/20 text-modules-aly"
                    : "border-border-primary text-text-tertiary hover:bg-background-secondary hover:text-text-primary"
                }`}
              >
                <Sparkle size={12} weight={showSuggestion ? "fill" : "regular"} />
                {assistantName}
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-modules-annotate text-white text-xs font-bold disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              <FloppyDisk size={13} weight="bold" />
              {saving ? "Saving…" : isNew ? "Create" : "Save"}
            </button>
          </div>
        </header>

        {/* Text area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8 min-h-full flex flex-col">
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              className="flex-1 w-full max-w-2xl mx-auto block bg-transparent text-base font-medium text-text-primary placeholder:text-text-tertiary outline-none resize-none leading-relaxed min-h-64"
              placeholder={isNew ? "Start capturing…" : "Refine your capture…"}
              spellCheck={false}
              autoFocus
            />
          </div>
        </div>
      </div>

      {/* ── Aly suggestion sidepanel ──────────────────────────────────── */}
      <AnimatePresence>
        {showSuggestion && !isNew && item.aly_suggestion && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-l border-border-primary bg-background-secondary flex flex-col overflow-hidden h-full shrink-0"
          >
            {/* Sidepanel header */}
            <div className="px-5 py-4 border-b border-border-primary flex items-center gap-2.5 relative">
              <div className="absolute left-0 top-0 h-full w-0.5 bg-modules-aly" />
              <Sparkle size={13} weight="fill" className="text-modules-aly" />
              <h3 className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">{assistantName} Suggestion</h3>
            </div>

            <div className="flex-1 p-5 overflow-y-auto space-y-5">

              {/* Reason */}
              <div>
                <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-2 px-0.5">Logic</p>
                <div className="relative p-3.5 bg-background-primary border border-border-primary rounded-xl overflow-hidden">
                  <div className="absolute left-0 top-0 h-full w-0.5 bg-modules-aly/60" />
                  <p className="text-sm text-text-secondary leading-relaxed italic pl-1">
                    &quot;{item.aly_suggestion.reason}&quot;
                  </p>
                </div>
              </div>

              {/* Destination */}
              <div>
                <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-2 px-0.5">Destination</p>
                <div className="p-3.5 bg-background-primary border border-border-primary rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-text-primary">{item.aly_suggestion.module}</p>
                    <p className="text-[10px] text-text-tertiary mt-0.5">Automatic hub routing</p>
                  </div>
                  <ArrowSquareOut size={16} className="text-text-tertiary" />
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => onAccept(item as VaultItem)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-modules-aly text-white text-xs font-bold hover:opacity-90 transition-opacity"
                >
                  <CheckCircle size={15} weight="bold" />
                  Accept & File
                </button>
                <button
                  onClick={() => onDismiss(item.id!)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border-primary text-text-tertiary text-xs font-bold hover:bg-background-primary hover:text-text-primary transition-all"
                >
                  <X size={15} weight="bold" />
                  Dismiss
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function VaultPage() {
  const { assistantName } = useUserProfile();
  const [userId,      setUserId]      = useState<string | null>(null);
  const [activeTab,   setActiveTab]   = useState<Tab>("Inbox");
  const [activeType,  setActiveType]  = useState("all");
  const [items,       setItems]       = useState<VaultItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [selectedId,  setSelectedId]  = useState<string | "new" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const loadItems = useCallback(
    async (uid: string, autoSelectId?: string) => {
      setLoading(true);
      try {
        const data = await fetchVault(uid, TAB_STATUS[activeTab]);
        setItems(data || []);
        if (autoSelectId) setSelectedId(autoSelectId);
      } catch { setItems([]); }
      finally { setLoading(false); }
    },
    [activeTab]
  );

  useEffect(() => {
    if (userId) loadItems(userId);
  }, [userId, activeTab, loadItems]);

  const filteredItems = useMemo(() => items.filter(i => {
    const matchesType   = activeType === "all" || i.content_type === activeType;
    const matchesSearch = i.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  }), [items, activeType, searchQuery]);

  async function handleCreate(content: string) {
    if (!userId) return;
    const newItem = await createVaultItem(userId, content);
    await loadItems(userId, newItem.id);
  }

  async function handleUpdate(content: string) {
    if (!selectedId || selectedId === "new") return;
    await updateVaultItem(selectedId, content);
    setItems(prev => prev.map(i => i.id === selectedId ? { ...i, content } : i));
  }

  async function handleAccept(item: VaultItem) {
    await acceptSuggestion(item.id, item.aly_suggestion?.hub_id, item.aly_suggestion?.module);
    if (userId) loadItems(userId);
    setSelectedId(null);
  }

  async function handleDismiss(id: string) {
    await dismissSuggestion(id);
    if (userId) loadItems(userId);
    setSelectedId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this capture forever?")) return;
    await deleteVaultItem(id);
    setItems(prev => prev.filter(i => i.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  const selectedItem = useMemo(() => {
    if (selectedId === "new") return { content: "" };
    return items.find(i => i.id === selectedId) || null;
  }, [items, selectedId]);

  return (
    <div className="flex h-screen overflow-hidden bg-background-primary">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-80 lg:w-96 border-r border-border-primary flex flex-col bg-background-secondary h-full overflow-hidden shrink-0">

        {/* Header */}
        <div className="px-5 py-5 border-b border-border-primary space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
                <Tray size={20} weight="duotone" className="text-modules-annotate" />
                Vault
              </h1>
              <p className="text-text-tertiary text-xs mt-0.5">Your capture repository.</p>
            </div>
            <button
              onClick={() => setSelectedId("new")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                selectedId === "new"
                  ? "bg-modules-annotate/10 border-modules-annotate/30 text-modules-annotate"
                  : "border-border-primary text-text-tertiary hover:bg-background-tertiary hover:text-text-primary"
              }`}
            >
              <Plus size={13} weight="bold" />
              New
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-background-tertiary border border-border-primary rounded-xl">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSelectedId(null); }}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                  activeTab === tab
                    ? "bg-modules-annotate/10 text-modules-annotate border border-modules-annotate/20"
                    : "text-text-tertiary hover:text-text-secondary"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <MagnifyingGlass size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              placeholder="Search captures…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-background-tertiary border border-border-primary rounded-xl pl-8 pr-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-modules-annotate/40 placeholder:text-text-tertiary transition-colors"
            />
          </div>
        </div>

        {/* Type filter chips */}
        <div className="flex items-center gap-1.5 px-5 py-3 overflow-x-auto border-b border-border-primary shrink-0">
          {TYPE_FILTERS.map(filter => {
            const Icon   = filter.icon;
            const active = activeType === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setActiveType(filter.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all shrink-0 ${
                  active
                    ? "bg-modules-annotate/10 border-modules-annotate/30 text-modules-annotate"
                    : "border-border-primary text-text-tertiary hover:bg-background-tertiary hover:text-text-primary"
                }`}
              >
                <Icon size={12} weight={active ? "bold" : "regular"} />
                {filter.label}
              </button>
            );
          })}
        </div>

        {/* Item list */}
        <div className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {loading && items.length === 0 && (
            <div className="space-y-2 p-1">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-background-tertiary rounded-xl animate-pulse" />
              ))}
            </div>
          )}

          {!loading && filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Tray size={32} className="text-text-tertiary/20 mb-3" />
              <p className="text-xs text-text-tertiary">
                {searchQuery ? "No matches found" : "Nothing here yet"}
              </p>
            </div>
          )}

          {filteredItems.map(item => (
            <VaultCard
              key={item.id}
              item={item}
              isSelected={selectedId === item.id}
              onSelect={i => setSelectedId(i.id)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </aside>

      {/* ── Main editor area ─────────────────────────────────────────────── */}
      <main className="flex-1 relative h-full bg-background-primary">
        {selectedItem ? (
          <VaultEditor
            key={selectedId}
            item={selectedItem}
            isNew={selectedId === "new"}
            onSave={selectedId === "new" ? handleCreate : handleUpdate}
            onAccept={handleAccept}
            onDismiss={handleDismiss}
            onClose={() => setSelectedId(null)}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full flex flex-col items-center justify-center text-center p-12 gap-4"
          >
            <Tray size={36} className="text-text-tertiary/20" />
            <div>
              <p className="text-base font-bold text-text-primary">Select a capture</p>
              <p className="text-sm text-text-tertiary mt-1 max-w-xs mx-auto leading-relaxed">
                Pick an item from the inbox to view or edit, or create a new capture.
              </p>
            </div>
            <button
              onClick={() => setSelectedId("new")}
              className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-modules-annotate/10 border border-modules-annotate/20 text-modules-annotate text-xs font-bold hover:bg-modules-annotate/20 transition-all"
            >
              <Plus size={13} weight="bold" />
              New Capture
            </button>
          </motion.div>
        )}
      </main>
    </div>
  );
}
