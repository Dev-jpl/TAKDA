"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Sparkle, 
  Plus,
  CheckCircle,
  FileText,
  PencilSimple,
  PaperPlaneRight
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
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [missionsLoading, setMissionsLoading] = useState(false);
  const [docsLoading, setDocsLoading] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);
  
  const [isMissionModalOpen, setMissionModalOpen] = useState(false);

  const loadMissions = useCallback(async (hId: string) => {
    setMissionsLoading(true);
    try {
      const data = await trackService.getTasks(hId);
      setTasks(data);
    } catch (err) { console.error(err); } finally { setMissionsLoading(false); }
  }, []);

  const loadDocuments = useCallback(async (hId: string) => {
    setDocsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const data = await knowledgeService.getDocuments(user.id, hId);
        setDocuments(data);
      }
    } catch (err) { console.error(err); } finally { setDocsLoading(false); }
  }, []);

  const loadAnnotations = useCallback(async (hId: string) => {
    setNotesLoading(true);
    try {
      const data = await annotateService.getAnnotations(hId);
      setAnnotations(data);
    } catch (err) { console.error(err); } finally { setNotesLoading(false); }
  }, []);

  const loadDeliveries = useCallback(async (hId: string) => {
    setDeliveriesLoading(true);
    try {
      const data = await deliverService.getDeliveries(hId);
      setDeliveries(data);
    } catch (err) { console.error(err); } finally { setDeliveriesLoading(false); }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const uId = user?.id;
      if (!uId) throw new Error('Not authenticated.');

      const [spaceData, hubData] = await Promise.all([
        spacesService.getSpaces(uId).then(spaces => spaces.find(s => s.id === spaceId)),
        hubsService.getHubsBySpace(spaceId).then(hubs => hubs.find(h => h.id === hubId))
      ]);

      if (spaceData) setSpace(spaceData);
      if (hubData) setHub(hubData);
    } catch (err) {
      console.error('Failed to load hub data:', err);
    } finally {
      setLoading(false);
    }
  }, [spaceId, hubId]);

  useEffect(() => {
    if (spaceId && hubId) loadData();
  }, [spaceId, hubId, loadData]);

  // Load all module data in parallel once hub is resolved
  useEffect(() => {
    if (hub?.id) {
      loadMissions(hub.id);
      loadDocuments(hub.id);
      loadAnnotations(hub.id);
      loadDeliveries(hub.id);
    }
  }, [hub?.id, loadMissions, loadDocuments, loadAnnotations, loadDeliveries]);

  const handleAddMission = async (task: Partial<Task>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const newTask = await trackService.createTask({ ...task, hub_id: hubId, user_id: user.id });
      setTasks(prev => [newTask, ...prev]);
    } catch (err) { console.error(err); }
  };

  const handleUploadPDF = async (file: File) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const newDoc = await knowledgeService.uploadPDF(user.id, hubId, file);
      setDocuments(prev => [newDoc, ...prev]);
    } catch (err) { console.error(err); }
  };

  const handleUploadURL = async (url: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const newDoc = await knowledgeService.uploadURL(user.id, hubId, url);
      setDocuments(prev => [newDoc, ...prev]);
    } catch (err) { console.error(err); }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Delete this resource? This cannot be undone.')) return;
    try {
      await knowledgeService.deleteDocument(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (err) { console.error(err); }
  };

  const handleCreateNote = async (data: { content: string; category: string; documentId?: string | null }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const newNote = await annotateService.createAnnotation({
        userId: user.id, hubId: hubId, documentId: data.documentId, content: data.content, category: data.category
      });
      setAnnotations(prev => [newNote, ...prev]);
    } catch (err) { console.error(err); }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm('Delete this note?')) return;
    try {
      await annotateService.deleteAnnotation(id);
      setAnnotations(prev => prev.filter(n => n.id !== id));
    } catch (err) { console.error(err); }
  };

  const handleCreateDelivery = async (data: Partial<DeliveryCreate>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const newDelivery = await deliverService.createDelivery({ ...data, hub_id: hubId, user_id: user.id } as DeliveryCreate);
      setDeliveries(prev => [newDelivery, ...prev]);
    } catch (err) { console.error(err); }
  };

  const handleDeleteDelivery = async (id: string) => {
    if (!confirm('Delete this outcome?')) return;
    try {
      await deliverService.deleteDelivery(id);
      setDeliveries(prev => prev.filter(d => d.id !== id));
    } catch (err) { console.error(err); }
  };

  const handleStatusChange = async (taskId: string, status: Task['status']) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
    try { await trackService.updateTask(taskId, { status }); } catch { loadMissions(hubId); }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;
    setTasks(prev => prev.filter(t => t.id !== taskId));
    try { await trackService.deleteTask(taskId); } catch { loadMissions(hubId); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
          <Sparkle size={32} color="var(--modules-aly)" />
        </motion.div>
      </div>
    );
  }

  if (!hub || !space) return <div className="p-20 text-center text-text-tertiary">Hub not found.</div>;

  return (
    <main className="p-6 lg:p-10 max-w-[1700px] mx-auto min-h-screen flex flex-col gap-10">
      <header>
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-text-tertiary hover:text-text-primary transition-colors mb-6 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Return to {space.name}</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center border shadow-lg shrink-0"
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
                {hub.description || 'Manage tasks, resources, and insights for this hub.'}
              </p>
            </div>
          </div>

          <button 
            onClick={() => setMissionModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-blue-600/20 hover:scale-[1.02] transition-all active:scale-95 shrink-0"
          >
            <Plus size={16} weight="bold" />
            <span>New Action</span>
          </button>
        </div>
      </header>

      {/* Unified Canvas Layout */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-8 items-start pb-20">
        
        {/* Left Column: Knowledge base (Notes & Resources) */}
        <section className="xl:col-span-7 flex flex-col gap-8">
          
          {/* Notes */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500">
                  <PencilSimple size={18} weight="fill" />
                </div>
                <h2 className="text-base font-bold text-text-primary tracking-tight">Notes</h2>
              </div>
              <div className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest bg-background-secondary border border-border-primary px-3 py-1 rounded-full">
                {annotations.length} Entries
              </div>
            </div>
            <div className="bg-background-secondary border border-border-primary rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[400px]">
              <div className="flex-1 overflow-y-auto p-4 scrollbar-hide relative">
                <AnnotateTerminal 
                  annotations={annotations}
                  documents={documents}
                  loading={notesLoading}
                  onCreate={handleCreateNote}
                  onDelete={handleDeleteNote}
                />
              </div>
            </div>
          </div>

          {/* Resources */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <FileText size={18} weight="fill" />
                </div>
                <h2 className="text-base font-bold text-text-primary tracking-tight">Resources</h2>
              </div>
              <div className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest bg-background-secondary border border-border-primary px-3 py-1 rounded-full">
                {documents.length} Files
              </div>
            </div>
            <div className="bg-background-secondary border border-border-primary rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[400px]">
              <div className="flex-1 overflow-y-auto p-4 scrollbar-hide relative">
                 <VaultTerminal 
                   documents={documents}
                   loading={docsLoading}
                   onUploadPDF={handleUploadPDF}
                   onUploadURL={handleUploadURL}
                   onDelete={handleDeleteDoc}
                 />
              </div>
            </div>
          </div>

        </section>

        {/* Right Column: Execution (Action Items & Outcomes) */}
        <section className="xl:col-span-5 flex flex-col gap-8 sticky top-6">
          
          {/* Action Items */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-blue-600/10 text-blue-600">
                  <CheckCircle size={18} weight="fill" />
                </div>
                <h2 className="text-base font-bold text-text-primary tracking-tight">Action Items</h2>
              </div>
              <div className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest bg-background-secondary border border-border-primary px-3 py-1 rounded-full">
                {tasks.length} Active
              </div>
            </div>
            {/* Limit max height so it doesn't push outcomes too far down on sticky */}
            <div className="max-h-[500px] overflow-y-auto rounded-2xl border border-border-primary scrollbar-hide">
              <MissionTable 
                tasks={tasks} 
                loading={missionsLoading} 
                onStatusChange={handleStatusChange}
                onDelete={handleDeleteTask}
              />
            </div>
          </div>

          {/* Outcomes Feed */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500">
                  <PaperPlaneRight size={18} weight="fill" />
                </div>
                <h2 className="text-base font-bold text-text-primary tracking-tight">Outcomes</h2>
              </div>
              <div className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest bg-background-secondary border border-border-primary px-3 py-1 rounded-full">
                {deliveries.length} Delivered
              </div>
            </div>

            <div className="bg-background-secondary/40 backdrop-blur-md border border-border-primary rounded-[32px] overflow-hidden shadow-xl flex flex-col min-h-[500px] relative">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-red-500" />
               <div className="flex-1 overflow-y-auto p-4 space-y-8 scrollbar-hide flex flex-col">
                  <div className="bg-background-primary/50 rounded-2xl border border-border-primary/50 relative overflow-hidden h-full">
                    <DeliverTerminal 
                      deliveries={deliveries}
                      loading={deliveriesLoading}
                      onCreate={handleCreateDelivery}
                      onDelete={handleDeleteDelivery}
                    />
                  </div>
               </div>
            </div>
          </div>
          
        </section>
      </div>

      <MissionModal 
        isOpen={isMissionModalOpen} 
        onClose={() => setMissionModalOpen(false)} 
        onAdd={handleAddMission} 
      />
    </main>
  );
}
