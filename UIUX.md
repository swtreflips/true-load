# UIUX.md — From "packing calculator" to "shipping plan"

Companion to `CLAUDE.md` and `PLAN.md`. Those describe the engine and the product thesis. This one
is about the app's interaction model — the thing that currently works correctly but doesn't yet
match how a planner actually thinks about a shipment.

Nothing here changes what exists today. It describes an **additive second mode** that sits next to
it.

---

## 1. The gap

The app today is a form. `SkuPoolTray` lists every SKU with an editable total; `SkuTable` lists
every SKU with an editable allocated quantity, a priority checkbox, a rotation checkbox; one
container fills in the middle; `MetricsPanel` explains it. Everything is visible and editable at
once, flat, and it always targets exactly one container.

That's the right tool for the question it was built to answer: *"if I put these exact quantities in
this exact container, what happens?"* It is the wrong shape for the question a planner actually
starts from: *"I have a set of orders I need to ship. Some of it matters more than the rest. It's
probably more than one container. Build me the plan."*

Two things are missing, and they're related:

1. **A build-up motion.** A planner doesn't fill out a 7-row spreadsheet in one pass. They add what
   has to ship first, see the container react, then layer on what's next, watching it fill or spill
   over — a running plan, not a static form.
2. **More than one container.** Right now, anything that doesn't fit becomes `unplaced` — a red
   number and a "what's left over" list. That's honest (CLAUDE.md §5 — report what fits), but it's
   also where the app currently stops. The planner's real next question is "so what does container 2
   look like, and is it worth sending partial?" The app has no answer today.

---

## 2. Two modes, not one redesigned screen

| | **Sandbox** (today, unchanged) | **Plan** (new) |
|---|---|---|
| Question it answers | "What if I load exactly this?" | "Here's what I need to ship — build the plan." |
| Unit of work | One container | As many containers as the candidate set needs |
| Editing style | Flat table, every SKU editable at once | Add-as-you-go list, built in priority order |
| Best for | Testing a hypothesis, comparing strategies, demos (e.g. the rotation A/B) | Real operational planning for an actual shipment |
| Files touched | None | New components + a new store slice, described below |

Sandbox is not being rebuilt into Plan. It stays exactly as it is — same components, same store,
same single-container assumption — because it's still the right tool for "what if I turn rotation
off for this one SKU," which is a question about one container, not a shipment. Plan is a new tab
next to it, reusing pieces (the pool tray, `MetricsPanel`, the 3D viewer) rather than replacing
anything.

```
┌──────────────────────────────────────────────┐
│  [ Sandbox ]   [ Plan ]      ← top-level tabs │
└──────────────────────────────────────────────┘
```

Switching tabs switches *mode*, not data — the SKU pool (`data.csv`) is shared, but Plan keeps its
own allocation state, separate from Sandbox's `allocatedQty`. Editing one never touches the other.

---

## 3. Plan mode: the build-up

Plan mode starts **empty**. No container renders until something has been added — the empty state
is the pool tray and a prompt, not a blank container.

The pool tray (`SkuPoolTray`, reused as-is) is the entry point, but its role changes: in Sandbox,
"Load all →" commits a SKU to *the* container. In Plan, adding a SKU commits it to *the shipping
list* — a quantity that may end up spread across several containers once the cascade runs.

The intended motion:

1. **Add what has to ship.** These are marked priority by default (same flag, same meaning as
   today: priority SKUs are guaranteed a slot; the algorithm is not allowed to leave them out to
   round off a column). The container strip (§4) appears the moment the first item is added, and it
   fills live.
2. **Keep adding.** Each addition re-runs the same `recompute()` the store already does today — nothing
   new architecturally, just fed through the cascade instead of a single `pack()` call. The user
   watches Container 1 approach full, then watches a second card appear once it can't hold any more.
3. **See the shape of the plan, not just the number.** At every step the question being answered is
   visible: not "72%" in isolation, but "2 containers, second one 61% full, here's what's still
   sitting in the remainder."

This is the same mental model as the existing priority/rotation flags — small, visible, per-item
controls that the user already understands — just composed into a sequence instead of a static
table. No new interaction vocabulary is introduced; the list is still `SkuTable` underneath (qty,
priority, rotation, all present), it's just no longer scoped to one container's worth.

---

## 4. Plan mode: the container strip

Where Sandbox has one container filling the whole viewer, Plan has a horizontal strip of container
cards above it. Each card is a compact preview (mini utilisation bar, box count, CBM); clicking one
loads it into the same 3D viewer and the same `MetricsPanel` that Sandbox already uses — no new
viewer code, no new metrics code, just re-pointed at a different `containerState`.

```
  Plan: 3 containers · 41.9 avg CBM/container · 1 SKU still short of a full load

  ┌─ Container 1 ──────┐  ┌─ Container 2 ──────┐  ┌─ Container 3 · remainder ──┐
  │ ▮▮▮▮▮▮▮▮▮▮ 94.2%    │  │ ▮▮▮▮▮▮▮▮░░ 81.0%    │  │ ▮▮▮░░░░░░░ 34.1%           │
  │ 40HC · 612 boxes    │  │ 40HC · 588 boxes    │  │ 40HC · 210 boxes           │
  └─────────────────────┘  └─────────────────────┘  └────────────────────────────┘
        selected ▲
```

