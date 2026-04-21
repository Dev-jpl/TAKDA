"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  Clock,
  Warning,
  Trash,
  PencilSimple,
  ChartLineUp,
} from '@phosphor-icons/react';
import { Task } from '@/services/track.service';

interface MissionTableProps {
  tasks: Task[];
  loading: boolean;
  onStatusChange: (taskId: string, status: Task['status']) => void;
  onDelete: (taskId: string) => void;
}

const statusConfig: Record<Task['status'], { label: string; color: string; icon: React.ElementType }> = {
  todo:        { label: 'To Do',    color: 'var(--text-tertiary)',   icon: Clock        },
  in_progress: { label: 'Progress', color: 'var(--modules-track)',   icon: ChartLineUp  },
  done:        { label: 'Done',     color: 'var(--status-success)',  icon: CheckCircle  },
  blocked:     { label: 'Blocked',  color: 'var(--urgent)',          icon: Warning      },
};

const priorityConfig: Record<Task['priority'], { label: string; color: string }> = {
  low:     { label: 'Low',     color: 'var(--text-tertiary)'  },
  medium:  { label: 'Medium',  color: 'var(--status-success)' },
  high:    { label: 'High',    color: 'var(--urgent)'         },
  crucial: { label: 'Crucial', color: 'var(--modules-aly)'    },
};

export const MissionTable: React.FC<MissionTableProps> = ({ tasks, loading, onStatusChange, onDelete }) => {
  if (loading && tasks.length === 0) {
    return (
      <div className="p-4 space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-14 w-full bg-background-secondary rounded-xl animate-pulse border border-border-primary" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="py-16 text-center bg-background-secondary">
        <ChartLineUp size={32} className="mx-auto text-text-tertiary/20 mb-3" />
        <p className="text-xs text-text-tertiary">No tasks yet.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden bg-background-secondary">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border-primary bg-background-tertiary/30">
            <th className="px-4 py-3 text-[10px] font-bold text-text-tertiary uppercase tracking-widest w-1/2">Task</th>
            <th className="px-4 py-3 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Status</th>
            <th className="px-4 py-3 text-[10px] font-bold text-text-tertiary uppercase tracking-widest text-center">Priority</th>
            <th className="px-4 py-3 text-[10px] font-bold text-text-tertiary uppercase tracking-widest text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence mode="popLayout">
            {tasks.map(task => {
              const status   = statusConfig[task.status];
              const priority = priorityConfig[task.priority];
              return (
                <motion.tr
                  key={task.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="group hover:bg-background-tertiary/40 transition-colors border-b border-border-primary/50 last:border-0"
                >
                  <td className="px-4 py-3">
                    <p className={`text-sm font-semibold ${task.status === 'done' ? 'text-text-tertiary line-through' : 'text-text-primary'}`}>
                      {task.title}
                    </p>
                    {task.due_date && (
                      <p className="text-[10px] text-text-tertiary mt-0.5">
                        Due {new Date(task.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        const statuses: Task['status'][] = ['todo', 'in_progress', 'done', 'blocked'];
                        const next = statuses[(statuses.indexOf(task.status) + 1) % statuses.length];
                        onStatusChange(task.id, next);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background-tertiary border border-border-primary hover:border-text-tertiary/40 transition-all"
                    >
                      <status.icon size={12} style={{ color: status.color }} weight="bold" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                        {status.label}
                      </span>
                    </button>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span
                      className="inline-block px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border"
                      style={{ color: priority.color, borderColor: `${priority.color}30`, backgroundColor: `${priority.color}10` }}
                    >
                      {priority.label}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-background-tertiary transition-all">
                        <PencilSimple size={14} />
                      </button>
                      <button
                        onClick={() => onDelete(task.id)}
                        className="p-1.5 rounded-lg text-text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
};
