"use client";

import React, { useMemo } from 'react';
import { DynamicModuleView } from './DynamicModuleView';
import { ModuleDefinition, ModuleEntry } from '@/services/modules.service';

interface ModulePreviewProps {
  definition: Partial<ModuleDefinition>;
}

// Generate plausible mock entries from the schema so DynamicModuleView renders real UI
function buildMockEntries(definition: Partial<ModuleDefinition>): ModuleEntry[] {
  const schema = definition.schema ?? [];
  const layout = definition.layout ?? {};
  const dateField = layout.dateField ?? '';
  const today = new Date().toISOString().split('T')[0];

  const makeEntry = (overrides: Record<string, any> = {}): ModuleEntry => ({
    id: `mock-${Math.random()}`,
    module_def_id: 'mock-def',
    user_id: 'mock-user',
    hub_id: 'mock-hub',
    created_at: new Date().toISOString(),
    data: {
      ...schema.reduce((acc, field) => {
        if (field.type === 'number') acc[field.key] = Math.floor(Math.random() * 80) + 20;
        else if (field.type === 'datetime') acc[field.key] = new Date().toISOString();
        else if (field.type === 'date') acc[field.key] = today;
        else acc[field.key] = 'Sample';
        return acc;
      }, {} as Record<string, any>),
      ...(dateField ? { [dateField]: dateField.includes('at') ? new Date().toISOString() : today } : {}),
      ...overrides,
    },
  });

  // For goal_progress: create a few entries today so the bar is partially filled
  if (layout.type === 'goal_progress' && layout.aggregate) {
    const goal = layout.goal ?? 100;
    return [
      makeEntry({ [layout.aggregate]: Math.floor(goal * 0.35) }),
      makeEntry({ [layout.aggregate]: Math.floor(goal * 0.28) }),
    ];
  }

  // For trend_chart: create entries spread across the current month
  if (layout.type === 'trend_chart' && layout.aggregate && dateField) {
    const now = new Date();
    return Array.from({ length: 8 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), i * 3 + 1);
      const ds = d.toISOString().split('T')[0];
      return makeEntry({ [layout.aggregate]: Math.floor(Math.random() * 800) + 200, [dateField]: ds });
    });
  }

  return [makeEntry()];
}

export function ModulePreview({ definition }: ModulePreviewProps) {
  const mockEntries = useMemo(() => buildMockEntries(definition), [
    definition.layout?.type,
    definition.layout?.aggregate,
    definition.layout?.goal,
    definition.schema?.length,
  ]);

  const hasLayout = !!definition.layout?.type;

  return (
    <div className="border border-border-primary rounded-xl overflow-hidden bg-background-secondary shadow-lg">
      {/* Chrome bar */}
      <div className="px-4 py-2 bg-background-tertiary border-b border-border-primary flex items-center justify-between">
        <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Live Preview</span>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500/30" />
          <div className="w-2 h-2 rounded-full bg-yellow-500/30" />
          <div className="w-2 h-2 rounded-full bg-green-500/30" />
        </div>
      </div>

      {/* Widget header mimic */}
      <div className="px-4 py-2.5 border-b border-border-primary/50 flex items-center gap-2">
        <div className="w-5 h-5 rounded-md bg-accent-primary/15 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-accent-primary/60" />
        </div>
        <span className="text-[11px] font-bold text-text-primary">{definition.name || 'Untitled Module'}</span>
      </div>

      {hasLayout ? (
        <DynamicModuleView
          definition={definition as ModuleDefinition}
          hubId="mock-hub"
          _mockEntries={mockEntries}
        />
      ) : (
        <div className="px-4 py-10 flex flex-col items-center justify-center gap-2">
          <p className="text-xs text-text-tertiary italic">Select a layout to see preview</p>
        </div>
      )}
    </div>
  );
}
