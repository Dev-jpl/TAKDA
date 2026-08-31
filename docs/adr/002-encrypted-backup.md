# ADR-002 — Encrypted backup is a v3.0 baseline, not deferred

**Status:** accepted · 2026-08-31

## Context

The concept doc keeps personal records on the device and lists cross-device sync
and "device backup/export strategy" as non-goals. Taken together those mean:
lose the phone, lose everything.

For a notebook meant to be used daily for years, that is not an implementation
detail. It quietly inverts the privacy promise — "your data is yours" becomes
"your data is one dropped phone from gone."

A first pass at this said the encryption key never leaves the device. That is
secure and useless: if the only copy of the key goes with the phone, the backup
is ciphertext nobody can ever open.

## Decision

```
Local SQLite + files → client-side encrypted blob → Server stores ciphertext only
```

- The server stores ciphertext and **cannot** read it.
- Recovery is via a user-held passphrase or an explicit recovery mechanism, so
  the backup survives loss of the device.
- Sync stays deferred. Backup does not.
- Do not invent the cryptography. A passphrase-derived key and an authenticated
  cipher are solved, auditable shapes; the design work is the recovery UX.

The claim this earns: *your live data stays on your device; your backup can live
on our server, and we cannot read it.*

## Consequences

Recovery UX becomes a first-class problem — losing the passphrase means losing
the data, and people lose passphrases. That has to be designed for honestly
rather than assumed away.

## What it costs

Roughly a week of work that buys no visible feature, and it must land before
anyone trusts the app with something that matters.
