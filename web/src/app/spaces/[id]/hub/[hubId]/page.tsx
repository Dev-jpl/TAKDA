"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  SparkleIcon,
  PlusIcon,
  CheckCircleIcon,
  FileTextIcon,
  PencilSimpleIcon,
  PaperPlaneRightIcon,
  HandbagIcon,
  ForkKnifeIcon,
  CurrencyDollarIcon,
  PuzzlePieceIcon,
  XIcon,
  GitBranchIcon,
  SquaresFourIcon,
} from '@phosphor-icons/react';
import { supabase } from '@/services/supabase';
import { spacesService, Space } from '@/services/spaces.service';
import { hubsService, Hub } from '@/services/hubs.service';
import { trackService, Task } from '@/services/track.service';
import { knowledgeService, KnowledgeDocument } from '@/services/knowledge.service';
import { annotateService, Annotation } from '@/services/annotate.service';
import { deliverService, Delivery, DeliveryCreate } from '@/services/deliver.service';
import { IconResolver } from '@/components/common/IconResolver';
import { MissionTable } from '@/components/hub/MissionTable';
import { MissionModal } from '@/components/hub/MissionModal';
import { VaultTerminal } from '@/components/knowledge/VaultTerminal';
import { AnnotateTerminal } from '@/components/hub/AnnotateTerminal';
import { DeliverTerminal } from '@/components/hub/DeliverTerminal';
import { listAddons, HubAddon } from '@/services/addons.service';
import { CalorieCounterAddon } from '@/components/addons/CalorieCounterAddon';
import { ExpenseTrackerAddon } from '@/components/addons/ExpenseTrackerAddon';

