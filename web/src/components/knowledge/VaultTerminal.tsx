"use client";

import React, { useState, useRef } from 'react';
import { 
  FilePdf, 
  Link as LinkIcon, 
  Trash, 
  Plus, 
  UploadSimple,
  CircleNotch,
  FileText
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { KnowledgeDocument } from '@/services/knowledge.service';
import { format } from 'date-fns';

interface VaultTerminalProps {
  documents: KnowledgeDocument[];
  loading: boolean;
  onUploadPDF: (file: File) => Promise<void>;
  onUploadURL: (url: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const VaultTerminal: React.FC<VaultTerminalProps> = ({ 
  documents, 
  loading, 
  onUploadPDF, 
  onUploadURL, 
  onDelete 
}) => {
  const [isUrlMode, setIsUrlMode] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onUploadPDF(file);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setUploading(true);
    try {
      await onUploadURL(urlInput);
      setUrlInput('');
      setIsUrlMode(false);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Console */}
      <div className="flex flex-wrap items-center gap-4">
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 bg-background-secondary border border-border-primary hover:bg-background-tertiary text-text-primary px-5 py-3 rounded-xl font-bold text-xs transition-all disabled:opacity-50"
        >
          {uploading ? <CircleNotch size={16} className="animate-spin" /> : <UploadSimple size={16} />}
          <span>Upload PDF Registry</span>
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept="application/pdf"
        />

        <button 
          onClick={() => setIsUrlMode(!isUrlMode)}
          disabled={uploading}
          className="flex items-center gap-2 bg-background-secondary border border-border-primary hover:bg-background-tertiary text-text-primary px-5 py-3 rounded-xl font-bold text-xs transition-all disabled:opacity-50"
        >
          <LinkIcon size={16} />
          <span>Ingest URL</span>
        </button>
      </div>

      <AnimatePresence>
        {isUrlMode && (
          <motion.form 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleUrlSubmit}
            className="bg-background-secondary border border-border-primary p-4 rounded-2xl flex gap-3"
          >
            <input 
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://mission-critical-data.com/registry"
              className="flex-1 bg-background-tertiary border border-border-primary rounded-xl px-4 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-modules-knowledge/50"
            />
            <button 
              type="submit"
              disabled={uploading}
              className="bg-modules-knowledge text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2"
            >
              {uploading ? <CircleNotch size={14} className="animate-spin" /> : <Plus size={14} weight="bold" />}
              Authorize
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Document Registry Table */}
      <div className="bg-background-secondary border border-border-primary rounded-2xl overflow-hidden shadow-sm shadow-black/20">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border-primary bg-background-tertiary/30">
              <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Type</th>
              <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Objective Identity</th>
              <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Registry Date</th>
              <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest text-right">Coordination</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-primary/50">
            {loading ? (
              [1, 2, 3].map(i => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={4} className="px-6 py-8 bg-background-tertiary/10" />
                </tr>
              ))
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-20 text-center text-text-tertiary font-bold text-xs uppercase tracking-widest opacity-50">
                  <FileText size={48} className="mx-auto mb-4 opacity-20" />
                  Registry Empty: No data terminals identified.
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id} className="group hover:bg-background-tertiary/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="w-8 h-8 rounded-lg bg-background-tertiary border border-border-primary flex items-center justify-center">
                      {doc.type === 'pdf' ? (
                        <FilePdf size={18} className="text-status-urgent" />
                      ) : (
                        <LinkIcon size={18} className="text-modules-knowledge" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-text-primary group-hover:text-modules-knowledge transition-colors">
                      {doc.name}
                    </p>
                    <p className="text-[10px] text-text-tertiary truncate max-w-xs">{doc.content_url}</p>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-text-tertiary uppercase">
                    {format(new Date(doc.created_at), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => onDelete(doc.id)}
                      className="p-2.5 rounded-lg text-text-tertiary hover:bg-status-urgent/10 hover:text-status-urgent transition-all"
                    >
                      <Trash size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
