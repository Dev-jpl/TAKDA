"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Sparkle, 
  Plus
} from '@phosphor-icons/react';
import { supabase } from '@/services/supabase';
import { spacesService, Space } from '@/services/spaces.service';
import { hubsService, Hub } from '@/services/hubs.service';
import { trackService, Task } from '@/services/track.service';
import { knowledgeService, KnowledgeDocument } from '@/services/knowledge.service';
import { annotateService, Annotation } from '@/services/annotate.service';
import { automateService, Briefing } from '@/services/automate.service';
import { deliverService, Delivery, DeliveryCreate } from '@/services/deliver.service';
import { IconResolver } from '@/components/common/IconResolver';
import { ModuleSwitcher, ModuleKey } from '@/components/hub/ModuleSwitcher';
import { MissionTable } from '@/components/hub/MissionTable';
import { MissionModal } from '@/components/hub/MissionModal';
import { VaultTerminal } from '@/components/knowledge/VaultTerminal';
import { AnnotateTerminal } from '@/components/hub/AnnotateTerminal';
import { AutomateTerminal } from '@/components/hub/AutomateTerminal';
import { DeliverTerminal } from '@/components/hub/DeliverTerminal';

export default function HubDetailPage() {
  const params = useParams();
  const router = useRouter();
  const spaceId = params.id as string;
  const hubId = params.hubId as string;

  const [space, setSpace] = useState<Space | null>(null);
  const [hub, setHub] = useState<Hub | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [activeModule, setActiveModule] = useState<ModuleKey>('track');
  const [loading, setLoading] = useState(true);
  const [missionsLoading, setMissionsLoading] = useState(false);
  const [docsLoading, setDocsLoading] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);
  const [briefingsLoading, setBriefingsLoading] = useState(false);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);
  const [isMissionModalOpen, setMissionModalOpen] = useState(false);

  const loadMissions = useCallback(async (hId: string) => {
    setMissionsLoading(true);
    try {
      const data = await trackService.getTasks(hId);
      setTasks(data);
    } catch (err) {
      console.error('Mission extraction failed:', err);
    } finally {
      setMissionsLoading(false);
    }
  }, []);

  const loadDocuments = useCallback(async (hId: string) => {
    setDocsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const data = await knowledgeService.getDocuments(user.id, hId);
        setDocuments(data);
      }
    } catch (err) {
      console.error('Knowledge extraction failed:', err);
    } finally {
      setDocsLoading(false);
    }
  }, []);

  const loadAnnotations = useCallback(async (hId: string) => {
    setNotesLoading(true);
    try {
      const data = await annotateService.getAnnotations(hId);
      setAnnotations(data);
    } catch (err) {
      console.error('Reflection extraction failed:', err);
    } finally {
      setNotesLoading(false);
    }
  }, []);

  const loadBriefings = useCallback(async (hId: string) => {
    setBriefingsLoading(true);
    try {
      const data = await automateService.getBriefings(hId);
      setBriefings(data);
    } catch (err) {
      console.error('Briefing extraction failed:', err);
    } finally {
      setBriefingsLoading(false);
    }
  }, []);

  const loadDeliveries = useCallback(async (hId: string) => {
    setDeliveriesLoading(true);
    try {
      const data = await deliverService.getDeliveries(hId);
      setDeliveries(data);
    } catch (err) {
      console.error('Dispatch extraction failed:', err);
    } finally {
      setDeliveriesLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const uId = user?.id;
      if (!uId) throw new Error('Registry Error: Session deauthorized.');

      const [spaceData, hubData] = await Promise.all([
        spacesService.getSpaces(uId).then(spaces => spaces.find(s => s.id === spaceId)),
        hubsService.getHubsBySpace(spaceId).then(hubs => hubs.find(h => h.id === hubId))
      ]);

      if (spaceData) setSpace(spaceData);
      if (hubData) {
        setHub(hubData);
        if (activeModule === 'track') loadMissions(hubData.id);
        if (activeModule === 'knowledge') loadDocuments(hubData.id);
        if (activeModule === 'annotate') loadAnnotations(hubData.id);
        if (activeModule === 'automate') loadBriefings(hubData.id);
      }
    } catch (err) {
      console.error('Context oversight failure:', err);
    } finally {
      setLoading(false);
    }
  }, [spaceId, hubId, activeModule, loadMissions, loadDocuments, loadAnnotations, loadBriefings]);

  useEffect(() => {
    if (spaceId && hubId) loadData();
  }, [spaceId, hubId, loadData]);

  // Handle module-specific data loading when switching
  useEffect(() => {
    if (hub?.id) {
      if (activeModule === 'track' && tasks.length === 0) loadMissions(hub.id);
      if (activeModule === 'knowledge' && documents.length === 0) loadDocuments(hub.id);
      if (activeModule === 'annotate' && annotations.length === 0) {
        loadAnnotations(hub.id);
        if (documents.length === 0) loadDocuments(hub.id); 
      }
      if (activeModule === 'automate' && briefings.length === 0) {
        loadBriefings(hub.id);
      }
      if (activeModule === 'deliver' && deliveries.length === 0) {
        loadDeliveries(hub.id);
      }
    }
  }, [activeModule, hub?.id, tasks.length, documents.length, annotations.length, briefings.length, deliveries.length, loadMissions, loadDocuments, loadAnnotations, loadBriefings, loadDeliveries]);

  const handleAddMission = async (task: Partial<Task>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const newTask = await trackService.createTask({
        ...task,
        hub_id: hubId,
        user_id: user.id
      });
      setTasks(prev => [newTask, ...prev]);
    } catch (err) {
      console.error('Deployment failure:', err);
      loadMissions(hubId);
    }
  };

  const handleUploadPDF = async (file: File) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const newDoc = await knowledgeService.uploadPDF(user.id, hubId, file);
      setDocuments(prev => [newDoc, ...prev]);
    } catch (err) {
      console.error('PDF ingestion failure:', err);
    }
  };

  const handleUploadURL = async (url: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const newDoc = await knowledgeService.uploadURL(user.id, hubId, url);
      setDocuments(prev => [newDoc, ...prev]);
    } catch (err) {
      console.error('URL ingestion failure:', err);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Extraction confirm? Registry data is permanent.')) return;
    try {
      await knowledgeService.deleteDocument(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      console.error('Document extraction aborted:', err);
    }
  };

  const handleCreateNote = async (data: { content: string; category: string; documentId?: string | null }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const newNote = await annotateService.createAnnotation({
        userId: user.id,
        hubId: hubId,
        documentId: data.documentId,
        content: data.content,
        category: data.category
      });
      setAnnotations(prev => [newNote, ...prev]);
    } catch (err) {
      console.error('Reflection creation failure:', err);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm('Abort this reflection? Registry data is permanent.')) return;
    try {
      await annotateService.deleteAnnotation(id);
      setAnnotations(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Reflection extraction failure:', err);
    }
  };

  const handleGenerateBriefing = async (type: 'daily' | 'weekly') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const newBriefing = await automateService.generateBriefing({
        userId: user.id,
        hubId: hubId,
        type
      });
      setBriefings(prev => [newBriefing, ...prev]);
    } catch (err) {
      console.error('Synthesis protocol failure:', err);
      alert(err instanceof Error ? err.message : 'Briefing synthesis failed.');
    }
  };

  const handleDeleteBriefing = async (id: string) => {
    if (!confirm('Abort this briefing history? Extraction is permanent.')) return;
    try {
      await automateService.deleteBriefing(id);
      setBriefings(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      console.error('Briefing extraction failure:', err);
    }
  };

  const handleCreateDelivery = async (data: Partial<DeliveryCreate>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const newDelivery = await deliverService.createDelivery({
        ...data,
        hub_id: hubId,
        user_id: user.id
      } as DeliveryCreate);
      setDeliveries(prev => [newDelivery, ...prev]);
    } catch (err) {
      console.error('Dispatch synthesis failure:', err);
    }
  };

  const handleDeleteDelivery = async (id: string) => {
    if (!confirm('Abort this dispatch? Extraction is permanent.')) return;
    try {
      await deliverService.deleteDelivery(id);
      setDeliveries(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      console.error('Dispatch extraction failure:', err);
    }
  };

  const handleStatusChange = async (taskId: string, status: Task['status']) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
    try {
      await trackService.updateTask(taskId, { status });
    } catch {
      loadMissions(hubId);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Abort this mission? Extraction is permanent.')) return;
    setTasks(prev => prev.filter(t => t.id !== taskId));
    try {
      await trackService.deleteTask(taskId);
    } catch {
      loadMissions(hubId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
          <Sparkle size={32} color="var(--modules-aly)" />
        </motion.div>
      </div>
    );
  }

  if (!hub || !space) return <div className="p-20 text-center text-text-tertiary">Mission Error: Registry identifier mismatch.</div>;

  return (
    <main className="p-6 lg:p-12 max-w-7xl mx-auto">
      <header className="mb-10">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-text-tertiary hover:text-text-primary transition-colors mb-6 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Return to Context Oversight</span>
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center border shadow-lg"
              style={{ backgroundColor: `${hub.color}15`, borderColor: `${hub.color}30` }}
            >
              <IconResolver icon={hub.icon || 'Circle'} size={28} color={hub.color} weight="duotone" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-text-primary">{hub.name}</h1>
                <div 
                  className="px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-[0.1em] border"
                  style={{ color: space.color, borderColor: `${space.color}40`, backgroundColor: `${space.color}10` }}
                >
                  {space.name}
                </div>
              </div>
              <p className="text-text-tertiary mt-1 text-xs font-medium">
                {hub.description || 'Identifying mission-critical objectives within this hub.'}
              </p>
            </div>
          </div>

          <button 
            onClick={() => setMissionModalOpen(true)}
            className="flex items-center gap-2 bg-background-secondary border border-border-primary text-text-primary px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm hover:bg-background-tertiary transition-all"
          >
            <Plus size={16} />
            <span>New Objective</span>
          </button>
        </div>
      </header>

      <ModuleSwitcher activeModule={activeModule} onModuleChange={setActiveModule} />

      <section className="pb-20">
        <AnimatePresence mode="wait">
          {activeModule === 'track' ? (
            <motion.div
              key="track-module"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-modules-track shadow-[0_0_8px_var(--modules-track)]" />
                  <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Mission Tracking</h2>
                </div>
                <div className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
                  {tasks.length} Objectives Active
                </div>
              </div>
              
              <MissionTable 
                tasks={tasks} 
                loading={missionsLoading} 
                onStatusChange={handleStatusChange}
                onDelete={handleDeleteTask}
              />
            </motion.div>
          ) : activeModule === 'knowledge' ? (
            <motion.div
              key="knowledge-module"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-modules-knowledge shadow-[0_0_8px_var(--modules-knowledge)]" />
                  <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Knowledge Vault</h2>
                </div>
                <div className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
                  {documents.length} Terminals Registered
                </div>
              </div>

              <VaultTerminal 
                documents={documents}
                loading={docsLoading}
                onUploadPDF={handleUploadPDF}
                onUploadURL={handleUploadURL}
                onDelete={handleDeleteDoc}
              />
            </motion.div>
          ) : activeModule === 'annotate' ? (
            <motion.div
              key="annotate-module"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-modules-aly shadow-[0_0_8px_var(--modules-aly)]" />
                  <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Reflections & Annotations</h2>
                </div>
                <div className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
                  {annotations.length} Intelligence Units
                </div>
              </div>

              <AnnotateTerminal 
                annotations={annotations}
                documents={documents}
                loading={notesLoading}
                onCreate={handleCreateNote}
                onDelete={handleDeleteNote}
              />
            </motion.div>
          ) : activeModule === 'automate' ? (
            <motion.div
              key="automate-module"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-modules-aly shadow-[0_0_8px_var(--modules-aly)]" />
                  <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Intelligence Synthesis</h2>
                </div>
                <div className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
                  {briefings.length} Reports Archived
                </div>
              </div>

              <AutomateTerminal 
                briefings={briefings}
                loading={briefingsLoading}
                onGenerate={handleGenerateBriefing}
                onDelete={handleDeleteBriefing}
              />
            </motion.div>
          ) : activeModule === 'deliver' ? (
            <motion.div
              key="deliver-module"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-modules-deliver shadow-[0_0_8px_var(--modules-deliver)]" />
                  <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Project Dispatches</h2>
                </div>
                <div className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
                  {deliveries.length} Intelligence Units
                </div>
              </div>

              <DeliverTerminal 
                deliveries={deliveries}
                loading={deliveriesLoading}
                onCreate={handleCreateDelivery}
                onDelete={handleDeleteDelivery}
              />
            </motion.div>
          ) : (
            <motion.div
              key="fallback-module"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-32 text-center bg-background-secondary/50 rounded-3xl border border-dashed border-border-primary"
            >
              <Sparkle size={48} className="mx-auto text-text-tertiary/10 mb-4 animate-pulse" />
              <p className="text-text-tertiary font-bold uppercase text-[10px] tracking-widest">
                Deploying {activeModule} Module...
              </p>
              <p className="text-[10px] text-text-tertiary/60 mt-2">Registry logic initialization in progress.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <MissionModal 
        isOpen={isMissionModalOpen} 
        onClose={() => setMissionModalOpen(false)} 
        onAdd={handleAddMission} 
      />
    </main>
  );
}
