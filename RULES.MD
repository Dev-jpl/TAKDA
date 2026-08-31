# Rules

Standing rules for anyone working in this repository, person or agent. Each one
exists because something downstream reads the record and gets it wrong when the
rule is skipped.

Release methodology and the execution model: [WORKFLOW.md](WORKFLOW.md).

## 1 · No agent watermark

No `Co-Authored-By`, no "Generated with", no tool name, no model name — in commit
messages, PR bodies, ticket reports or code comments. Authorship is the git
author field's job; a watermark in the body is noise in every `git log` forever.

## 2 · Settle the git position before you start

```bash
git status -sb          # clean tree? right branch?
```

Never work on a lifecycle branch — `development`, `staging` or `main` — on
someone else's branch, or on a tree holding changes that belong to other work.
If the branch does not match the ticket, **stop and ask** — name the branch you
are on, the one the work belongs on, and what you propose. Do not silently
switch or commit where you stand.

### Tools are bound by this too

`.groot` can cut branches and commit where a repository permits it. It refuses a
lifecycle branch in both directions: no commit while `development`, `staging` or
`main` is checked out, and no branch created under any of those names. A rule
only people follow holds until the first agent that has not read it, and nothing
downstream can tell the difference afterwards.

It binds the tools that come through WorkGrove. Anything driving raw git from
outside — a devswarm run, your own shell — is on its honour.

## 3 · One ticket per branch, and check before raising one

Before starting anything, find out whether a ticket already exists:

```
tickets.list — search the title, or assignee: "me"
```

Then decide, defaulting to **extend**:

| Situation | Do |
|---|---|
| A ticket covers this | Work that ticket. Do not raise another. |
| Findings from reviewing a ticket | They belong to **that** ticket — a review produces modifications, not new work. |
| A correction to work in review | Same ticket. |
| Genuinely separate outcome | New ticket. |
| Unticketed work already done | `tickets.create`, then report against it. |

A trail of near-duplicate tickets is as bad a record as no record at all.

## 4 · Branch names

`<WORKSPACE>/<type>/<sequence>-<slug>`

```
EDR5QW/feature/00035-build-the-build-state-panel
```

Workspace and sequence are the two halves of the ticket code
`WG-TX-EDR5QW-00035-FE`. `tickets.create` and `tickets.get` hand you the whole
name: cut what they give you, then record it. Build Log matches the exact
string, so older-form branches keep working.

- No module or handle segment: the ticket owns both. A ticket naming no module
  is offered no name at all.
- Type is a snapshot from when the branch was cut. The ticket is truth; never
  count anything by grepping branch names.

## 5 · A ticket names its branch, plan and module

Build Log computes evidence from exactly these three. Missing any one, the ticket
is invisible to it — not partly reported, invisible. The fourth field is the
merge commit, recorded when the work lands — see rule 6.

Set them through `tickets.create`, `tickets.update` or `tickets.report`, all of
which take `branch`, `plan_file` and `module`. At creation when known; on the
first update or report when not, which is most of the time.

- **Never invent one.** A branch that does not exist is worse than a blank field.
- **One owning module.** Others go in the report as *touched*.
- **Name a ticket by its code** in prose — `WG-TX-EDR5QW-00106-TK`. The number is
  internal: branch names carry it, and the tools take either.
- **Post the plan on the thread when it is agreed**, not at the end — a plan that
  first appears in the closing report was never monitored against.

## 6 · Merge so you can undo it

```bash
git tag rollback/pre-<thing>              # does not expire, unlike the reflog
git merge --no-ff <branch>                # one handle for the whole branch
git branch -d <branch>                    # -d, never -D; note the SHA
```

`--no-ff` is what makes deletion safe: it keeps the branch's shape and gives you
one commit to revert. To roll back, `git revert -m 1 <merge>` for anything
shared, `git reset --hard <sha>` only for work nobody else has. Reverting a merge
marks that branch merged — re-merging later needs the revert reverted first.

Branches live days, not weeks.

### Three lifecycle branches

```
<ticket branch> ──no-ff──▶ development ──ff-only──▶ staging ──ff-only──▶ main
                           integration              QA candidate         release
```

`development` is where ticket work lands and stays green: cut every branch from
it, merge every branch back into it, deploy nothing from it.

`staging` is the one revision under verification — what the staging server runs.
It stays pinned there while `development` keeps moving, which is why it exists.

`main` is what passed QA on staging, and where production will come from.

Promotion is a person's decision, never part of finishing a ticket. Fetch first
and promote an explicit remote SHA, never a stale local ref. The remote here is
`forgejo`, and its branches must exist before any of this fetches anything.

```bash
git status -sb                     # clean tree, and know where you stand
git fetch forgejo development staging main

candidate_sha=$(git rev-parse forgejo/development)
echo "$candidate_sha"              # read the revision before you move it
git switch staging
git merge --ff-only forgejo/staging
git merge --ff-only "$candidate_sha"
git push forgejo "$candidate_sha:refs/heads/staging"

# After QA, use the exact SHA verified on staging.
qa_sha=THE_EXACT_SHA_THAT_PASSED_QA
git fetch forgejo staging main
test "$(git rev-parse forgejo/staging)" = "$qa_sha"
git switch main
git merge --ff-only forgejo/main
git merge --ff-only "$qa_sha"
git push forgejo "$qa_sha:refs/heads/main"
```

`--ff-only` keeps the shipped commit identical to the tested one: the SHA that
passed QA is the SHA that ships, not a merge nobody ran anything against.
**A promotion that refuses to fast-forward means something landed out of order —
find out what, rather than reaching for a merge or a force-push.**

`--no-ff` is for ticket merges only; mixing the two is what leaves a lifecycle
branch unable to fast-forward later.

No ticket work is authored on any of the three. `staging` is cut once, by a
person: the tools refuse to create it, by design.

Build Log measures against `development` (`BUILD_LOG_BASE_BRANCH`), unchanged —
`staging` or `main` would credit a ticket with everything awaiting promotion.

CI/CD may verify all three, and may deploy `staging` and later `main`. It never
promotes: that decision is a person's, every time.

### Record the merge on the ticket

The merge commit is what outlives the branch. `git branch -d` removes the ref
and the trunk range goes empty, so **a ticket that does not record its merge
becomes unreadable the moment it is finished** — measured, not theorised.

```
tickets.report ... merge_commit_sha=<sha>     # or tickets.update
```

A ticket that lands more than once records each merge; they append, and its
history is the union. Recording only the last one used to rewrite the earlier
ones.

## 7 · Plans declare three things

In the plan header, before writing it:

```
**Module:** Build Log  ·  touches: Tickets
**Branch:** EDR5QW/feature/00035-build-the-build-state-panel
**GroveLab:** Build Log — Evidence Chain & UI Spec   (or: none — asked, none exists)
```

Module and branch are required. The GroveLab reference is optional, but **ask
whether one exists before planning** — do not go looking unprompted, and never
cite a mockup nobody made.

**Every task must list the files it will touch.** This is the attachment point
between a plan and its evidence: a task written in prose declares nothing, and
Build Log reports it as not started however finished it is.
