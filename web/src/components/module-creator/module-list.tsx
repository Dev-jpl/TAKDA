"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createModule,
  deleteModule,
  listModules,
  persistModule,
} from "@/lib/module/draft";
import { TEMPLATES, forkTemplate, type Blueprint } from "@/lib/module/templates";
import { ModuleIcon } from "@/components/module-icon";
import type { Module } from "@/lib/module/types";

export function ModuleList() {
  const router = useRouter();
  const [modules, setModules] = useState<Module[] | null>(null);

  useEffect(() => {
    setModules(listModules());
  }, []);

  const onCreate = () => {
    const name = window.prompt("Name your module", "Untitled module");
    if (!name) return;
    const m = createModule(name);
    router.push(`/module-creator/${m.id}`);
  };

  const onFork = (blueprint: Blueprint) => {
    const m = persistModule(forkTemplate(blueprint));
    router.push(`/module-creator/${m.id}`);
  };

  const onDelete = (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This can't be undone.`)) return;
    deleteModule(id);
    setModules(listModules());
  };

  return (
    <div className="flex flex-col">
      <div className="px-8 py-6 border-b border-rule bg-paper flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-ink">Module Creator</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Your modules. Each is a schema, an interface, and the behaviors that
            tie them together.
          </p>
        </div>
        <button
          onClick={onCreate}
          className="rounded-md border border-ink bg-ink text-paper px-4 py-2 text-sm hover:opacity-90 transition-opacity"
        >
          + New module
        </button>
      </div>

      {/* Templates row — always visible for quick forking. */}
      <div className="px-8 pt-8 pb-4">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-xs uppercase tracking-[0.18em] text-ink-faint">
            Start from a template
          </h2>
          <span className="text-[10px] text-ink-faint">
            Fork to your library — yours to edit.
          </span>
        </div>
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {TEMPLATES.map((t) => (
            <li key={t.key}>
              <TemplateCard blueprint={t} onFork={() => onFork(t)} />
            </li>
          ))}
        </ul>
      </div>

      <div className="px-8 pt-2 pb-8">
        <h2 className="text-xs uppercase tracking-[0.18em] text-ink-faint mb-3">
          Your modules
        </h2>
        {modules == null ? null : modules.length === 0 ? (
          <EmptyState onCreate={onCreate} />
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((m) => (
              <li key={m.id}>
                <ModuleCard module={m} onDelete={onDelete} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TemplateCard({
  blueprint,
  onFork,
}: {
  blueprint: Blueprint;
  onFork: () => void;
}) {
  return (
    <button
      onClick={onFork}
      className="group w-full text-left rounded-md border border-rule bg-paper p-4 hover:border-ink transition-colors"
    >
      <div className="flex items-start gap-2.5">
        <span className="w-9 h-9 rounded-md border border-rule flex items-center justify-center text-ink-muted shrink-0 group-hover:border-ink group-hover:text-ink transition-colors">
          <blueprint.icon size={18} weight="regular" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-ink truncate">
            {blueprint.name}
          </div>
          <div className="text-[11px] text-ink-muted line-clamp-2 mt-0.5">
            {blueprint.tagline}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-ink-faint">
        {blueprint.category && (
          <>
            <span>{blueprint.category}</span>
            <span>·</span>
          </>
        )}
        <span>{blueprint.collections.length} coll</span>
        {blueprint.screens && (
          <>
            <span>·</span>
            <span>{blueprint.screens.length} scr</span>
          </>
        )}
        <span className="ml-auto normal-case tracking-normal text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity">
          Fork →
        </span>
      </div>
    </button>
  );
}

function ModuleCard({
  module,
  onDelete,
}: {
  module: Module;
  onDelete: (id: string, name: string) => void;
}) {
  return (
    <div className="group relative rounded-md border border-rule bg-paper p-5 hover:border-ink transition-colors">
      <Link
        href={`/module-creator/${module.id}`}
        className="absolute inset-0 rounded-md"
        aria-label={`Edit ${module.name}`}
      />
      <div className="flex items-start gap-3">
        <div
          className="h-10 w-10 rounded-md border border-rule flex items-center justify-center text-ink-muted shrink-0"
          style={
            module.profile.coverColor
              ? { background: module.profile.coverColor }
              : undefined
          }
        >
          {module.profile.icon ? (
            <ModuleIcon icon={module.profile.icon} size={20} />
          ) : (
            <span className="text-xs text-ink-faint">·</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium text-ink truncate">
            {module.name}
          </h3>
          <p className="text-xs text-ink-muted truncate mt-0.5">
            {module.profile.tagline ?? <span className="italic">no tagline</span>}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-ink-faint">
        <StatusPill module={module} />
        <span>·</span>
        <span>v{module.version}</span>
        <span>·</span>
        <span>{module.collections.length} coll</span>
        <span>·</span>
        <span>{module.screens.length} scr</span>
      </div>

      <button
        onClick={(e) => {
          e.preventDefault();
          onDelete(module.id, module.name);
        }}
        className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-ink-faint hover:text-ink"
        aria-label="Delete module"
      >
        ✕
      </button>
    </div>
  );
}

function StatusPill({ module }: { module: Module }) {
  if (module.status === "draft") {
    return <span>draft</span>;
  }
  if (module.hasUnpublishedChanges) {
    return <span>● unpublished changes</span>;
  }
  return <span>✓ published</span>;
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="border border-dashed border-rule rounded-md py-16 text-center">
      <p className="text-base text-ink">No modules yet.</p>
      <p className="text-sm text-ink-muted mt-1">
        Start your first one to see it here.
      </p>
      <button
        onClick={onCreate}
        className="mt-6 rounded-md border border-ink bg-ink text-paper px-4 py-2 text-sm hover:opacity-90 transition-opacity"
      >
        + New module
      </button>
    </div>
  );
}
