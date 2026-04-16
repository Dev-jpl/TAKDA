import React from 'react';
import { SpaceTool } from '@/services/spaceTools.service';
import { LinkSimple, Key, LockKey, CodeBlock, Trash, Plug } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

interface SpaceToolsListProps {
  tools: SpaceTool[];
  onDelete: (id: string) => void;
}

const getToolIcon = (type: string) => {
  switch (type) {
    case 'webhook': return <LinkSimple size={20} className="text-emerald-500" />;
    case 'api_key': return <Key size={20} className="text-amber-500" />;
    case 'oauth': return <LockKey size={20} className="text-blue-500" />;
    case 'custom': return <CodeBlock size={20} className="text-purple-500" />;
    default: return <Plug size={20} className="text-text-tertiary" />;
  }
};

const getToolBadgeColor = (type: string) => {
  switch (type) {
    case 'webhook': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    case 'api_key': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    case 'oauth': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'custom': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    default: return 'bg-background-tertiary text-text-tertiary border-border-primary';
  }
};

export const SpaceToolsList: React.FC<SpaceToolsListProps> = ({ tools, onDelete }) => {
  if (tools.length === 0) {
    return (
      <div className="py-20 text-center bg-background-secondary/30 rounded-3xl border border-dashed border-border-primary">
        <Plug size={48} weight="duotone" className="mx-auto text-text-tertiary/20 mb-4" />
        <p className="text-text-tertiary font-medium">No tools registered in this space.</p>
        <p className="text-[10px] text-text-tertiary/70 mt-1 uppercase tracking-widest">Register a webhook or API key to automate tasks.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <AnimatePresence mode="popLayout">
        {tools.map(tool => (
          <motion.div
            key={tool.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="group relative bg-background-secondary border border-border-primary rounded-2xl p-5 shadow-sm hover:border-text-tertiary/30 transition-all flex flex-col min-h-[140px]"
          >
            <div className="flex items-start justify-between mb-auto">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-background-primary border border-border-primary shadow-inner">
                  {getToolIcon(tool.type)}
                </div>
                <div>
                  <h3 className="font-bold text-text-primary text-sm">{tool.name}</h3>
                  <div className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border mt-1 ${getToolBadgeColor(tool.type)}`}>
                    {tool.type.replace('_', ' ')}
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => {
                  if (confirm(`Delete ${tool.name}? This will permanently remove it from the space.`)) {
                    onDelete(tool.id);
                  }
                }}
                className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-text-tertiary hover:text-red-500 hover:bg-red-500/10 transition-all"
              >
                <Trash size={16} />
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-border-primary/50 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${tool.is_active ? 'bg-emerald-500' : 'bg-red-500'} shadow-[0_0_8px_rgba(0,0,0,0.5)]`} />
                <span className="text-[10px] font-bold text-text-tertiary tracking-widest uppercase">
                  {tool.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <span className="text-[10px] text-text-tertiary font-mono">
                {new Date(tool.created_at).toLocaleDateString()}
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
