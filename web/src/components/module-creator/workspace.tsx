"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { emptyModule, loadDraft, saveDraft } from "@/lib/module/draft";
import type {
  CreatorMode,
  DevicePreview,
  Module,
} from "@/lib/module/types";
import { SchemaMode } from "./modes/schema-mode";
import { InterfaceMode } from "./modes/interface-mode";
import { BehaviorMode } from "./modes/behavior-mode";

const MODES: { id: CreatorMode; label: string }[] = [
  { id: "schema", label: "Schema" },
  { id: "interface", label: "Interface" },
  { id: "behavior", label: "Behavior" },
];

const DEVICES: { id: DevicePreview; label: string; glyph: string }[] = [
  { id: "phone", label: "Phone", glyph: "▯" },
  { id: "tablet", label: "Tablet", glyph: "▭" },
  { id: "desktop", label: "Desktop", glyph: "▢" },
];

export function ModuleCreatorWorkspace() {
  const [module, setModule] = useState<Module>(emptyModule);
  const [mode, setMode] = useState<CreatorMode>("schema");
  const [device, setDevice] = useState<DevicePreview>("desktop");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const firstLoad = useRef(true);

  // Load draft once on mount.
  useEffect(() => {
    setModule(loadDraft());
  }, []);

  // Autosave on any change to module (skip the initial hydration tick).
  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    saveDraft(module);
    setSavedAt(new Date().toLocaleTimeString());
  }, [module]);

  const renameModule = useCallback((name: string) => {
    setModule((m) => ({ ...m, name }));
  }, []);

  const modeView = useMemo(() => {
    switch (mode) {
      case "schema":
        return <SchemaMode module={module} setModule={setModule} />;
      case "interface":
        return (
          <InterfaceMode module={module} setModule={setModule} device={device} />
        );
      case "behavior":
        return <BehaviorMode module={module} setModule={setModule} />;
    }
  }, [mode, module, device]);

  return (
    <div className="flex h-[calc(100vh-65px)] flex-col">
      <TopBar
        moduleName={module.name}
        onRename={renameModule}
        mode={mode}
        setMode={setMode}
        device={device}
        setDevice={setDevice}
        savedAt={savedAt}
        status={module.status}
      />
      <div className="flex flex-1 min-h-0">{modeView}</div>
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
  status,
}: {
  moduleName: string;
  onRename: (n: string) => void;
  mode: CreatorMode;
  setMode: (m: CreatorMode) => void;
  device: DevicePreview;
  setDevice: (d: DevicePreview) => void;
  savedAt: string | null;
  status: "draft" | "published";
}) {
  return (
    <div className="flex items-center gap-4 px-6 py-3 border-b border-rule bg-paper">
      <input
        value={moduleName}
        onChange={(e) => onRename(e.target.value)}
        className="bg-transparent text-base font-medium text-ink outline-none focus:bg-rule/30 rounded px-2 py-1 -ml-2 max-w-xs"
      />

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

        <span className="text-xs text-ink-faint">
          {status === "published" ? "✓ Published" : "· Draft"}
          {savedAt ? ` · saved ${savedAt}` : ""}
        </span>

        <button
          disabled
          className="rounded-md border border-ink bg-ink text-paper px-4 py-1.5 text-sm opacity-50 cursor-not-allowed"
          title="Publish coming soon"
        >
          Publish
        </button>
      </div>
    </div>
  );
}
