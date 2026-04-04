"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  Clock, 
  Warning, 
  Trash,
  PencilSimple,
  ChartLineUp
} from '@phosphor-icons/react';
import { Task } from '@/services/track.service';

interface MissionTableProps {
  tasks: Task[];
  loading: boolean;
  onStatusChange: (taskId: string, status: Task['status']) => void;
  onDelete: (taskId: string) => void;
}

const statusConfig: Record<Task['status'], { label: string, color: string, icon: React.ElementType }> = {
  todo: { label: 'To Do', color: 'var(--text-tertiary)', icon: Clock },
  in_progress: { label: 'Progress', color: 'var(--modules-track)', icon: ChartLineUp },
  done: { label: 'Done', color: 'var(--status-success)', icon: CheckCircle },
  blocked: { label: 'Blocked', color: 'var(--urgent)', icon: Warning },
};

const priorityConfig: Record<Task['priority'], { label: string, color: string }> = {
  low: { label: 'Low', color: 'var(--text-tertiary)' },
  medium: { label: 'Medium', color: 'var(--status-success)' },
  high: { label: 'High', color: 'var(--urgent)' },
  crucial: { label: 'Crucial', color: 'var(--modules-aly)' },
};

export const MissionTable: React.FC<MissionTableProps> = ({ tasks, loading, onStatusChange, onDelete }) => {
  if (loading && tasks.length === 0) {
    return (
      <div className="w-full space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 w-full bg-background-secondary rounded-xl animate-pulse border border-border-primary" />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden bg-background-secondary border border-border-primary rounded-2xl shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border-primary bg-background-tertiary/30">
            <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest w-1/2">Objective</th>
            <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Status</th>
            <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest text-center">Priority</th>
            <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence mode="popLayout">
            {tasks.map((task) => {
              const status = statusConfig[task.status];
              const priority = priorityConfig[task.priority];
              return (
                <motion.tr 
                  key={task.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="group hover:bg-background-tertiary/50 transition-colors border-b border-border-primary/50 last:border-0"
                >
                  <td className="px-6 py-4">
                    <p className={`text-sm font-bold ${task.status === 'done' ? 'text-text-tertiary line-through' : 'text-text-primary'}`}>
                      {task.title}
                    </p>
                    {task.due_date && (
                      <p className="text-[10px] text-text-tertiary mt-1 font-medium">Due: {new Date(task.due_date).toLocaleDateString()}</p>
                    )}
                  </td>
                  
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => {
                        const statuses: Task['status'][] = ['todo', 'in_progress', 'done', 'blocked'];
                        const next = statuses[(statuses.indexOf(task.status) + 1) % statuses.length];
                        onStatusChange(task.id, next);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background-tertiary border border-border-primary hover:border-text-tertiary transition-all group/btn"
                    >
                      <status.icon size={14} style={{ color: status.color }} weight="bold" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary group-hover/btn:text-text-primary">
                        {status.label}
                      </span>
                    </button>
                  </td>

                  <td className="px-6 py-4 text-center">
                    <span 
                      className="inline-block px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border"
                      style={{ color: priority.color, borderColor: `${priority.color}30`, backgroundColor: `${priority.color}10` }}
                    >
                      {priority.label}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-background-tertiary transition-all">
                        <PencilSimple size={18} />
                      </button>
                      <button 
                        onClick={() => onDelete(task.id)}
                        className="p-2 rounded-lg text-text-tertiary hover:text-urgent hover:bg-urgent/10 transition-all"
                      >
                        <Trash size={18} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </AnimatePresence>
        </tbody>
      </table>
      
      {tasks.length === 0 && !loading && (
        <div className="py-20 text-center">
          <ChartLineUp size={48} className="mx-auto text-text-tertiary/20 mb-4" />
          <p className="text-text-tertiary font-medium">No active missions identified in this registry.</p>
        </div>
      )}
    </div>
  );
};
