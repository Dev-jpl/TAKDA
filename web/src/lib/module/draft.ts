import type { Module } from "./types";

const STORAGE_KEY = "takda.module.draft";

export function emptyModule(): Module {
  const now = new Date().toISOString();
  return {
    id: "draft",
    name: "Untitled module",
    slug: "untitled-module",
    status: "draft",
    version: 1,
    createdAt: now,
    updatedAt: now,
    collections: [],
    computed: [],
    screens: [],
    wires: [],
  };
}

export function loadDraft(): Module {
  if (typeof window === "undefined") return emptyModule();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyModule();
    return JSON.parse(raw) as Module;
  } catch {
    return emptyModule();
  }
}

export function saveDraft(module: Module): void {
  if (typeof window === "undefined") return;
  const next: Module = {
    ...module,
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
