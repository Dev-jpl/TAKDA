"use client";

import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Task } from '@/services/track.service';
import { 
  Plus, 
  Flag, 
  Calendar as CalendarIcon, 
  TextAlignLeft 
} from '@phosphor-icons/react';

interface MissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (task: Partial<Task>) => void;
}

export const MissionModal: React.FC<MissionModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('low');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAdd({
      title,
      priority,
      status: 'todo',
      due_date: dueDate || undefined,
      notes: notes || undefined,
    });

    // Reset and close
    setTitle('');
    setPriority('low');
    setDueDate('');
    setNotes('');
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Initiate New Objective"
      subtitle="Define mission-critical coordination parameters"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title Input */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest ml-1">Mission Objective</label>
          <input 
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-background-tertiary border border-border-primary rounded-2xl py-4 px-6 text-sm focus:outline-none focus:ring-1 focus:ring-modules-track/50 focus:border-modules-track/50 transition-all font-bold placeholder:text-text-tertiary/30"
            placeholder="Identify and coordinate..."
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Priority */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest ml-1">Priority Protocol</label>
            <div className="relative group">
              <Flag size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-modules-track transition-colors" />
              <select 
                value={priority}
                onChange={(e) => setPriority(e.target.value as Task['priority'])}
                className="w-full bg-background-tertiary border border-border-primary rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-modules-track/50 focus:border-modules-track/50 transition-all font-bold appearance-none cursor-pointer"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="crucial">Crucial</option>
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest ml-1">Mission Target</label>
            <div className="relative group">
              <CalendarIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-modules-track transition-colors" />
              <input 
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-background-tertiary border border-border-primary rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-modules-track/50 focus:border-modules-track/50 transition-all font-bold cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest ml-1">Mission Context (Notes)</label>
          <div className="relative group">
            <TextAlignLeft size={18} className="absolute left-4 top-5 text-text-tertiary group-focus-within:text-modules-track transition-colors" />
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full bg-background-tertiary border border-border-primary rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-modules-track/50 focus:border-modules-track/50 transition-all font-medium resize-none placeholder:text-text-tertiary/30"
              placeholder="Additional registry metadata..."
            />
          </div>
        </div>

        <button 
          type="submit"
          className="w-full bg-modules-track text-white py-5 rounded-2xl font-bold text-sm shadow-xl shadow-modules-track/20 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
        >
          <Plus size={18} weight="bold" />
          Authorize New Mission
        </button>
      </form>
    </Modal>
  );
};