Mechanically, this is a **sequential cascade**, and it deliberately reuses the existing packer
unchanged: run `pack()` against the full candidate list for container 1; whatever comes back as
`unplaced` becomes the input quantity for container 2's `pack()` call; repeat until nothing is
unplaced. `pack()` itself doesn't need to know it's being called more than once — the cascade is a
loop the store runs, not a new engine capability. This is exactly the kind of seam CLAUDE.md asks
for: the engine doesn't change, only what calls it does.

---

## 5. The remainder is the deliverable

The last card in the strip is not just "Container N" — it's the one the plan actually hinges on,
and it should look different, not just be positioned last:

- Labelled **"remainder"**, not a number.
- Its utilisation is shown against what's *left to decide*, not framed as a shortfall: "4.8 CBM
  free — room for roughly 120 more [SKU]" (reusing the per-SKU footprint numbers already computed
  for the Dims column), so the question "is it worth adding a filler SKU before we ship this one
  partial" has an answer already sitting on screen.
- If nothing is left over — the plan divides evenly — there is no remainder card, and the strip
  says so plainly ("3 containers, nothing left over") rather than showing a fourth card at 0%.

This is the single biggest behavioural difference from Sandbox: today, "what's left over" is a red
number in a corner. In Plan, it's a first-class card with the same visual weight as every other
container, because operationally it's the one the planner spends the most time looking at.

---

## 6. Priority, extended across containers

Priority already means one thing in this app: a priority SKU is loaded completely; a non-priority
SKU is the one the algorithm is allowed to trim to finish a column cleanly (established when the
flag was built — see git history on `setSkuPriority`). Plan mode doesn't redefine it, it just gives
it a second axis to act on:

- Within a single container, priority still governs column rounding exactly as it does today.
- Across the cascade, priority SKUs are packed **first** into container 1, then container 2, and so
  on — so a priority item is never the one sitting unplaced in the remainder while a non-priority
  item took its place in an earlier, fuller container. Non-priority SKUs are the ones allowed to
  spill into the remainder, or out of the plan entirely if the remainder itself fills up.

No new flag. The existing per-row checkbox in `SkuTable` is reused unchanged — its meaning just now
has consequences that span containers instead of one.

---

## 7. What this needs, at a store level (for scoping, not spec)

Kept deliberately light — this is a UX document, not an implementation plan — but worth naming so
the "modular, don't conflate" bar from the rotation feature is held here too:

- A **separate store slice** for Plan mode's allocation state (its own `allocatedQty`-equivalent),
  not folded into the existing single-container `useContainerStore`. Same reasoning as before:
  Sandbox's semantics ("this qty goes in the container") and Plan's ("this qty goes in the *plan*,
  however many containers that takes") are different enough that sharing state would conflate them
  the same way a crossed `PackOrder` × rotation matrix would have.
- A **cascade function**, `packPlan(skus, container, order) -> ContainerState[]`, living beside
  `pack()` in `engine/packers/`, calling `pack()` in a loop against successive `unplaced` remainders.
  Pure, engine-side, no viewer/store dependency — same boundary rule as everything else in
  `engine/`.
- Everything downstream (viewer, `MetricsPanel`, the SKU table) takes a single `ContainerState` as
  it already does. Plan mode just chooses *which* `ContainerState` from the array is currently
  selected. No component needs to know it's living inside a multi-container plan.

---

## 8. Explicitly not doing

- Not mixing container types within one plan (all containers in a cascade are the same spec the
  user picked). Cross-type optimisation — "would 2×40HC + 1×20GP beat 3×40HC" — is a real question
  but a different, harder one; out of scope here.
- Not rebalancing backward across containers once packed (e.g. shifting a box from container 2 back
  into a gap in container 1 to improve the *pair's* combined utilisation). The cascade is
  sequential and greedy, same spirit as the existing `PackOrder` strategies — good enough to plan
  against, not a global optimum.
- Not touching Sandbox's files, store, or behaviour. `useContainerStore.ts`, `App.tsx`, and every
  existing `ui/` component keep working exactly as they do today.
- Not building drag-to-reorder for the shipping list. Priority is binary (in/out of "ships first"),
  matching the existing flag — a manual ranking within priority items is a plausible future ask,
  not this one.

---

## 9. Rollout order

Each step should be demoable on its own, same discipline as CLAUDE.md's phases:

1. **`packPlan()` in the engine**, tested the same way `pack()` is — known-answer fixture where a
   candidate set is hand-verified to need exactly 2 containers, asserting the split.
2. **Container strip + remainder card**, wired to a hardcoded plan (no build-up UI yet) — proves the
   viewer/metrics reuse works before touching interaction.
3. **The build-up flow** — empty start, pool tray feeding the new Plan store slice, live recompute.
4. **Priority-across-containers** behaviour, verified against a fixture where a priority SKU would
   otherwise get bumped into the remainder by a non-priority one added later.

---

## 10. Open questions

- Does a plan ever need a **hard cap** on container count (e.g. stop the cascade and just report
  "would need 6+ containers, refine the list") rather than rendering an unbounded strip?
- Should the remainder card's "room for ~120 more X" suggestion be **actionable** (a one-click "add
  120 of X to the plan") in a later pass, or stay read-only for now?
