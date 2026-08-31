# Workflow

How work actually flows here: the lifecycle, how a release reaches staging, and
who is allowed to decide what.

[RULES.md](RULES.md) is the short list of things no one may do. This file is the
longer explanation of how the work moves. When the two disagree, RULES.md wins —
it is the one loaded into every agent run, and it is deliberately terse for that
reason.

**Status:** this file separates what is true today from what is designed but not
built. Anything marked *planned* does not exist yet — no table, no record, no
enforcement. Read those sections as intent, never as description.

## Two authorities

WorkGrove owns workflow state and organisational decisions. Git, the test
runners and `.groot` remain authoritative for the technical facts they produce.
**Neither authority may silently rewrite the other.**

WorkGrove must not claim tests passed because somebody changed a database field.
`.groot` must not claim a ticket is accepted because tests passed.

## The four layers

| | |
|---|---|
| **WorkGrove** | durable workflow and governance — tickets, plans, evidence, the record |
| **Repository contract** | `RULES.md` and `WORKFLOW.md` today; a portable `.workgrove` package *planned* |
| **`.groot`** | execution, evidence and observability protocol |
| **DevSwarm** | one supported execution provider, not a requirement |

A `.workgrove/` directory does exist in the checkout, but it holds only
`groot.json` and is gitignored — it is local `.groot` device state, not the
repository contract and not shared. Until the portable form exists, RULES.md and
this file are authoritative.

## The shape of the work

```
PLAN       Roadmap ──▶ Ticket ──▶ Plan
DO         Execution ──▶ code ──▶ tests ──▶ review ──▶ acceptance
INTEGRATE  development
PACKAGE    Release Candidate
VERIFY     staging
SHIP       main ──▶ production
```

Two lineages run through that, and they are worth keeping distinct because they
answer different questions and are owned by different authorities.

```
ENGINEERING LINEAGE              DELIVERY LINEAGE
"how did this outcome happen?"   "what exactly is running?"

Target                           development SHA
  ↓                                ↓
Ticket                           Release
  ↓                                ↓
Execution                        artifact digests
  ↓                                ↓
Git / Evidence                   staging
                                   ↓
                                 production
```

The engineering lineage is largely built. The delivery lineage is not — Release
is *planned*, and today only its git half exists.

## The lifecycle

The branches are real and binding:

```
<ticket branch> ──no-ff──▶ development ──ff-only──▶ staging ──ff-only──▶ main
                           integration              QA candidate         release
```

The git mechanics live in RULES.md §6 and are enforced. What follows is the part
RULES.md does not cover: what a release actually *means*.

A ticket branch carries the classification execution began under, and never
changes afterwards. How much to investigate before classifying, and what to do
when execution proves the classification wrong, is
[Ticket Classification and Branch Identity](docs/governance/ticket-classification-and-branch-identity.md).

### The Release record — planned

A Release overlays the promotion without changing the branches. It names which
revision was packaged, what went into it, and what was built from it:

```
development @ abc123
        ↓
   Release 0.9.0-rc.1
     source_sha:     abc123
     included:       #690, #691, #692
     api_digest:     …
     client_digest:  …
        ↓
   staging promoted to abc123
```

That gives both truths at once — git says `staging` points at `abc123`;
WorkGrove says `abc123` is Release `0.9.0-rc.1`. After staging verification the
same source becomes a stable Release (`0.9.0`) and is promoted to `main`.

**None of this exists yet.** There is no Releases module and no release table.
It does not depend on Tickets V2 and can be built against V1.

Until it does, the same information is kept by hand in
[`docs/releases/`](docs/releases/README.md) — one file per release, in a shape
that can be read into a real record later.

## Three verification gates

These are different questions asked at different moments, and conflating them is
how a green suite gets mistaken for a working system.

### Before development integration — "does #690 work?"

The ticket is verified in isolation.

- Does the implementation satisfy its acceptance criteria?
- Do its focused tests pass?
- Does the wider suite still pass?
- Is review satisfied?

