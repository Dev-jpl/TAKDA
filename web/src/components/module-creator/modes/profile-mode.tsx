"use client";

import type { Dispatch, SetStateAction } from "react";
import type { Module, ModuleProfile } from "@/lib/module/types";
import { IconPicker } from "@/components/module-icon";

const CATEGORIES = [
  "Health",
  "Productivity",
  "Finance",
  "Learning",
  "Lifestyle",
  "Work",
  "Creative",
  "Other",
];

export function ProfileMode({
  module,
  setModule,
}: {
  module: Module;
  setModule: Dispatch<SetStateAction<Module>>;
}) {
  const setProfile = (patch: Partial<ModuleProfile>) =>
    setModule((m) => ({ ...m, profile: { ...m.profile, ...patch } }));

  const setName = (name: string) => setModule((m) => ({ ...m, name }));

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto px-8 py-10 space-y-10">
        <section>
          <h2 className="text-xl font-medium">Profile</h2>
          <p className="text-sm text-ink-muted mt-1">
            How your module appears in lists, on cards, and (later) the
            marketplace.
          </p>
        </section>

        <Field label="Icon" hint="Search and pick — used on home & module cards">
          <IconPicker
            value={module.profile.icon}
            onChange={(next) => setProfile({ icon: next })}
          />
        </Field>

        <Field label="Name">
          <input
            value={module.name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1.5 text-base"
          />
        </Field>

        <Field label="Tagline" hint="A one-line summary, shown on cards">
          <input
            value={module.profile.tagline ?? ""}
            onChange={(e) => setProfile({ tagline: e.target.value })}
            placeholder="What does this module do?"
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1.5 text-sm"
          />
        </Field>

        <Field label="Description" hint="Markdown supported later">
          <textarea
            value={module.profile.description ?? ""}
            onChange={(e) => setProfile({ description: e.target.value })}
            rows={5}
            placeholder="What it captures, who it's for, how to use it."
            className="w-full bg-transparent border border-rule focus:border-ink outline-none rounded p-3 text-sm resize-y"
          />
        </Field>

        <Field label="Category">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => {
              const active = module.profile.category === c;
              return (
                <button
                  key={c}
                  onClick={() => setProfile({ category: c })}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    active
                      ? "border-ink bg-ink text-paper"
                      : "border-rule text-ink-muted hover:border-ink hover:text-ink"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Tags" hint="Comma-separated">
          <input
            value={(module.profile.tags ?? []).join(", ")}
            onChange={(e) =>
              setProfile({
                tags: e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
            placeholder="daily, fitness, journaling..."
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1.5 text-sm"
          />
        </Field>

        <Field label="Cover color">
          <input
            type="color"
            value={module.profile.coverColor ?? "#faf8f3"}
            onChange={(e) => setProfile({ coverColor: e.target.value })}
            className="h-9 w-16 rounded border border-rule cursor-pointer"
          />
        </Field>

        <Field label="Visibility">
          <div className="flex gap-2">
            {(["private", "public"] as const).map((v) => {
              const active = module.profile.visibility === v;
              return (
                <button
                  key={v}
                  onClick={() => setProfile({ visibility: v })}
                  className={`text-sm px-4 py-2 rounded border transition-colors ${
                    active
                      ? "border-ink bg-ink text-paper"
                      : "border-rule text-ink-muted hover:border-ink hover:text-ink"
                  }`}
                >
                  {v === "private" ? "Private (just me)" : "Public (shareable)"}
                </button>
              );
            })}
          </div>
        </Field>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2">
        <div className="text-xs text-ink font-medium">{label}</div>
        {hint && <div className="text-[11px] text-ink-faint mt-0.5">{hint}</div>}
      </div>
      {children}
    </div>
  );
}
