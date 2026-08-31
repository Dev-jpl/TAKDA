# ADR-001 — The Blueprint is canonical; MDL is compiled

**Status:** accepted · 2026-08-31

## Context

v2 shipped a capable visual builder — roughly 10,000 lines across three files —
that edits an MDL-shaped document directly. v3 wants AI to author modules from a
sentence. Those two facts collide: if AI rewrites the document the builder owns,
hand-tuned work is destroyed on every regeneration.

The concept doc left "editable" undefined, which hid three incompatible products
behind one word: a form editor, a conversation, or a canvas.

## Decision

Two source layers, one compile target.

```
Blueprint (intent)      ← AI via Studio MCP · structured editor
        +
Presentation (spatial)  ← visual builder
        ↓  deterministic, identity-preserving compile
      MDL               ← nobody authors this
        ↓
     Runtime
```

- The **Blueprint** is the canonical editable source of a Module's intent.
- A sparse **Presentation** layer holds spatial refinement, and only what was
  deliberately overridden.
- **MDL** is a compile artifact. It is never hand-authored.
- **Studio MCP** is the primary v3.0 authoring surface.
- The **visual builder** survives as an optional refinement path, writing
  Presentation and structural Blueprint edits — not MDL.
- **Stable internal ids** are minted once at the Blueprint layer and are the
  durable join key across MDL nodes, Presentation overrides, capability
  identifiers and storage columns. Names, keys and slugs are aliases.

The altitude rule: if a property would change on a redesign but not on a
rethink, it belongs in Presentation, not the Blueprint.

## Consequences

Regenerating a Blueprint no longer destroys layout, because the overlay
reattaches by id. Renaming a record breaks nothing — not automations, not
layout, not existing rows — because no id changed. Compile must be
*identity-preserving*, which is a stronger property than merely deterministic.

The builder stops being the product's front door. Most people will never open
it, which is precisely what makes it safe to keep.

## What it costs

v2's builder reads and writes MDL-shaped state directly, so adopting this is a
port of its data layer. That is real work — but it is a port under working
interaction code, not a rebuild of the interaction.

Presentation is deferred in the first prototype. Until it exists, the compiler
owns every spatial decision, and some will be wrong.
