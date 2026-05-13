"use client";

import type { Dispatch, SetStateAction } from "react";
import type { Module } from "@/lib/module/types";
import { EmptyState, PanelHeading, ThreePanel } from "../three-panel";

export function BehaviorMode({
  module: _module,
}: {
  module: Module;
  setModule: Dispatch<SetStateAction<Module>>;
}) {
  return (
    <ThreePanel
      left={
        <>
          <PanelHeading>Flows</PanelHeading>
          <EmptyState>
            Wire interactions between screens, define computed properties and
            agent behaviors here.
          </EmptyState>
          <PanelHeading>Computed</PanelHeading>
          <EmptyState>No computed properties yet.</EmptyState>
        </>
      }
      center={
        <div className="p-10 text-center text-ink-muted">
          <p className="text-sm">Behavior canvas</p>
          <p className="text-xs mt-1 text-ink-faint">
            Wiring + Run mode · coming next
          </p>
        </div>
      }
      right={
        <>
          <PanelHeading>Interaction settings</PanelHeading>
          <EmptyState>Select a wire to configure it.</EmptyState>
        </>
      }
    />
  );
}
