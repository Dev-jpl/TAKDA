import type { Module } from "@/lib/module-runtime/types";

import { CALORIE_TRACKER } from "./calorie-tracker";

// Catalog of installable modules. The "+ Add module" picker on hub detail
// reads from here. Long-term this will be a remote registry — for now,
// modules ship in-app as TypeScript objects so we can iterate on the JSON
// shape alongside the renderer.

export interface CatalogEntry {
  /** Stable identifier kept in `modules.source` after install. Versioned
   *  so future upgrades can match old installs to a new definition. */
  source: string;
  name: string;
  blurb: string;
  /** SF Symbol name (iOS-native). Used for the module card on mobile. */
  sfSymbol: string;
  definition: Module;
}

export const MODULE_CATALOG: CatalogEntry[] = [
  {
    source: "calorie-tracker@1",
    name: "Calorie tracker",
    blurb: "Log meals, track totals against a daily goal.",
    sfSymbol: "fork.knife",
    definition: CALORIE_TRACKER,
  },
];

export function findInCatalog(source: string): CatalogEntry | null {
  return MODULE_CATALOG.find((c) => c.source === source) ?? null;
}
