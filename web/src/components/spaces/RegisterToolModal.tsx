import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plug, LinkSimple, Key, LockKey, CodeBlock, ArrowLeft, Plus } from '@phosphor-icons/react';
import { spaceToolsService, SpaceToolCreate, SpaceToolType } from '@/services/spaceTools.service';

interface RegisterToolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegistered: () => void;
  spaceId: string;
}

const TOOL_TYPES: { id: SpaceToolType; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'webhook',  label: 'Webhook',     icon: LinkSimple, description: 'Send data to a URL on trigger' },
  { id: 'api_key',  label: 'API Key',     icon: Key,        description: 'Authenticate with a secret key' },
  { id: 'oauth',    label: 'OAuth App',   icon: LockKey,    description: 'Connect via OAuth 2.0' },
  { id: 'custom',   label: 'Custom Node', icon: CodeBlock,  description: 'Define a custom integration' },
];

export const RegisterToolModal: React.FC<RegisterToolModalProps> = ({ isOpen, onClose, onRegistered, spaceId }) => {
  const [step,         setStep]         = useState<1 | 2>(1);
  const [loading,      setLoading]      = useState(false);
  const [formData,     setFormData]     = useState<Partial<SpaceToolCreate>>({
    space_id: spaceId, type: 'webhook', name: '', config: {},
  });
  const [configValues, setConfigValues] = useState<{ [key: string]: string }>({ url: '', key: '' });

  if (!isOpen) return null;

  async function handleRegister() {
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
      setStep(1);
      setFormData({ space_id: spaceId, type: 'webhook', name: '', config: {} });
      setConfigValues({ url: '', key: '' });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-background-primary/80 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 12 }}
          className="relative w-full max-w-lg bg-background-secondary border border-border-primary rounded-xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <header className="px-6 py-4 flex items-center justify-between border-b border-border-primary">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-modules-knowledge/10 flex items-center justify-center border border-modules-knowledge/20">
                <Plug size={16} weight="bold" className="text-modules-knowledge" />
              </div>
              <div>
                <h2 className="text-base font-bold text-text-primary">
                  {step === 1 ? 'Register Tool' : 'Configure Tool'}
                </h2>
                <p className="text-[11px] text-text-tertiary">
                  Step {step} of 2
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-background-tertiary rounded-lg transition-all text-text-tertiary hover:text-text-primary"
            >
              <X size={16} />
            </button>
          </header>

          {/* Body */}
          <div className="p-6 overflow-y-auto">
            {step === 1 ? (
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Tool Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {TOOL_TYPES.map(type => (
                    <button
                      key={type.id}
                      onClick={() => setFormData({ ...formData, type: type.id })}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        formData.type === type.id
                          ? 'bg-background-tertiary border-modules-knowledge/40'
                          : 'bg-background-primary border-border-primary hover:border-border-primary/80'
                      }`}
                    >
                      <type.icon
                        size={20}
                        weight="duotone"
                        className={`mb-2 ${formData.type === type.id ? 'text-modules-knowledge' : 'text-text-tertiary'}`}
                      />
                      <p className="font-bold text-sm text-text-primary">{type.label}</p>
                      <p className="text-[11px] text-text-tertiary mt-0.5">{type.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Name</label>
                  <input
                    autoFocus
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    onKeyDown={e => { if (e.key === 'Enter') handleRegister(); }}
                    placeholder="e.g. My Webhook"
                    className="bg-background-tertiary border border-border-primary rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-modules-knowledge/40 transition-all placeholder:text-text-tertiary"
                  />
                </div>

                {formData.type === 'webhook' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Target URL</label>
                    <input
                      type="url"
                      value={configValues.url}
                      onChange={e => setConfigValues({ ...configValues, url: e.target.value })}
                      placeholder="https://hook.us1.make.com/…"
                      className="bg-background-tertiary border border-border-primary rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-modules-knowledge/40 transition-all font-mono placeholder:text-text-tertiary"
                    />
                  </div>
                )}

                {formData.type === 'api_key' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Secret Key</label>
                    <input
                      type="password"
                      value={configValues.key}
                      onChange={e => setConfigValues({ ...configValues, key: e.target.value })}
                      placeholder="sk-…"
                      className="bg-background-tertiary border border-border-primary rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-modules-knowledge/40 transition-all font-mono placeholder:text-text-tertiary"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <footer className="px-6 py-4 border-t border-border-primary flex items-center justify-between gap-3">
            {step === 2 ? (
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-text-tertiary hover:text-text-primary transition-colors"
              >
                <ArrowLeft size={14} weight="bold" />
                Back
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={step === 1 ? () => setStep(2) : handleRegister}
              disabled={loading || (step === 2 && !formData.name?.trim())}
              className="flex items-center gap-2 px-6 py-2 rounded-xl font-bold text-sm bg-modules-knowledge text-white hover:bg-modules-knowledge/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : step === 1 ? (
                <>Next</>
              ) : (
                <>
                  <Plus size={14} weight="bold" />
                  Register Tool
                </>
              )}
            </button>
          </footer>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
