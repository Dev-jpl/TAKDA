"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  checkPublishable,
  loadModule,
  publishModule,
  saveModule,
} from "@/lib/module/draft";
import type {
  CreatorMode,
  DevicePreview,
  Module,
} from "@/lib/module/types";
import { SchemaMode } from "./modes/schema-mode";
import { InterfaceMode } from "./modes/interface-mode";
import { BehaviorMode } from "./modes/behavior-mode";
import { ProfileMode } from "./modes/profile-mode";
import { PublishModal } from "./publish-modal";
import { ThemeToggle } from "@/components/theme-toggle";

const MODES: { id: CreatorMode; label: string }[] = [
  { id: "schema", label: "Schema" },
  { id: "interface", label: "Interface" },
  { id: "behavior", label: "Behavior" },
  { id: "profile", label: "Profile" },
];

const DEVICES: { id: DevicePreview; label: string; glyph: string }[] = [
  { id: "phone", label: "Phone", glyph: "▯" },
  { id: "tablet", label: "Tablet", glyph: "▭" },
  { id: "desktop", label: "Desktop", glyph: "▢" },
];

export function ModuleCreatorWorkspace({ moduleId }: { moduleId: string }) {
  const [module, setModule] = useState<Module | null>(null);
  const [mode, setMode] = useState<CreatorMode>("schema");
  const [device, setDevice] = useState<DevicePreview>("desktop");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const firstLoad = useRef(true);

  useEffect(() => {
    const m = loadModule(moduleId);
    setModule(m);
  }, [moduleId]);

  useEffect(() => {
    if (!module) return;
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    saveModule(module);
    setSavedAt(new Date().toLocaleTimeString());
  }, [module]);

  const renameModule = useCallback((name: string) => {
    setModule((m) => (m ? { ...m, name } : m));
  }, []);

  const publishCheck = useMemo(
    () => (module ? checkPublishable(module) : null),
    [module],
  );

  const setModuleSafe = setModule as React.Dispatch<
    React.SetStateAction<Module>
  >;

  const modeView = useMemo(() => {
    if (!module) return null;
    switch (mode) {
      case "schema":
        return <SchemaMode module={module} setModule={setModuleSafe} />;
      case "interface":
        return (
          <InterfaceMode
            module={module}
            setModule={setModuleSafe}
            device={device}
          />
        );
      case "behavior":
        return <BehaviorMode module={module} setModule={setModuleSafe} />;
      case "profile":
        return <ProfileMode module={module} setModule={setModuleSafe} />;
    }
  }, [mode, module, device, setModuleSafe]);

  if (!module) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center text-ink-muted">
          <p className="text-sm">Module not found.</p>
          <Link
            href="/module-creator"
            className="text-xs text-ink underline underline-offset-2 mt-2 inline-block"
          >
            Back to module list
          </Link>
        </div>
      </div>
    );
  }

  const onPublish = (notes: string) => {
    const next = publishModule(module.id, notes || undefined);
    if (next) {
      setModule(next);
      firstLoad.current = true; // skip the next autosave tick
    }
    setPublishOpen(false);
  };

  return (
    <div className="flex h-screen flex-col">
      <TopBar
        moduleName={module.name}
        onRename={renameModule}
        mode={mode}
        setMode={setMode}
        device={device}
        setDevice={setDevice}
        savedAt={savedAt}
        module={module}
        onPublishClick={() => setPublishOpen(true)}
      />
      <div className="flex flex-1 min-h-0">{modeView}</div>
      {publishOpen && publishCheck && (
        <PublishModal
          module={module}
          check={publishCheck}
          onClose={() => setPublishOpen(false)}
          onPublish={onPublish}
          onJumpToProfile={(m) => {
            setPublishOpen(false);
            setMode(m);
          }}
        />
      )}
    </div>
  );
}

function TopBar({
  moduleName,
  onRename,
  mode,
  setMode,
  device,
  setDevice,
  savedAt,
  module,
  onPublishClick,
}: {
  moduleName: string;
  onRename: (n: string) => void;
  mode: CreatorMode;
  setMode: (m: CreatorMode) => void;
  device: DevicePreview;
  setDevice: (d: DevicePreview) => void;
  savedAt: string | null;
  module: Module;
  onPublishClick: () => void;
}) {
  return (
    <div className="flex items-center gap-4 px-6 py-3 border-b border-rule bg-paper">
      <Link
        href="/module-creator"
        className="text-ink-muted hover:text-ink text-sm shrink-0"
        title="Back to module list"
      >
        ←
      </Link>

      <div className="flex items-center gap-2 shrink-0">
        {module.profile.icon && (
          <span className="text-base leading-none">{module.profile.icon}</span>
        )}
        <input
          value={moduleName}
          onChange={(e) => onRename(e.target.value)}
          className="bg-transparent text-sm font-medium text-ink outline-none focus:bg-rule/30 rounded px-2 py-1 -ml-1 w-44"
        />
      </div>

      <div className="flex items-center rounded-md border border-rule overflow-hidden">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`px-4 py-1.5 text-sm transition-colors ${
              mode === m.id
                ? "bg-ink text-paper"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-3">
        {(mode === "interface" || mode === "behavior") && (
          <div className="flex items-center rounded-md border border-rule overflow-hidden">
            {DEVICES.map((d) => (
              <button
                key={d.id}
                onClick={() => setDevice(d.id)}
                title={d.label}
                className={`px-3 py-1.5 text-base leading-none transition-colors ${
                  device === d.id
                    ? "bg-ink text-paper"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {d.glyph}
              </button>
            ))}
          </div>
        )}

        <span className="text-xs text-ink-faint">
          <StatusBadge module={module} />
          {savedAt ? ` · saved ${savedAt}` : ""}
        </span>

        <ThemeToggle />

        <button
          onClick={onPublishClick}
          className="rounded-md border border-ink bg-ink text-paper px-4 py-1.5 text-sm hover:opacity-90 transition-opacity"
        >
          {module.status === "published" ? "Publish update" : "Publish"}
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ module }: { module: Module }) {
  if (module.status === "draft") return <span>· Draft</span>;
  if (module.hasUnpublishedChanges) return <span>● Unpublished changes</span>;
  return <span>✓ Published v{module.version}</span>;
}
