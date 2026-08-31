# TAKDA v3 — Prototype Plan (Finance vertical slice)

**Module:** Blueprint · touches: Compiler, Runtime, Studio MCP, Capability Engine, Finance Proving Ground
**Branch:** per ticket — see each section below
**GroveLab:** none — not yet asked; see "Open questions"

**Created:** 2026-08-31
**Window:** 2026-09-01 → 2026-09-11 (2 weeks)
**Status:** Prototype. Validation only — not production scope.
**Canonical concept doc:** WorkGrove TAKDA doc #31

## The question this prototype answers

> Can a Blueprint authored by an external AI over MCP compile deterministically
> into MDL that a universal runtime renders into a tool a person actually uses —
> without writing per-module code?

If yes, the v3 architecture is real and we scale it. If no, we find out in two
weeks instead of three months.

## Decisions this prototype assumes

- **ADR-001** — Blueprint is the canonical editable source. MDL is a
  deterministic, identity-preserving compile artifact. Nobody authors MDL.
- **ADR-005** — Capabilities are rendered, not written: the compile emits a
  Capability Manifest alongside MDL, and MCP tools are generated from it.
- Stable internal IDs are minted at the Blueprint layer and are the durable
  join key across MDL, capabilities and storage. Names and slugs are aliases.

## Explicitly out of scope

No TDD. No mobile. No SQLite. No encrypted backup. No Presentation layer or
visual builder port. No diagnostic metadata. No tiny local model. No Module MCP
(personal-data surface). No auth work. No marketplace.

These are all real and all deferred until the core loop is proven.

## Schedule

| Stage | Target | Window |
| ----- | ------ | ------ |
| 1 | Contract: Blueprint + MDL + identity | Sep 1–2 |
| 2 | Runtime: minimal web renderer | Sep 3–4 |
| 3 | Compiler + validator | Sep 7–8 |
| 4 | Studio MCP server | Sep 9–10 |
| 5 | Finance proving ground + go/no-go | Sep 11 |

Stage 1 is the critical path: everything downstream compiles against the
contract it produces. If stage 1 slips, the whole slice slips.

## Tasks

Numbered continuously and never reused. Every task names the files it touches —
that is the attachment point between this plan and its evidence.

### WG-TX-AJHJ94-00001-TK — Blueprint schema

**Module:** Blueprint
**Branch:** AJHJ94/task/00001-define-the-blueprint-schema-hand-written

1. **Stable identity scheme.** Branded opaque ids, minted once at the Blueprint
   layer, never derived from names.
   — `core/ids.ts`
2. **Blueprint intent schema.** Records, fields, actions, questions, views.
   Views carry an intent, not a layout.
   — `core/blueprint.ts`
3. **Hand-write the Expenses Blueprint** against the schema.
   — `core/blueprints/expenses.ts`
4. **Verify.** Typecheck under strict; confirm no spatial property leaked in.
   — `core/tsconfig.json`

### WG-TX-AJHJ94-00002-TK — Stable identity proof

**Module:** Stable Identity
**Branch:** AJHJ94/task/00002-stable-internal-id-scheme-and-minting

5. **Rename a field key and a record key** in the Expenses Blueprint.
   — `core/blueprints/expenses.ts`
6. **Demonstrate every id is unchanged** and no stored record is orphaned.
   — `core/identity-check.ts`

### WG-TX-AJHJ94-00003-TK — MDL v3 shape

**Module:** Compiler
**Branch:** AJHJ94/task/00003-define-mdl-v3-shape-and-hand

7. **Define the MDL execution contract** — deliberately smaller than v2's.
   — `core/mdl.ts`
8. **Hand-write the Expenses MDL** as the fixture the compiler must reproduce.
   — `core/mdl/expenses.ts`

### WG-TX-AJHJ94-00004-FE — Web renderer

**Module:** Web Renderer
**Branch:** AJHJ94/feature/00004-minimal-web-renderer-form-list

9. **Render form, list, stat and group blocks** from MDL.
   — `web/src/components/v3/renderer.tsx`, `web/src/components/v3/blocks.tsx`
10. **Degrade visibly on an unknown block** rather than crashing.
    — `web/src/components/v3/renderer.tsx`

### WG-TX-AJHJ94-00005-FE — Local store

**Module:** Local Store
**Branch:** AJHJ94/feature/00005-browser-local-record-store-against

11. **Persist records keyed by stable id**, surviving reload.
    — `web/src/lib/v3/store.ts`
12. **Keep the store interface narrow** enough to reimplement on SQLite.
    — `web/src/lib/v3/store.ts`

### WG-TX-AJHJ94-00006-FE — Runtime route

**Module:** Runtime
**Branch:** AJHJ94/feature/00006-runtime-route-rendering-the-hand-written

13. **Wire definition, renderer and store** into a usable route.
    — `web/src/app/(app)/v3/[slug]/page.tsx`
14. **Log a real expense end to end** with no expenses-specific code in the path.
    — `web/src/app/(app)/v3/[slug]/page.tsx`

## Definition of done

The prototype succeeds when, from a fresh Claude session with only the Studio
MCP connected:

1. "I want to track my expenses" produces a valid published Module.
2. Opening the runtime renders it with no module-specific code.
3. A real expense can be logged and appears in the list and the total.
4. "Add bills, and mark-paid should record the expense" extends the Module.
5. Marking a bill paid creates exactly one Expense, twice in a row.

Anything past step 3 is upside. Steps 1-3 are the actual test.

## Open questions

- **Lifecycle branches.** RULES §6 defines `development → staging → main` and
  names `forgejo` as the remote. This repository has neither: the branches are
  `main`, `v1`, `v2`, `v3`, and the remote is `origin` on GitHub. Which branch
  plays `development` here needs deciding before anything merges.
- **GroveLab.** RULES §7 requires asking whether one exists before planning.
  Asked as part of this plan's review; not yet answered.
- **Plan granularity.** RULES §7 implies one plan per ticket (singular Module
  and Branch in the header). This is one plan covering six tickets, with
  per-ticket sections as the compromise. Split if that is wrong.
