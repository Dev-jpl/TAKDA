import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plug, LinkSimple, Key, LockKey, CodeBlock } from '@phosphor-icons/react';
import { spaceToolsService, SpaceToolCreate, SpaceToolType } from '@/services/spaceTools.service';

interface RegisterToolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegistered: () => void;
  spaceId: string;
}

const TOOL_TYPES: { id: SpaceToolType; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'webhook', label: 'Webhook', icon: LinkSimple, color: 'text-emerald-500' },
  { id: 'api_key', label: 'API Key', icon: Key, color: 'text-amber-500' },
  { id: 'oauth', label: 'OAuth App', icon: LockKey, color: 'text-blue-500' },
  { id: 'custom', label: 'Custom Node', icon: CodeBlock, color: 'text-purple-500' },
];

export const RegisterToolModal: React.FC<RegisterToolModalProps> = ({ isOpen, onClose, onRegistered, spaceId }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<SpaceToolCreate>>({
    space_id: spaceId,
    type: 'webhook',
    name: '',
    config: {},
  });

  const [configValues, setConfigValues] = useState<{ [key: string]: string }>({ url: '', key: '' });

  if (!isOpen) return null;

  const handleNext = () => {
    if (!formData.type) return;
    setStep(2);
  };

  const handleRegister = async () => {
    if (!formData.name) return;
    setLoading(true);
    try {
      await spaceToolsService.createTool({
        space_id: spaceId,
        name: formData.name,
        type: formData.type as SpaceToolType,
        config: configValues,
      });
      onRegistered();
      onClose();
      // Reset
      setStep(1);
      setFormData({ space_id: spaceId, type: 'webhook', name: '', config: {} });
      setConfigValues({ url: '', key: '' });
    } catch (error) {
      console.error(error);
      alert('Failed to register tool.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-background-primary/80 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-xl bg-background-secondary border border-border-primary rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <header className="px-6 py-4 flex items-center justify-between border-b border-border-primary/50 relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Plug size={16} weight="bold" />
              </div>
              <h2 className="text-lg font-bold text-text-primary">
                {step === 1 ? 'Configure Integration' : 'Finalize Tool'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-background-tertiary flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors"
            >
              <X size={14} weight="bold" />
            </button>
          </header>

          <div className="p-6 overflow-y-auto flex-1">
            {step === 1 ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-text-tertiary uppercase tracking-widest mb-3">
                    Select Tool Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {TOOL_TYPES.map(type => (
                      <button
                        key={type.id}
                        onClick={() => setFormData({ ...formData, type: type.id })}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          formData.type === type.id 
                            ? 'bg-background-tertiary border-amber-500/50 shadow-sm' 
                            : 'bg-background-primary border-border-primary/50 hover:border-border-primary'
                        }`}
                      >
                        <type.icon size={24} className={`${type.color} mb-3`} weight="duotone" />
                        <h3 className="font-bold text-sm text-text-primary">{type.label}</h3>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-text-tertiary uppercase tracking-widest mb-2">
                    Internal Tool Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. My Custom Webhook"
                    className="w-full bg-background-primary border border-border-primary rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
                    autoFocus
                  />
                </div>

                {formData.type === 'webhook' && (
                  <div>
                    <label className="block text-xs font-bold text-text-tertiary uppercase tracking-widest mb-2">
                      Target URL
                    </label>
                    <input
                      type="url"
                      value={configValues.url}
                      onChange={e => setConfigValues({ ...configValues, url: e.target.value })}
                      placeholder="https://hook.us1.make.com/..."
                      className="w-full bg-background-primary border border-border-primary rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 transition-colors font-mono"
                    />
                  </div>
                )}

                {formData.type === 'api_key' && (
                  <div>
                    <label className="block text-xs font-bold text-text-tertiary uppercase tracking-widest mb-2">
                      Secret Key
                    </label>
                    <input
                      type="password"
                      value={configValues.key}
                      onChange={e => setConfigValues({ ...configValues, key: e.target.value })}
                      placeholder="sk-..."
                      className="w-full bg-background-primary border border-border-primary rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 transition-colors font-mono"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <footer className="p-6 bg-background-tertiary/30 border-t border-border-primary/50 flex justify-between gap-3">
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="px-6 py-2.5 rounded-xl font-bold text-xs text-text-tertiary hover:text-text-primary transition-colors"
              >
                Back
              </button>
            )}
            <div className="flex-1" />
            <button
              onClick={step === 1 ? handleNext : handleRegister}
              disabled={loading || (step === 2 && !formData.name)}
              className="px-6 py-2.5 rounded-xl font-bold text-xs bg-amber-500 text-white shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? 'Processing...' : step === 1 ? 'Configure payload' : 'Register Tool'}
            </button>
          </footer>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
