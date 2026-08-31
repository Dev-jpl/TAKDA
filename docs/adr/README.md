# Architecture decisions

One file per decision, numbered, never renumbered. A decision that is later
reversed gets a new ADR that supersedes it — the old file stays, marked, so the
reasoning that was true at the time is still readable.

Format is deliberately short: context, decision, consequences, and what it costs.
An ADR nobody finishes reading is not a record.

| ADR | Decision | Status |
| --- | -------- | ------ |
| [001](001-authoring-model.md) | Blueprint is canonical; MDL is compiled | accepted |
| [002](002-encrypted-backup.md) | Encrypted backup is a v3.0 baseline, not deferred | accepted |
| [003](003-capability-exposure.md) | Capability existence is separate from exposure | accepted |
| [004](004-diagnostic-metadata.md) | Module diagnosis sends shape, never values | accepted |
| [005](005-capabilities-are-rendered.md) | MCP tools are compiled, not hand-written | accepted |
| [006](006-colour-is-semantic.md) | Modules request roles, never hues | accepted |

The canonical narrative concept doc is WorkGrove TAKDA doc #31. These ADRs record
decisions taken against it and, where they differ, the ADR is what was built.