### Before staging promotion — "do #690–#695 work together?"

The selected `development` SHA is verified as an integrated candidate.

- Is everything contained in this SHA release-eligible?
- Does the integrated suite pass?
- Is this exact revision ready to be exposed?

### On staging — "does the deployed candidate work?"

The running system is verified.

- Did deployment succeed, and did migrations behave?
- Does the application work in the staging environment?
- Are cross-feature behaviours correct?
- Does manual QA find regressions a test would not?

## Releasing to staging

### What makes a candidate

Any commit on `development` may be promoted. There is no queue and no release
branch — `development` is a release-candidate stream, so nothing should merge
into it that is not shippable.

Reaching `development` means *integrated and potentially releasable*. It does
not mean *somewhere to save unfinished work*.

Incomplete **product exposure** is fine; incomplete **engineering quality** is
not. A ticket that is reviewed, tested and safe may merge with its feature flag
off and travel with a Release harmlessly. A feature that cannot be hidden behind
a flag is not ready to merge.

### Recording the candidate

**Draft the note before promoting**, at the moment the candidate is chosen:
[`docs/releases/<version>.md`](docs/releases/README.md). Everything requiring
judgement is knowable then — which tickets are in, what the range changed, what
was verified and what was not.

**Confirm its source SHA after promoting.** The SHA is not a decision, it is an
observation: it is wherever `staging` ended up. Recording it beforehand is also
circular — writing the note is itself a commit, so it moves the very revision the
note claims to describe.

The same file is then updated as its status advances — `candidate`, `on
staging`, `verified`, `released` — and must never claim a promotion that has not
happened.

### The gate

Before promoting, the person promoting runs the suites and confirms green:

```bash
php artisan test                              # the Laravel side
cd packages/groot && npm test                 # the connector (Node 22.22.1)
cd client && npm run build                    # the SPA typechecks and builds
```

This is a person's judgment, not a pipeline — no CI is wired to Forgejo yet. It
depends on the promoter actually running it, which is the honest description of
where we are.

Node is pinned by `.nvmrc` to 22.22.1. The default system Node will fail both
the connector suite and the client build.

### The promotion

Fetch first and promote an explicit remote SHA — never a stale local ref. The
exact commands are in RULES.md §6 and are binding. In short:

```bash
git switch staging
git merge --ff-only forgejo/development
git push forgejo staging
```

If it refuses to fast-forward, stop. Something landed out of order, and the fix
is to find out what — not to reach for a merge or a force push.

### Deploying it — current, transitional

`workgrove-stage-01` does not deploy itself, and it **rebuilds from source**:

```bash
ssh workgrove-stage-01
cd <the deployment checkout>                  # path not yet settled
git fetch && git reset --hard forgejo/staging

composer install --no-dev --optimize-autoloader
php artisan migrate --force
npm ci && npm run build                       # in client/, Node 22.22.1
php artisan optimize
```

> The `git reset --hard` above is permitted **only** in the dedicated disposable
> deployment checkout on `workgrove-stage-01`. It is not permission to reset a
> developer working tree, and RULES.md §2 still governs everywhere else.

There is downtime between the reset and the end of the build. That is accepted
for now.

Once it is up, move the release note to `on staging` and record the date. It is
the only place that says what is actually running on that box.

**This is transitional, not the intended architecture.** Building on the staging
server means the thing verified on staging is not bit-for-bit the thing that
would ship. The target is build-once:

```
TODAY                          TARGET
staging SHA                    development SHA
   ↓                              ↓
rebuild on the staging box     CI builds once
                                  ↓
                               immutable api/client artifacts
                                  ↓
                               staging  ──same artifacts──▶  production
```

Until that exists, "the artifact that passed QA" means the source revision, not
a built artifact.

### When the code never arrives

Switching one-time codes on makes email a hard dependency of signing in, and
staging is the sharp case: one administrator, one mailbox, no second person to
let anybody back in. If mail fails, everybody is locked out at once.

