import type { FieldType, Module } from "./types";
import { emptyModule } from "./draft";
import {
  addCollection,
  addField,
  addScreen,
  generateFormFromCollection,
  updateCollection,
  updateField,
} from "./mutations";
import {
  ForkKnife,
  ListChecks,
  NotePencil,
  Wallet,
  type Icon,
} from "@phosphor-icons/react";

/** Each blueprint maps to a registered name in components/module-icon.tsx. */
const ICON_TOKEN: Record<string, string> = {
  calorie_tracker: "ph:ForkKnife",
  habit_log: "ph:ListChecks",
  notes: "ph:NotePencil",
  money: "ph:Wallet",
};

// ─── Blueprint shape ────────────────────────────────────────────────────────
// A template is a JSON-shaped description of a starter module. forkTemplate()
// composes it into a real Module using the same mutation helpers the editor
// uses, so templates can't drift away from valid module state.

export interface BlueprintField {
  key: string;
  label: string;
  type: FieldType;
  unit?: string;
  options?: { value: string; label: string }[];
}

export interface BlueprintCollection {
  key: string;
  name: string;
  singleton?: boolean;
  fields: BlueprintField[];
}

export interface BlueprintScreen {
  key: string;
  name: string;
  kind?: "page" | "modal";
  /** Auto-generate a capture form from this collection (by `key`). */
  formFor?: string;
  /** Auto-generate a list view of this collection (by `key`). */
  listFor?: string;
}

export interface Blueprint {
  key: string;
  name: string;
  icon: Icon;
  tagline: string;
  description?: string;
  category?: string;
  collections: BlueprintCollection[];
  screens?: BlueprintScreen[];
}

// ─── Blueprints ─────────────────────────────────────────────────────────────

export const TEMPLATES: Blueprint[] = [
  {
    key: "calorie_tracker",
    name: "Calorie tracker",
    icon: ForkKnife,
    tagline: "Log meals, see macros.",
    description:
      "Track what you eat with calories and macros. Set a daily goal and watch your progress.",
    category: "Health",
    collections: [
      {
        key: "meals",
        name: "Meals",
        fields: [
          { key: "name", label: "Meal", type: "text" },
          { key: "calories", label: "Calories", type: "number", unit: "kcal" },
          { key: "protein", label: "Protein", type: "number", unit: "g" },
          { key: "carbs", label: "Carbs", type: "number", unit: "g" },
          { key: "fat", label: "Fat", type: "number", unit: "g" },
        ],
      },
      {
        key: "targets",
        name: "Targets",
        singleton: true,
        fields: [
          {
            key: "daily_calories",
            label: "Daily calories",
            type: "number",
            unit: "kcal",
          },
          { key: "daily_protein", label: "Daily protein", type: "number", unit: "g" },
        ],
      },
    ],
    screens: [
      { key: "log_meal", name: "Log meal", kind: "modal", formFor: "meals" },
      { key: "meals_list", name: "Meals", kind: "page", listFor: "meals" },
      { key: "targets", name: "Targets", kind: "page", formFor: "targets" },
    ],
  },
  {
    key: "habit_log",
    name: "Habit log",
    icon: ListChecks,
    tagline: "Daily habits, simple yes/no.",
    description:
      "List habits you want to track and check them off each day.",
    category: "Health",
    collections: [
      {
        key: "habits",
        name: "Habits",
        fields: [
          { key: "name", label: "Habit", type: "text" },
          { key: "category", label: "Category", type: "select", options: [
            { value: "health", label: "Health" },
            { value: "work", label: "Work" },
            { value: "mind", label: "Mind" },
            { value: "other", label: "Other" },
          ] },
        ],
      },
      {
        key: "logs",
        name: "Logs",
        fields: [
          { key: "habit", label: "Habit", type: "text" },
          { key: "done", label: "Done", type: "boolean" },
          { key: "logged_on", label: "Logged on", type: "date" },
        ],
      },
    ],
    screens: [
      { key: "log_habit", name: "Log habit", kind: "modal", formFor: "logs" },
      { key: "habits_list", name: "Habits", kind: "page", listFor: "habits" },
    ],
  },
  {
    key: "notes",
    name: "Notes",
    icon: NotePencil,
    tagline: "Quick capture, plain text.",
    description: "A simple log of timestamped notes.",
    category: "Productivity",
    collections: [
      {
        key: "notes",
        name: "Notes",
        fields: [
          { key: "title", label: "Title", type: "text" },
          { key: "body", label: "Body", type: "long_text" },
        ],
      },
    ],
    screens: [
      { key: "new_note", name: "New note", kind: "modal", formFor: "notes" },
      { key: "all_notes", name: "All notes", kind: "page", listFor: "notes" },
    ],
  },
  {
    key: "money",
    name: "Expenses",
    icon: Wallet,
    tagline: "Track what you spend.",
    description: "Log expenses with a category. Sum by category in a donut chart.",
    category: "Finance",
    collections: [
      {
        key: "expenses",
        name: "Expenses",
        fields: [
          { key: "amount", label: "Amount", type: "number", unit: "$" },
          {
            key: "category",
            label: "Category",
            type: "select",
            options: [
              { value: "food", label: "Food" },
              { value: "transport", label: "Transport" },
              { value: "bills", label: "Bills" },
              { value: "fun", label: "Fun" },
              { value: "other", label: "Other" },
            ],
          },
          { key: "note", label: "Note", type: "text" },
        ],
      },
    ],
    screens: [
      { key: "log_expense", name: "Log expense", kind: "modal", formFor: "expenses" },
      { key: "expenses_list", name: "Expenses", kind: "page", listFor: "expenses" },
    ],
  },
];

// ─── Fork ────────────────────────────────────────────────────────────────────

export function forkTemplate(blueprint: Blueprint): Module {
  let module = emptyModule(blueprint.name);
  module = {
    ...module,
    profile: {
      ...module.profile,
      icon: ICON_TOKEN[blueprint.key],
      tagline: blueprint.tagline,
      description: blueprint.description,
      category: blueprint.category,
    },
  };

  // Collections — generate fresh ids, then apply blueprint key/label overrides.
  const collIdByKey: Record<string, string> = {};
  for (const bc of blueprint.collections) {
    const { module: m1, collection } = addCollection(module, bc.name);
    module = updateCollection(m1, collection.id, {
      key: bc.key,
      singleton: bc.singleton,
    });
    collIdByKey[bc.key] = collection.id;

    for (const bf of bc.fields) {
      const { module: m2, field } = addField(module, collection.id, bf.type);
      module = updateField(m2, collection.id, field.id, {
        key: bf.key,
        label: bf.label,
        ...(bf.unit && bf.type === "number" ? { unit: bf.unit } : {}),
        ...(bf.options &&
        (bf.type === "select" || bf.type === "multi_select")
          ? { options: bf.options }
          : {}),
      } as Partial<typeof field>);
    }
  }

  // Screens — create empty, then auto-fill from collections.
  for (const bs of blueprint.screens ?? []) {
    const { module: m3, screen } = addScreen(module, bs.name, bs.kind ?? "page");
    module = m3;

    if (bs.formFor) {
      const cid = collIdByKey[bs.formFor];
      if (cid) {
        module = generateFormFromCollection(module, screen.id, cid, {
          saveButton: true,
        });
      }
    }
    if (bs.listFor) {
      const cid = collIdByKey[bs.listFor];
      if (cid) {
        module = generateFormFromCollection(module, screen.id, cid, {
          list: true,
        });
      }
    }
  }

  return module;
}
