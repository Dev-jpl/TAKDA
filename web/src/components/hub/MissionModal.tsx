"use client";

import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Task } from '@/services/track.service';
import { Plus, Flag, Calendar as CalendarIcon, TextAlignLeft } from '@phosphor-icons/react';

interface MissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (task: Partial<Task>) => void;
}

const inputCls = "w-full bg-background-tertiary border border-border-primary rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-modules-track/40 placeholder:text-text-tertiary transition-colors";

export const MissionModal: React.FC<MissionModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [title,    setTitle]    = useState('');
  const [priority, setPriority] = useState<Task['priority']>('low');
  const [dueDate,  setDueDate]  = useState('');
  const [notes,    setNotes]    = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ title, priority, status: 'todo', due_date: dueDate || undefined, notes: notes || undefined });
    setTitle(''); setPriority('low'); setDueDate(''); setNotes('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Task" subtitle="Add a task to this hub">
      <form onSubmit={handleSubmit} className="space-y-4">

        <div>
          <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest block mb-1.5">Title</label>
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            className={inputCls}
            placeholder="What needs to be done?"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest block mb-1.5">Priority</label>
            <div className="relative">
              <Flag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as Task['priority'])}
                className={`${inputCls} pl-8 appearance-none cursor-pointer`}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="crucial">Crucial</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest block mb-1.5">Due date</label>
            <div className="relative">
              <CalendarIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className={`${inputCls} pl-8 cursor-pointer`}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest block mb-1.5">Notes</label>
          <div className="relative">
            <TextAlignLeft size={14} className="absolute left-3 top-3 text-text-tertiary" />
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className={`${inputCls} pl-8 resize-none`}
              placeholder="Optional notes…"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!title.trim()}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-modules-track text-white text-sm font-bold disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          <Plus size={15} weight="bold" />
          Add Task
        </button>
      </form>
    </Modal>
  );
};