export default function HubDetailPage() {
  const params  = useParams();
  const router  = useRouter();
  const spaceId = params.id as string;
  const hubId   = params.hubId as string;

  const [space,       setSpace]       = useState<Space | null>(null);
  const [hub,         setHub]         = useState<Hub | null>(null);
  const [tasks,       setTasks]       = useState<Task[]>([]);
  const [documents,   setDocuments]   = useState<KnowledgeDocument[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [deliveries,  setDeliveries]  = useState<Delivery[]>([]);
  const [addons,        setAddons]        = useState<HubAddon[]>([]);
  const [userId,        setUserId]        = useState<string | null>(null);
  const [activeAddon,   setActiveAddon]   = useState<string | null>(null);
  const [showModulePicker, setShowModulePicker] = useState(false);
  const [installingModule, setInstallingModule] = useState<string | null>(null);

  const [loading,            setLoading]            = useState(true);
  const [missionsLoading,    setMissionsLoading]    = useState(false);
  const [docsLoading,        setDocsLoading]        = useState(false);
  const [notesLoading,       setNotesLoading]       = useState(false);
  const [deliveriesLoading,  setDeliveriesLoading]  = useState(false);

  const [isMissionModalOpen, setMissionModalOpen] = useState(false);

  const loadMissions = useCallback(async (hId: string) => {
    setMissionsLoading(true);
    try   { setTasks(await trackService.getTasks(hId)); }
    catch  (err) { console.error(err); }
    finally { setMissionsLoading(false); }
  }, []);

  const loadDocuments = useCallback(async (hId: string) => {
    setDocsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setDocuments(await knowledgeService.getDocuments(user.id, hId));
    } catch (err) { console.error(err); }
    finally { setDocsLoading(false); }
  }, []);

  const loadAnnotations = useCallback(async (hId: string) => {
    setNotesLoading(true);
    try   { setAnnotations(await annotateService.getAnnotations(hId)); }
    catch  (err) { console.error(err); }
    finally { setNotesLoading(false); }
  }, []);

  const loadDeliveries = useCallback(async (hId: string) => {
    setDeliveriesLoading(true);
    try   { setDeliveries(await deliverService.getDeliveries(hId)); }
    catch  (err) { console.error(err); }
    finally { setDeliveriesLoading(false); }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated.');
      setUserId(user.id);
      const [spaceData, hubData, addonData] = await Promise.all([
        spacesService.getSpaces(user.id).then(list => list.find(s => s.id === spaceId)),
        hubsService.getHubsBySpace(spaceId).then(list => list.find(h => h.id === hubId)),
        listAddons(hubId),
      ]);
      if (spaceData) setSpace(spaceData);
      if (hubData)   setHub(hubData);
      setAddons(addonData);
      // Auto-select first addon so it renders immediately
      if (addonData.length === 1) setActiveAddon(addonData[0].type);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [spaceId, hubId]);

  useEffect(() => { if (spaceId && hubId) loadData(); }, [spaceId, hubId, loadData]);

  useEffect(() => {
    if (hub?.id) {
      loadMissions(hub.id);
      loadDocuments(hub.id);
      loadAnnotations(hub.id);
      loadDeliveries(hub.id);
    }
  }, [hub?.id, loadMissions, loadDocuments, loadAnnotations, loadDeliveries]);

  async function handleAddMission(task: Partial<Task>) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const t = await trackService.createTask({ ...task, hub_id: hubId, user_id: user.id });
      setTasks(prev => [t, ...prev]);
    } catch (err) { console.error(err); }
  }

  async function handleUploadPDF(file: File) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const doc = await knowledgeService.uploadPDF(user.id, hubId, file);
      setDocuments(prev => [doc, ...prev]);
    } catch (err) { console.error(err); }
  }

  async function handleUploadURL(url: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const doc = await knowledgeService.uploadURL(user.id, hubId, url);
      setDocuments(prev => [doc, ...prev]);
    } catch (err) { console.error(err); }
  }

  async function handleDeleteDoc(docId: string) {
    if (!confirm('Delete this resource?')) return;
    try {
      await knowledgeService.deleteDocument(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (err) { console.error(err); }
  }

  async function handleCreateNote(data: { content: string; category: string; documentId?: string | null }) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const n = await annotateService.createAnnotation({
        userId: user.id, hubId, documentId: data.documentId, content: data.content, category: data.category,
      });
      setAnnotations(prev => [n, ...prev]);
    } catch (err) { console.error(err); }
  }

  async function handleDeleteNote(id: string) {
    if (!confirm('Delete this note?')) return;
    try {
      await annotateService.deleteAnnotation(id);
      setAnnotations(prev => prev.filter(n => n.id !== id));
    } catch (err) { console.error(err); }
  }

  async function handleCreateDelivery(data: Partial<DeliveryCreate>) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const d = await deliverService.createDelivery({ ...data, hub_id: hubId, user_id: user.id } as DeliveryCreate);
      setDeliveries(prev => [d, ...prev]);
    } catch (err) { console.error(err); }
  }

  async function handleDeleteDelivery(id: string) {
    if (!confirm('Delete this outcome?')) return;
    try {
      await deliverService.deleteDelivery(id);
      setDeliveries(prev => prev.filter(d => d.id !== id));
    } catch (err) { console.error(err); }
  }

  async function handleStatusChange(taskId: string, status: Task['status']) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
    try { await trackService.updateTask(taskId, { status }); }
    catch { loadMissions(hubId); }
  }

  async function handleDeleteTask(taskId: string) {
    if (!confirm('Delete this task?')) return;
    setTasks(prev => prev.filter(t => t.id !== taskId));
    try { await trackService.deleteTask(taskId); }
    catch { loadMissions(hubId); }
  }

  async function handleInstallModule(moduleId: string) {
    if (!userId || !hub) return;
    setInstallingModule(moduleId);
    try {
      const isCoreModule = ['track', 'annotate', 'knowledge', 'deliver', 'automate'].includes(moduleId);
      if (isCoreModule) {
        await hubsService.addModule(hub.id, moduleId);
        // Optimistically update hub_modules
        setHub(prev => prev ? {
          ...prev,
          hub_modules: [
            ...(prev.hub_modules ?? []),
            { id: `temp-${moduleId}`, hub_id: hub.id, module: moduleId, is_enabled: true, order_index: (prev.hub_modules?.length ?? 0) },
          ],
        } : prev);
      } else {
        const { installAddon } = await import('@/services/addons.service');
        const newAddon = await installAddon(hub.id, userId, moduleId as any);
        setAddons(prev => [...prev, newAddon]);
        setActiveAddon(moduleId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setInstallingModule(null);
    }
  }

  async function handleRemoveModule(moduleId: string) {
    if (!hub) return;
    const isCoreModule = ['track', 'annotate', 'knowledge', 'deliver', 'automate'].includes(moduleId);
    if (isCoreModule) {
      await hubsService.removeModule(hub.id, moduleId);
      setHub(prev => prev ? {
        ...prev,
        hub_modules: (prev.hub_modules ?? []).map(m =>
          m.module === moduleId ? { ...m, is_enabled: false } : m
        ),
      } : prev);
      if (activeAddon === moduleId) setActiveAddon(null);
    } else {
      const addon = addons.find(a => a.type === moduleId);
      if (addon) {
        const { uninstallAddon } = await import('@/services/addons.service');
        await uninstallAddon(addon.id);
        setAddons(prev => prev.filter(a => a.id !== addon.id));
        if (activeAddon === moduleId) setActiveAddon(null);
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
          <SparkleIcon size={28} color="var(--modules-aly)" />
        </motion.div>
      </div>
    );
  }

  if (!hub || !space) return <div className="p-20 text-center text-text-tertiary">Hub not found.</div>;

  // Helper: is a core module enabled for this hub?
  const hasModule = (key: string) =>
    (hub.hub_modules ?? []).some(m => m.module === key && m.is_enabled);

  const hasTrack     = hasModule('track');
  const hasAnnotate  = hasModule('annotate');
  const hasKnowledge = hasModule('knowledge');
  const hasDeliver   = hasModule('deliver');
  const hasCoreModules = hasTrack || hasAnnotate || hasKnowledge || hasDeliver;
  const hasAnything    = hasCoreModules || addons.length > 0;

  // Full module catalog for the picker
  const MODULE_CATALOG = [
    { id: 'track',           label: 'Tasks',          description: 'To-dos and missions',       icon: CheckCircleIcon,    color: 'var(--modules-track)',     group: 'core' as const },
    { id: 'annotate',        label: 'Notes',          description: 'Write and organize notes',  icon: PencilSimpleIcon,   color: 'var(--modules-aly)',       group: 'core' as const },
    { id: 'knowledge',       label: 'Resources',      description: 'Upload PDFs and links',     icon: FileTextIcon,       color: 'var(--modules-knowledge)', group: 'core' as const },
    { id: 'deliver',         label: 'Outcomes',       description: 'Deliverables and goals',    icon: PaperPlaneRightIcon,color: 'var(--modules-deliver)',   group: 'core' as const },
    { id: 'automate',        label: 'Automations',    description: 'Connect n8n workflows',     icon: GitBranchIcon,      color: '#a78bfa',                  group: 'core' as const },
    { id: 'calorie_counter', label: 'Calorie Counter',description: 'Log food and calories',     icon: ForkKnifeIcon,      color: '#22c55e',                  group: 'data' as const },
    { id: 'expense_tracker', label: 'Expense Tracker',description: 'Log spending by category',  icon: CurrencyDollarIcon, color: '#f59e0b',                  group: 'data' as const },
  ];

  function isInstalled(id: string) {
    const coreIds = ['track', 'annotate', 'knowledge', 'deliver', 'automate'];
    if (coreIds.includes(id)) return hasModule(id);
    return addons.some(a => a.type === id);
  }

  return (
    <main className="p-6 lg:p-12 flex flex-col gap-8">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center border shrink-0"
              style={{ backgroundColor: `${hub.color}15`, borderColor: `${hub.color}30` }}
            >
              <IconResolver icon={hub.icon || 'Circle'} size={22} color={hub.color} weight="duotone" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-text-primary">{hub.name}</h1>
                <span
                  className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest border"
                  style={{ color: space.color, borderColor: `${space.color}40`, backgroundColor: `${space.color}10` }}
                >
                  {space.name}
                </span>
              </div>
              <p className="text-text-tertiary mt-0.5 text-xs">
                {hub.description || 'Manage tasks, resources, and insights for this hub.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hasTrack && (
              <button
                onClick={() => setMissionModalOpen(true)}
                className="flex items-center gap-2 bg-modules-track/10 border border-modules-track/20 text-modules-track px-4 py-2 rounded-xl font-bold text-xs hover:bg-modules-track/20 transition-all"
              >
                <PlusIcon size={13} weight="bold" />
                New Task
              </button>
            )}
            <button
              onClick={() => setShowModulePicker(true)}
              className="flex items-center gap-2 border border-border-primary text-text-tertiary hover:text-text-primary hover:border-border-primary/60 px-4 py-2 rounded-xl font-bold text-xs transition-all"
            >
              <SquaresFourIcon size={13} weight="duotone" />
              Modules
            </button>
          </div>
        </div>
      </header>

      {/* ── Canvas ─────────────────────────────────────────────────────── */}
      {hasCoreModules && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

          {/* Left: Knowledge (Notes + Resources) */}
          {(hasAnnotate || hasKnowledge) && (
            <section className="xl:col-span-7 flex flex-col gap-8">

              {hasAnnotate && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <PencilSimpleIcon size={14} className="text-modules-aly" weight="bold" />
                      <h2 className="text-sm font-bold text-text-primary">Notes</h2>
                    </div>
                    <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest bg-background-secondary border border-border-primary px-2.5 py-1 rounded-lg">
                      {annotations.length} entries
                    </span>
                  </div>
                  <div className="bg-background-secondary border border-border-primary rounded-xl overflow-hidden min-h-96">
                    <AnnotateTerminal
                      annotations={annotations}
                      documents={documents}
                      loading={notesLoading}
                      onCreate={handleCreateNote}
                      onDelete={handleDeleteNote}
                    />
                  </div>
                </div>
              )}

              {hasKnowledge && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileTextIcon size={14} className="text-modules-knowledge" weight="bold" />
                      <h2 className="text-sm font-bold text-text-primary">Resources</h2>
                    </div>
                    <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest bg-background-secondary border border-border-primary px-2.5 py-1 rounded-lg">
                      {documents.length} files
                    </span>
                  </div>
                  <div className="bg-background-secondary border border-border-primary rounded-xl overflow-hidden min-h-96">
                    <VaultTerminal
                      documents={documents}
                      loading={docsLoading}
                      onUploadPDF={handleUploadPDF}
                      onUploadURL={handleUploadURL}
                      onDelete={handleDeleteDoc}
                    />
                  </div>
                </div>
              )}

            </section>
          )}

          {/* Right: Execution (Tasks + Outcomes) */}
          {(hasTrack || hasDeliver) && (
            <section className={`${hasAnnotate || hasKnowledge ? 'xl:col-span-5' : 'xl:col-span-12'} flex flex-col gap-8 xl:sticky xl:top-16`}>

              {hasTrack && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircleIcon size={14} className="text-modules-track" weight="bold" />
                      <h2 className="text-sm font-bold text-text-primary">Tasks</h2>
                    </div>
                    <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest bg-background-secondary border border-border-primary px-2.5 py-1 rounded-lg">
                      {tasks.length} active
                    </span>
                  </div>
                  <div className="max-h-120 overflow-y-auto rounded-xl border border-border-primary">
                    <MissionTable
                      tasks={tasks}
                      loading={missionsLoading}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDeleteTask}
                    />
                  </div>
                </div>
              )}

              {hasDeliver && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <PaperPlaneRightIcon size={14} className="text-modules-deliver" weight="bold" />
                      <h2 className="text-sm font-bold text-text-primary">Outcomes</h2>
                    </div>
                    <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest bg-background-secondary border border-border-primary px-2.5 py-1 rounded-lg">
                      {deliveries.length} delivered
                    </span>
                  </div>
                  <div className="bg-background-secondary border border-border-primary rounded-xl overflow-hidden min-h-64">
                    <DeliverTerminal
                      deliveries={deliveries}
                      loading={deliveriesLoading}
                      onCreate={handleCreateDelivery}
                      onDelete={handleDeleteDelivery}
                    />
                  </div>
                </div>
              )}

            </section>
          )}
        </div>
      )}

      {/* ── Data addon views ────────────────────────────────────────────── */}
      {addons.length > 0 && (
        <section className="flex flex-col gap-4">
          {/* Tab strip — only shown when multiple addons installed */}
          {addons.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {addons.map(addon => {
                const mod = MODULE_CATALOG.find(m => m.id === addon.type);
                if (!mod) return null;
                const Icon = mod.icon;
                const isActive = activeAddon === addon.type;
                return (
                  <button
                    key={addon.id}
                    onClick={() => setActiveAddon(isActive ? null : addon.type)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all"
                    style={isActive
                      ? { color: mod.color, borderColor: `${mod.color}40`, backgroundColor: `${mod.color}10` }
                      : { borderColor: 'var(--border-primary)', color: 'var(--text-tertiary)' }
                    }
                  >
                    <Icon size={13} weight="duotone" />
                    {mod.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Addon content */}
          {addons.map(addon => {
            const mod = MODULE_CATALOG.find(m => m.id === addon.type);
            if (!mod) return null;
            // If multiple addons, only show the active one; if single, always show
            if (addons.length > 1 && activeAddon !== addon.type) return null;
            const Icon = mod.icon;
            return (
              <div key={addon.id} className="bg-background-secondary border border-border-primary rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-border-primary">
                  <div className="flex items-center gap-2">
                    <Icon size={14} weight="duotone" style={{ color: mod.color }} />
                    <span className="text-sm font-bold text-text-primary">{mod.label}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveModule(addon.type)}
                    className="text-[10px] text-text-tertiary hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                </div>
                <div className="p-5">
                  {userId && addon.type === 'calorie_counter' && (
                    <CalorieCounterAddon hubId={hubId} userId={userId} config={addon.config} />
                  )}
                  {userId && addon.type === 'expense_tracker' && (
                    <ExpenseTrackerAddon hubId={hubId} userId={userId} config={addon.config} />
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* ── Empty state ─────────────────────────────────────────────────── */}
      {!hasAnything && (
        <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
          <div className="w-14 h-14 rounded-2xl bg-background-secondary border border-border-primary flex items-center justify-center">
            <SquaresFourIcon size={26} className="text-text-tertiary" weight="duotone" />
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary mb-1">No modules yet</p>
            <p className="text-xs text-text-tertiary max-w-xs">Add modules to this hub to start tracking tasks, notes, expenses, and more.</p>
          </div>
          <button
            onClick={() => setShowModulePicker(true)}
            className="flex items-center gap-2 bg-modules-aly/10 border border-modules-aly/20 text-modules-aly px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-modules-aly/20 transition-all"
          >
            <PlusIcon size={14} weight="bold" />
            Add Module
          </button>
        </div>
      )}

      {/* ── Module picker drawer ─────────────────────────────────────────── */}
      {showModulePicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowModulePicker(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative bg-background-primary border border-border-primary rounded-xl w-full max-w-md p-5 flex flex-col gap-4 z-10"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-text-primary">Add Module</p>
                <p className="text-xs text-text-tertiary">Select tools for this hub</p>
              </div>
              <button onClick={() => setShowModulePicker(false)} className="text-text-tertiary hover:text-text-primary">
                <XIcon size={18} />
              </button>
            </div>

            {/* Core */}
            <div>
              <p className="text-[10px] font-bold text-text-tertiary/60 uppercase tracking-widest mb-2">Core</p>
              <div className="flex flex-col gap-1.5">
                {MODULE_CATALOG.filter(m => m.group === 'core').map(mod => {
                  const Icon = mod.icon;
                  const installed = isInstalled(mod.id);
                  const isLoading = installingModule === mod.id;
                  return (
                    <button
                      key={mod.id}
                      onClick={() => installed ? handleRemoveModule(mod.id) : handleInstallModule(mod.id)}
                      disabled={isLoading}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left"
                      style={installed
                        ? { borderColor: `${mod.color}40`, backgroundColor: `${mod.color}0d` }
                        : { borderColor: 'var(--border-primary)' }
                      }
                    >
                      <Icon size={15} weight={installed ? 'fill' : 'regular'} style={{ color: installed ? mod.color : undefined }} className={installed ? '' : 'text-text-tertiary'} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-text-primary">{mod.label}</p>
                        <p className="text-[10px] text-text-tertiary">{mod.description}</p>
                      </div>
                      {isLoading
                        ? <div className="w-4 h-4 border-2 border-border-primary border-t-text-tertiary rounded-full animate-spin shrink-0" />
                        : installed
                          ? <span className="text-[10px] font-bold shrink-0" style={{ color: mod.color }}>Added</span>
                          : <PlusIcon size={13} className="text-text-tertiary shrink-0" />
                      }
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Data tracking */}
            <div>
              <p className="text-[10px] font-bold text-text-tertiary/60 uppercase tracking-widest mb-2">Data Tracking</p>
              <div className="flex flex-col gap-1.5">
                {MODULE_CATALOG.filter(m => m.group === 'data').map(mod => {
                  const Icon = mod.icon;
                  const installed = isInstalled(mod.id);
                  const isLoading = installingModule === mod.id;
                  return (
                    <button
                      key={mod.id}
                      onClick={() => installed ? handleRemoveModule(mod.id) : handleInstallModule(mod.id)}
                      disabled={isLoading}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left"
                      style={installed
                        ? { borderColor: `${mod.color}40`, backgroundColor: `${mod.color}0d` }
                        : { borderColor: 'var(--border-primary)' }
                      }
                    >
                      <Icon size={15} weight={installed ? 'fill' : 'regular'} style={{ color: installed ? mod.color : undefined }} className={installed ? '' : 'text-text-tertiary'} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-text-primary">{mod.label}</p>
                        <p className="text-[10px] text-text-tertiary">{mod.description}</p>
                      </div>
                      {isLoading
                        ? <div className="w-4 h-4 border-2 border-border-primary border-t-text-tertiary rounded-full animate-spin shrink-0" />
                        : installed
                          ? <span className="text-[10px] font-bold shrink-0" style={{ color: mod.color }}>Added</span>
                          : <PlusIcon size={13} className="text-text-tertiary shrink-0" />
                      }
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <MissionModal
        isOpen={isMissionModalOpen}
        onClose={() => setMissionModalOpen(false)}
        onAdd={handleAddMission}
      />
    </main>
  );
}
