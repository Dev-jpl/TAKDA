# ADR-004 — Module diagnosis sends shape, never values

**Status:** accepted · 2026-08-31

## Context

Personal records are local and AI does not receive them. That is the right
default, but it leaves module *evolution* blind: when someone says "my Bills
module isn't working", the AI cannot see that `category` is 90% null, that
`notes` has never been used, or that `amount` has 400 rows while `recurrence`
has three.

Without something, AI writes a module once and can never maintain it.

## Decision

A third data class — **Diagnostic Metadata** — sitting between module
definitions and personal records.

- Computed **locally**.
- Contains **shape only**: row counts, null rates, distinct-value cardinality,
  date ranges, which actions are actually invoked. Never a value.
- Values are **bucketed**, not exact: `"rows": "100-500"`, `"null_rate": "high"`.
- Sent only on explicit request, and the **literal payload is shown to the user
  for approval before it leaves the device**.

The flow is: computed locally → user requests diagnosis → TAKDA displays exactly
what will leave → user approves → AI receives metadata, never values.

Bucketing is not cosmetic. Exact counts, rare-action tallies and precise date
ranges can fingerprint a person even with no values attached.

## Consequences

AI can maintain a module rather than only author it, without weakening the
local-first claim — because the user sees the exact payload each time rather
than trusting a policy.

## What it costs

A consent surface must be built and must stay legible. A dialogue people learn
to dismiss is worse than no dialogue, because it manufactures consent for
something that was previously simply not happening.
