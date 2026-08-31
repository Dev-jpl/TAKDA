# ADR-003 — Capability existence is separate from capability exposure

**Status:** accepted · 2026-08-31

## Context

Capabilities derive mechanically from a Module definition, which is what makes a
user-invented module addressable at all. But deriving them is not the same as
offering them. An entity existing is a poor reason for an AI to be able to
delete rows from it.

Hand-naming capabilities was also considered and rejected: modules are
user-generated, so nobody owns the `finance.` namespace, and an AI inventing
namespace conventions per session will collide with itself.

## Decision

**Existence is mechanical. Exposure is policy.**

A record mechanically yields `create`, `get`, `list`, `update`, `delete`, plus
one capability per declared action or lifecycle transition. No actor receives
all of them by default.

Exposure is a three-state verdict per actor class:

| Verdict | Meaning |
| ------- | ------- |
| `PASS` | callable directly |
| `ASK` | callable, requires confirmation |
| `FAIL` | not offered to this actor at all |

`delete` defaults to `ASK` for non-UI actors, never `PASS`.

The durable contract is the **stable internal id**, not the human slug:

```
module_01H8… / entity_bill / mark_paid      ← durable
finance.bill.mark_paid                       ← human-facing alias
```

Renaming "Bills" to "Payables" changes the alias and nothing else.

## Consequences

The capability surface cannot drift from the schema, because it is derived from
it. Permissions attach to identifiers that survive renames. The same
`PASS`/`ASK`/`FAIL` vocabulary serves both this policy layer and a future local
verifier model, so there is one authorisation question rather than two.

## What it costs

A policy layer with sensible defaults must exist before any personal-data
surface ships, and getting those defaults wrong is a security problem rather
than a usability one.