```bash
php artisan otp:recover <email>
```

Attempt a sign-in first so a challenge is waiting, then run this and read the
code out of the terminal. It is not a bypass — codes stay switched on, the
challenge keeps its id, and the digits expire and burn exactly as a mailed code
would. All that changes is the route they travel.

**Do not enable one-time codes anywhere until this exists.** Enabling them
without a way back is choosing to have none.

Recovery codes become the right answer once production exists and shell access
stops being a reasonable recovery path. Until then the operator already holds a
stronger credential than any code sheet, and a second secret is three more ways
to lose access rather than one fewer.

### What QA on staging means

Staging is where a revision is verified by a person using it. It is not a test
runner — the suites already ran at the gate. QA answers the questions a test
cannot: does the thing work, does it look right, did anything regress that
nobody wrote a test for.

`main` receives only what passed that. Both promotions are human decisions.

### Migrations

Migrations run forward on promotion and are **not** covered by feature flags. A
flag can hide behaviour; it cannot un-run a migration. So anything merging into
`development` must have additive, backward-compatible migrations — new nullable
columns, new tables, no destructive changes.

A feature needing a breaking schema change should not merge early behind a flag.

### When staging is broken

**Fix forward. Never move `staging` backwards.**

```
staging      A──B──C──D          D is broken
development  ...──E              fix lands on development
staging      A──B──C──D──E       promote again
```

Resetting `staging` to an earlier revision would restore the environment faster,
but it breaks the fast-forward promise, and the next promotion then needs a
force push. Once that happens, `staging` no longer proves what it claims to.

A broken staging is a normal event. It is a candidate failing verification,
which is what staging exists to discover.

## Execution providers

**Tickets V2 target model:** an Execution is one authorised attempt at a Ticket.
It is not a persisted record today — the current records are Ticket, Build Log
Session, Git and Evidence. The provider contract below is defined now so the
model can be built against it.

```
Execution
├── provider: devswarm
├── provider: groot-native
├── provider: claude / codex / other
└── provider: human
```

WorkGrove supports DevSwarm as an execution provider. **WorkGrove development
does not require DevSwarm.**

### Workspaces

- An Execution may use one or more isolated workspaces.
- A workspace should be a git worktree or equivalent isolated checkout.
- The workspace provider does not own WorkGrove workflow state.
- WorkGrove Execution ids must stay resolvable after a workspace is archived or
  deleted — the same reason a ticket records its merge commit before its branch
  is removed.

### What an orchestrator may not do

DevSwarm, or any orchestrator, may plan and co-ordinate work units. It may not:

- redefine the ticket outcome
- expand execution scope
- accept the ticket
- promote or release anything

Each requires the corresponding WorkGrove transition, made by a person. This is
the same invariant as *a session may never mark a task done* — an agent may
report, and only a person may accept.

## Truth boundaries

Three things that are easy to conflate and must not be:

| | |
|---|---|
| **Artifact** | a design, explanation, prototype, specification or deliverable |
| **Build Log** | what the worker says happened — a claim, rendered as a claim |
| **Evidence** | what objectively verifies the work — a recorded run, a commit |

A visualisation of a passing test suite is an Artifact. The recorded run is the
Evidence. The picture is not proof.

## Pending architecture

Named so nobody reads their absence as a decision. These are two independent
tracks — **Delivery does not wait for Tickets V2.**

### Tickets V2

- Execution as a persisted entity
- frozen Plan commit/version reference on Execution
- execution scope
- Artifacts on Tickets
- version-pinned Artifact inputs
- Artifact scope enforcement at the GroveLab/MCP write boundary, not `.groot`
- `GroveLabVersion` immutability, which artifact pinning depends on
- review and human acceptance as first-class execution records

### Delivery

- first-class Release and Release Item records
- semantic release versions such as `0.9.0-rc.1`
- immutable API and client digests
- runtime frontend environment configuration
- build-once promotion from staging to production
- a CI gate on `development`
- automated staging deployment
- a Release Log
