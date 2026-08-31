# ADR-006 — Modules request roles, never hues

**Status:** accepted · 2026-08-31

## Context

ADR-001 bars presentation detail from the Blueprint, and colour is presentation.
But a finance module that cannot distinguish money in from money out is worse
than one that can, so colour has to reach modules somehow.

v2 shipped eight hues at three tiers — twenty-four accent tokens — which is a
palette for decorating rather than for meaning.

## Decision

Modules request a **semantic role**. The palette resolves it.

```
positive → sage     negative → clay     attention → ochre
info     → slate    accent   → plum     muted     → gray
```

A Blueprint says `negative`; it never says `clay`. Colour therefore stays out of
the canonical source entirely while modules still read correctly.

- Foundation (paper, ink, the grey ramp, the highlighter) carries the interface
  and is unchanged from v2 — it is the product's identity, not a style choice.
- Six accent hues, one tier each, soft tints derived by alpha so a hue cannot
  drift against itself.
- Light and dark values are independent. v2 reused one fill for both.
- Colour means something or it is absent. Nothing is tinted to look nice.

## Consequences

Changing what "negative" looks like updates every module at once. A future
runtime on another platform maps the same tokens without a second source of
truth.

Contrast is measured, not eyeballed. Doing so caught a real v2 defect: white
text on its sage was 2.88:1, below even the large-text floor. Every text-on-fill
pair now clears 4.5:1 in both schemes.

## What it costs

Six roles will eventually be too few for something, and the pressure will be to
add a seventh rather than to ask why a module needs it.

One measured limit stands unresolved: ochre is 2.02:1 against light paper,
below the 3:1 floor for graphical objects. A yellow dark enough to pass is no
longer yellow, so ochre used as a bare fill requires a border or adjacent glyph.
