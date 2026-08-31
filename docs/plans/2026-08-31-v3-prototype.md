# TAKDA v3 — Prototype Plan (Finance vertical slice)

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

## Stages

1. **Contract** — Blueprint schema + MDL shape + stable identity scheme.
   Hand-write the Expenses Blueprint by hand. No tooling yet.
2. **Runtime** — fresh minimal web renderer against hand-written MDL:
   form, list, stat. Records in browser-local storage.
3. **Compiler** — Blueprint → MDL + Capability Manifest, plus the validator.
   Same hand-written Blueprint must now produce the MDL from stage 1.
4. **Studio MCP** — stdio MCP server: primitives, validate, publish, list, get.
   Connected to a real Claude client.
5. **Proving ground** — Expenses authored *by prompt*, then Bills, proving
   `mark_paid` creates exactly one linked Expense.

## Definition of done

The prototype succeeds when, from a fresh Claude session with only the Studio
MCP connected:

1. "I want to track my expenses" produces a valid published Module.
2. Opening the runtime renders it with no module-specific code.
3. A real expense can be logged and appears in the list and the total.
4. "Add bills, and mark-paid should record the expense" extends the Module.
5. Marking a bill paid creates exactly one Expense, twice in a row.

Anything past step 3 is upside. Steps 1-3 are the actual test.

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
