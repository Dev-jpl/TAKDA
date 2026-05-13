"use client";

import { useState } from "react";
import type { CreatorMode, Module, PublishCheck } from "@/lib/module/types";

export function PublishModal({
  module,
  check,
  onClose,
  onPublish,
  onJumpToProfile,
}: {
  module: Module;
  check: PublishCheck;
  onClose: () => void;
  onPublish: (notes: string) => void;
  onJumpToProfile: (mode: CreatorMode) => void;
}) {
  const [notes, setNotes] = useState("");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-md border border-rule bg-paper shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-rule">
          <h2 className="text-base font-medium">
            {module.status === "published" ? "Publish update" : "Publish module"}
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            v{module.status === "published" ? module.version + 1 : module.version}{" "}
            · {module.name}
          </p>
        </div>

        <div className="px-6 py-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink-faint mb-3">
            Before publishing
          </div>
          <ul className="space-y-2">
            {check.items.map((item) => (
              <li
                key={item.key}
                className="flex items-start gap-3 text-sm"
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] mt-0.5 shrink-0 ${
                    item.status === "ok"
                      ? "bg-ink text-paper"
                      : "border border-ink-faint text-ink-faint"
                  }`}
                >
                  {item.status === "ok" ? "✓" : "✕"}
                </span>
                <div className="flex-1">
                  <div
                    className={
                      item.status === "ok" ? "text-ink" : "text-ink-muted"
                    }
                  >
                    {item.label}
                  </div>
                  {item.status === "missing" && item.hint && (
                    <div className="text-xs text-ink-faint mt-0.5 flex items-center gap-2">
                      {item.hint}
                      {(item.key === "icon" ||
                        item.key === "tagline" ||
                        item.key === "category" ||
                        item.key === "name") && (
                        <button
                          onClick={() => onJumpToProfile("profile")}
                          className="underline underline-offset-2 hover:text-ink"
                        >
                          Open profile
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <div className="text-[10px] uppercase tracking-[0.18em] text-ink-faint mb-2">
              Version notes <span className="normal-case">(optional)</span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="What changed in this release?"
              className="w-full bg-transparent border border-rule focus:border-ink outline-none rounded p-3 text-sm resize-y"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-rule flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-ink-muted hover:text-ink rounded"
          >
            Cancel
          </button>
          <button
            disabled={!check.ok}
            onClick={() => onPublish(notes)}
            className="rounded-md border border-ink bg-ink text-paper px-4 py-1.5 text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {module.status === "published" ? "Publish update" : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}
