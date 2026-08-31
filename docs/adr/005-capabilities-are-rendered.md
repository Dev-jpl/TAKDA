# ADR-005 — MCP tools are compiled, not hand-written

**Status:** accepted · 2026-08-31

## Context

Hand-writing MCP tools for user-generated modules is impossible: the modules do
not exist when the server is built. Separately, the concept doc wants UI, AI,
automation and MCP to converge on one Capability Engine — a goal that, if it
depends on developer discipline, will not survive contact with a deadline.

## Decision

**MCP is a second renderer.**

```
              Blueprint + Presentation
                        ↓ compile
    ┌───────────────────┼───────────────────┐
   MDL          Capability Manifest    Storage schema
    ↓                   ↓                   ↓
Runtime renders    MCP renders           local
UI for humans      tools for agents       tables
```

The runtime turns a declaration into screens. The MCP server turns the same
declaration into tools. Both are deterministic; neither requires AI. They cannot
drift, because they are compiled from one source rather than kept in step by
convention.

Two MCP surfaces, and the separation is architectural, not a setting:

- **Studio MCP** — authoring. No personal data. Runs anywhere.
- **Module MCP** — operating. Personal data. Location **unresolved** (see below).

ADR-003's verdict determines emission: `FAIL` capabilities are absent from the
tool list entirely, so an agent cannot attempt what it cannot see.

Tool listings are scoped by Space. Generated tools multiply — five modules times
six operations exceeds fifty before a single domain action — and MCP clients
degrade well before that.

## Consequences

A user-invented module is MCP-addressable the moment it publishes, with no work
from us. Capability contracts become testable without a UI.

## What it costs

**Module MCP has no execution location yet.** Personal records live on the
phone; MCP clients run on a laptop. Every option is unattractive: a desktop
runtime reopens sync; a phone-hosted server means pairing and sleep; a relay
cannot work because the server holds only ciphertext (ADR-002). This is
deliberately left open rather than answered badly.

Studio MCP is unaffected and ships first.
