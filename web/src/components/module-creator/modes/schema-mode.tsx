"use client";

import type { Dispatch, SetStateAction } from "react";
import type { Module } from "@/lib/module/types";
import { EmptyState, PanelHeading, ThreePanel } from "../three-panel";

export function SchemaMode({
  module,
  setModule: _setModule,
}: {
  module: Module;
  setModule: Dispatch<SetStateAction<Module>>;
}) {
  return (
    <ThreePanel
      left={
        <>
          <PanelHeading>Collections</PanelHeading>
          {module.collections.length === 0 ? (
            <EmptyState>
              No collections yet. Add one to start defining your schema.
            </EmptyState>
          ) : (
            <ul className="px-2 py-2 space-y-0.5">
              {module.collections.map((c) => (
                <li
                  key={c.id}
                  className="px-3 py-2 rounded text-sm text-ink-muted hover:bg-rule/30 cursor-pointer"
                >
                  {c.name}
                </li>
              ))}
            </ul>
          )}
          <div className="px-3 py-2">
            <button
              disabled
              className="w-full text-left text-sm text-ink-faint border border-dashed border-rule rounded px-3 py-2 cursor-not-allowed"
              title="Add collection — coming next"
            >
              + Add collection
            </button>
          </div>
        </>
      }
      center={
        <div className="p-10 text-center text-ink-muted">
          <p className="text-sm">Select a collection to edit its fields.</p>
          <p className="text-xs mt-1 text-ink-faint">
            Schema editor · coming next
          </p>
        </div>
      }
      right={
        <>
          <PanelHeading>Field settings</PanelHeading>
          <EmptyState>Select a field to configure it.</EmptyState>
        </>
      }
    />
  );
}
