"use client";

import type { Dispatch, SetStateAction } from "react";
import type { DevicePreview, Module } from "@/lib/module/types";
import { EmptyState, PanelHeading, ThreePanel } from "../three-panel";

const DEVICE_WIDTH: Record<DevicePreview, string> = {
  phone: "390px",
  tablet: "820px",
  desktop: "100%",
};

export function InterfaceMode({
  module,
  device,
}: {
  module: Module;
  setModule: Dispatch<SetStateAction<Module>>;
  device: DevicePreview;
}) {
  return (
    <ThreePanel
      left={
        <>
          <PanelHeading>Screens</PanelHeading>
          {module.screens.length === 0 ? (
            <EmptyState>
              No screens yet. Add one to start designing the interface.
            </EmptyState>
          ) : (
            <ul className="px-2 py-2 space-y-0.5">
              {module.screens.map((s) => (
                <li
                  key={s.id}
                  className="px-3 py-2 rounded text-sm text-ink-muted hover:bg-rule/30"
                >
                  {s.name}
                </li>
              ))}
            </ul>
          )}
          <div className="px-3 py-2">
            <button
              disabled
              className="w-full text-left text-sm text-ink-faint border border-dashed border-rule rounded px-3 py-2 cursor-not-allowed"
            >
              + Add screen
            </button>
          </div>
          <PanelHeading>Layers</PanelHeading>
          <EmptyState>Select a screen to see its layers.</EmptyState>
        </>
      }
      center={
        <div className="flex flex-col items-center p-8 min-h-full bg-paper-dot/10">
          <div
            className="rounded-md border border-rule bg-paper shadow-sm transition-all"
            style={{
              width: DEVICE_WIDTH[device],
              maxWidth: "100%",
              minHeight: "70vh",
            }}
          >
            <div className="p-10 text-center text-ink-muted">
              <p className="text-sm">Empty canvas</p>
              <p className="text-xs mt-1 text-ink-faint">
                Add a screen to start designing
              </p>
            </div>
          </div>
        </div>
      }
      right={
        <>
          <PanelHeading>Element settings</PanelHeading>
          <EmptyState>Select an element to configure it.</EmptyState>
        </>
      }
    />
  );
}
