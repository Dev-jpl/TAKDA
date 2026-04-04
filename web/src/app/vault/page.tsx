"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { 
  Sparkle, 
  Database, 
  ArrowRight
} from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { supabase } from '@/services/supabase';
import { knowledgeService, KnowledgeDocument } from '@/services/knowledge.service';
import { VaultTerminal } from '@/components/knowledge/VaultTerminal';

export default function GlobalVaultPage() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Registry Error: Session deauthorized.');

      const data = await knowledgeService.getDocuments(user.id);
      setDocuments(data);
    } catch (err) {
      console.error('Vault oversight failure:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUploadPDF = async (file: File) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const newDoc = await knowledgeService.uploadPDF(user.id, null, file);
      setDocuments(prev => [newDoc, ...prev]);
    } catch (err) {
      console.error('Global PDF ingestion failure:', err);
    }
  };

  const handleUploadURL = async (url: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const newDoc = await knowledgeService.uploadURL(user.id, null, url);
      setDocuments(prev => [newDoc, ...prev]);
    } catch (err) {
      console.error('Global URL ingestion failure:', err);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Extraction confirm? Global registry data is permanent.')) return;
    try {
      await knowledgeService.deleteDocument(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      console.error('Document extraction aborted:', err);
    }
  };

  return (
    <main className="p-6 lg:p-12 max-w-7xl mx-auto">
      <header className="mb-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-text-primary">The Vault</h1>
            <p className="text-text-tertiary text-sm mt-1">Cross-hub knowledge registry for your mission-critical data terminals.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 rounded-xl bg-background-secondary border border-border-primary text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
              Registry: All Modules
            </div>
          </div>
        </div>
      </header>

      {/* Vault Activity Stats */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-background-secondary border border-border-primary rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Database size={48} />
          </div>
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1">Knowledge Density</p>
          <p className="text-2xl font-bold text-text-primary">{documents.length} Units</p>
        </div>
        <div className="bg-background-secondary border border-border-primary rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Sparkle size={48} />
          </div>
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1">Intelligence Flow</p>
          <p className="text-2xl font-bold text-text-primary">High Velocity</p>
        </div>
        <div className="bg-background-secondary border border-border-primary rounded-2xl p-6 relative overflow-hidden group border-l-4 border-l-modules-knowledge">
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1">Status Registry</p>
          <p className="text-sm font-bold text-text-primary">All Terminals Stable</p>
        </div>
      </section>

      <VaultTerminal 
        documents={documents}
        loading={loading}
        onUploadPDF={handleUploadPDF}
        onUploadURL={handleUploadURL}
        onDelete={handleDeleteDoc}
      />
    </main>
  );
}
