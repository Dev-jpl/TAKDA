"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tray, FileText, LinkSimple, ImageSquare, Microphone,
  CheckCircle, X, Sparkle, Plus, Trash, ArrowLeft,
  FloppyDisk, MagnifyingGlass, Funnel, DotsThreeVertical,
  ArrowSquareOut,
} from "@phosphor-icons/react";
import { supabase } from "@/services/supabase";
import { API_URL } from "@/services/apiConfig";

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
  { id: "all", label: "All", icon: Tray },
  { id: "text", label: "Text", icon: FileText },
  { id: "link", label: "Links", icon: LinkSimple },
  { id: "photo", label: "Images", icon: ImageSquare },
  { id: "voice", label: "Voice", icon: Microphone },
];

const TYPE_ICONS: Record<string, React.ElementType> = {
  text: FileText,
  link: LinkSimple,
  photo: ImageSquare,
  voice: Microphone,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
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

// ── Components ────────────────────────────────────────────────────────────────

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
  const Icon = TYPE_ICONS[item.content_type] || FileText;
  const isSuggested = item.status === "suggested";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onSelect(item)}
      className={`relative p-4 rounded-2xl border transition-all cursor-pointer group mb-2 ${
        isSelected 
          ? "bg-background-secondary border-modules-annotate/50 shadow-lg shadow-modules-annotate/5 ring-1 ring-modules-annotate/10" 
          : "bg-transparent border-transparent hover:bg-background-tertiary/40 hover:border-border-primary"
      }`}
    >
      <div className="flex gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
          isSelected ? "bg-modules-annotate text-white" : "bg-background-tertiary text-text-tertiary group-hover:text-text-secondary"
        }`}>
          <Icon size={20} weight={isSelected ? "bold" : "light"} />
        </div>
        
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-text-tertiary tabular-nums">
              {timeAgo(item.created_at)}
            </span>
            {isSuggested && (
              <div className="px-1.5 py-0.5 rounded-full bg-modules-aly/10 border border-modules-aly/20">
                <Sparkle size={10} weight="fill" className="text-modules-aly" />
              </div>
            )}
          </div>
          <p className={`text-sm leading-relaxed truncate ${isSelected ? "text-text-primary font-bold" : "text-text-secondary font-medium"}`}>
            {item.content}
          </p>
        </div>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
        className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-500/10 text-text-tertiary hover:text-red-500 transition-all"
      >
        <Trash size={16} />
      </button>

      {isSelected && (
        <motion.div 
          layoutId="active-indicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-modules-annotate rounded-r-full" 
        />
      )}
    </motion.div>
  );
}

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
  const [content, setContent] = useState(item.content || "");
  const [saving, setSaving] = useState(false);
  const [showIntelligence, setShowIntelligence] = useState(true);

  useEffect(() => {
    setContent(item.content || "");
  }, [item]);

  const handleSave = async () => {
    if (!content.trim() || content === item.content) return;
    setSaving(true);
    try { await onSave(content); }
    catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const Icon = TYPE_ICONS[item.content_type || "text"] || FileText;

  return (
    <div className="flex h-full overflow-hidden bg-background-primary">
      {/* Editor Main */}
      <div className="flex-1 flex flex-col h-full bg-background-primary">
        <header className="flex items-center justify-between p-8 border-b border-border-primary shrink-0">
          <div className="flex items-center gap-6">
            <button onClick={onClose} className="lg:hidden p-2 rounded-xl hover:bg-background-secondary text-text-tertiary"><ArrowLeft size={20} /></button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-modules-annotate"><Icon size={14} weight="bold" /></span>
                <h2 className="text-xs font-black text-text-primary uppercase tracking-[0.2em]">
                  {isNew ? "New Capture" : "Refinement Studio"}
                </h2>
              </div>
              <p className="text-[10px] font-bold text-text-tertiary mt-1 uppercase tracking-widest tabular-nums">
                {isNew ? "Drafting Insight" : `Captured ${new Date(item.created_at!).toLocaleString()}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <button
              onClick={handleSave}
              disabled={saving || !content.trim() || content === item.content}
              className="px-6 py-2.5 rounded-2xl bg-modules-annotate text-white text-xs font-black shadow-xl shadow-modules-annotate/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:scale-100 transition-all flex items-center gap-2"
            >
              {saving ? <DotsThreeVertical size={16} className="animate-pulse" /> : <FloppyDisk size={16} weight="bold" />}
              {isNew ? "Create" : "Sync"}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 lg:p-20 scrollbar-hide">
          <div className="max-w-3xl mx-auto w-full h-full flex flex-col">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full flex-1 bg-transparent text-xl font-medium text-text-primary placeholder:text-text-tertiary outline-none resize-none leading-relaxed"
              placeholder={isNew ? "Start typing to capture this moment..." : "Refine your capture..."}
              spellCheck={false}
              autoFocus
            />
          </div>
        </div>

        {/* Floating Action Bar */}
        {!isNew && (
          <div className="p-8 shrink-0">
            <div className="max-w-3xl mx-auto w-full flex items-center justify-between p-4 bg-background-secondary/80 backdrop-blur-xl border border-border-primary rounded-[32px] shadow-2xl">
              <div className="flex items-center gap-2 px-4 border-r border-border-primary/50 mr-2">
                <Tray size={18} className="text-text-tertiary" />
                <span className="text-xs font-bold text-text-tertiary uppercase tracking-widest">Vaulted</span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowIntelligence(!showIntelligence)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-[24px] text-xs font-black transition-all ${
                    showIntelligence ? "bg-modules-aly/10 text-modules-aly border border-modules-aly/20" : "text-text-tertiary hover:bg-background-tertiary"
                  }`}
                >
                  <Sparkle size={16} weight={showIntelligence ? "fill" : "bold"} />
                  Aly
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Intelligence Sidepanel */}
      <AnimatePresence>
        {showIntelligence && !isNew && item.aly_suggestion && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 380, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-l border-border-primary bg-background-secondary/10 flex flex-col overflow-hidden h-full shrink-0"
          >
            <header className="p-8 border-b border-border-primary bg-background-tertiary/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-modules-aly/10 text-modules-aly">
                  <Sparkle size={20} weight="fill" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-text-primary uppercase tracking-[0.2em]">Aly Intelligence</h3>
                  <p className="text-[10px] font-bold text-text-tertiary mt-1 uppercase tracking-widest">Active Suggestion</p>
                </div>
              </div>
            </header>

            <div className="flex-1 p-8 overflow-y-auto space-y-8">
              <div className="space-y-4">
                <h4 className="text-[11px] font-black text-text-tertiary uppercase tracking-widest px-1">Logic</h4>
                <div className="p-6 bg-background-tertiary/40 border border-border-primary rounded-[28px] relative group overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-modules-aly/40 group-hover:bg-modules-aly transition-colors" />
                  <p className="text-sm font-medium text-text-primary leading-relaxed italic">
                    &quot;{item.aly_suggestion.reason}&quot;
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[11px] font-black text-text-tertiary uppercase tracking-widest px-1">Destination</h4>
                <div className="p-6 bg-background-tertiary/40 border border-border-primary rounded-[28px] flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-text-primary uppercase mb-1 tracking-tight">{item.aly_suggestion.module}</p>
                    <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-tighter">Automatic Hub Routing</p>
                  </div>
                  <ArrowSquareOut size={24} className="text-modules-aly opacity-40" />
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <button
                  onClick={() => onAccept(item as VaultItem)}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-[24px] bg-modules-aly text-white text-sm font-black shadow-xl shadow-modules-aly/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <CheckCircle size={20} weight="bold" />
                  Execute Suggestion
                </button>
                <button
                  onClick={() => onDismiss(item.id!)}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-[24px] border border-border-primary text-text-tertiary text-sm font-black hover:bg-background-tertiary transition-all"
                >
                  <X size={20} weight="bold" />
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
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Inbox");
  const [activeType, setActiveType] = useState("all");
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | "new" | null>(null);
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

  const filteredItems = useMemo(() => {
    return items.filter(i => {
      const matchesType = activeType === "all" || i.content_type === activeType;
      const matchesSearch = i.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [items, activeType, searchQuery]);

  const handleCreate = async (content: string) => {
    if (!userId) return;
    const newItem = await createVaultItem(userId, content);
    await loadItems(userId, newItem.id);
  };

  const handleUpdate = async (content: string) => {
    if (!selectedId || selectedId === "new") return;
    await updateVaultItem(selectedId, content);
    setItems(prev => prev.map(i => (i.id === selectedId ? { ...i, content } : i)));
  };

  const handleAccept = async (item: VaultItem) => {
    await acceptSuggestion(item.id, item.aly_suggestion?.hub_id, item.aly_suggestion?.module);
    if (userId) loadItems(userId);
    setSelectedId(null);
  };

  const handleDismiss = async (id: string) => {
    await dismissSuggestion(id);
    if (userId) loadItems(userId);
    setSelectedId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this capture forever?")) return;
    await deleteVaultItem(id);
    setItems(prev => prev.filter(i => i.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const selectedItem = useMemo(() => {
    if (selectedId === "new") return { content: "" };
    return items.find(i => i.id === selectedId) || null;
  }, [items, selectedId]);

  return (
    <div className="flex h-screen overflow-hidden bg-background-primary">
      {/* Sidebar: The Inbox */}
      <aside className="w-[380px] lg:w-[440px] border-r border-border-primary flex flex-col bg-background-secondary/10 h-full overflow-hidden shrink-0">
        <header className="p-8 border-b border-border-primary space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-text-primary flex items-center gap-3">
                <Tray size={28} weight="duotone" className="text-modules-annotate" />
                Vault
              </h1>
              <p className="text-[10px] font-bold text-text-tertiary mt-1 uppercase tracking-[0.2em]">Capture Repository</p>
            </div>
            <button
              onClick={() => setSelectedId("new")}
              className={`p-3 rounded-2xl transition-all shadow-xl hover:scale-110 active:scale-95 ${
                selectedId === "new" ? "bg-modules-annotate text-white shadow-modules-annotate/30" : "bg-modules-annotate/10 text-modules-annotate hover:bg-modules-annotate/20"
              }`}
            >
              <Plus size={20} weight="bold" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex p-1 bg-background-tertiary/50 border border-border-primary rounded-[20px]">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2.5 rounded-[16px] text-[11px] font-black uppercase tracking-widest transition-all ${
                    activeTab === tab ? "bg-white text-black shadow-lg" : "text-text-tertiary hover:text-text-secondary"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="relative group">
              <MagnifyingGlass size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-modules-annotate transition-colors" />
              <input 
                placeholder="Search captures..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-background-tertiary/40 border border-border-primary rounded-[20px] pl-12 pr-4 py-3 text-sm text-text-primary focus:outline-none focus:border-modules-annotate/50 transition-all placeholder:text-text-tertiary border-dashed" 
              />
            </div>
          </div>
        </header>

        {/* Type Filter Bar */}
        <div className="flex items-center gap-2 p-4 px-8 overflow-x-auto scrollbar-hide shrink-0 border-b border-border-primary/50">
          {TYPE_FILTERS.map(filter => {
            const Icon = filter.icon;
            const active = activeType === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setActiveType(filter.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0 ${
                  active ? "bg-modules-annotate text-white border-modules-annotate shadow-md" : "border-border-primary text-text-tertiary hover:border-text-tertiary"
                }`}
              >
                <Icon size={14} weight={active ? "bold" : "regular"} />
                {filter.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 px-4 py-4 space-y-1 overflow-y-auto scrollbar-hide">
          {filteredItems.map(item => (
            <VaultCard
              key={item.id}
              item={item}
              isSelected={selectedId === item.id}
              onSelect={i => setSelectedId(i.id)}
              onDelete={handleDelete}
            />
          ))}
          
          {loading && items.length === 0 && (
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-20 bg-background-tertiary/40 rounded-2xl animate-pulse" />
              ))}
            </div>
          )}

          {!loading && filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-30 grayscale gap-4">
              <Tray size={48} weight="thin" />
              <p className="text-xs font-black uppercase tracking-[0.3em]">{searchQuery ? "No matches" : "Empty Vault"}</p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Studio Area */}
      <main className="flex-1 relative h-full">
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
            className="h-full flex flex-col items-center justify-center text-center p-12 gap-6 bg-background-primary"
          >
            <div className="w-24 h-24 rounded-[40px] bg-background-tertiary/20 border-2 border-dashed border-border-primary flex items-center justify-center">
              <Tray size={40} className="text-text-tertiary opacity-30" />
            </div>
            <div>
              <p className="text-xl font-bold text-text-primary tracking-tight">Select a capture to refine</p>
              <p className="text-sm text-text-tertiary mt-2 max-w-xs mx-auto leading-relaxed">
                Pick an item from your Inbox to start processing or creating new intelligence.
              </p>
            </div>
            <button
               onClick={() => setSelectedId("new")}
               className="mt-4 px-8 py-3 rounded-2xl bg-modules-annotate/10 text-modules-annotate text-xs font-black tracking-widest uppercase hover:bg-modules-annotate/20 transition-all border border-modules-annotate/20"
            >
              New Capture
            </button>
          </motion.div>
        )}
      </main>
    </div>
  );
}
