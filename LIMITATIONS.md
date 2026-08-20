# LIMITATIONS.md — what this model does and doesn't actually know

Companion to `CLAUDE.md` and `PLAN.md`. Those say what the project is trying to become. This says,
plainly, what today's build actually does — so a real operational decision doesn't get made on a
number this tool isn't yet qualified to give.

Read this before trusting a percentage on screen for a real shipment.

---

## 1. The packer's biggest gap: it can't mix SKUs vertically

**This is the one to understand first — it's the ceiling on every utilisation number you've seen.**

### What the packer actually does

Picture the container as a long hallway. The packer walks down it and gives each SKU its own
private cross-section room: full width, full height, however much length that SKU needs. It fills
that room from the floor up with nothing but that one SKU, then closes the door and gives the
next SKU the next room down the hallway.

That's it. That's the whole strategy. It's in `src/engine/packers/shelfPacker.ts`, and the name is
literal — each SKU gets a "slab."

### Why that loses space

A SKU's room is exactly as tall as the container, but the boxes inside it are almost never a
clean multiple of the container's height. If a box is 300mm tall and the container is 2,698mm
tall, 8 layers fit (2,400mm) and 298mm of headroom is left — for the *entire length* of that
SKU's room, because nothing else is allowed in there to use it.

That's "Ceiling loss" in the metrics panel. In the screenshots from this session it's routinely
6-8% of the whole container — CBM that isn't geometrically wasted, it's *structurally* off-limits
to this specific algorithm.

### What a better packer would do instead

A real packer (Extreme Points / Maximal Spaces — the algorithm PLAN.md always intended as the
actual Phase 1 target, see `PLAN.md` §3) doesn't reserve whole rooms. It tracks the leftover space
after every single box placement and asks "what else could go here" — including a *different* SKU
sitting in the 298mm of headroom above the first one, if it fits. Two SKUs can share a Z-band.
Rooms don't exist; only leftover space does.

### What this means for you right now

- Every utilisation number in this app (82%, 86%, whatever you're looking at) is **real for this
  algorithm** — the engine isn't lying, the math is exact and tested. But it's a floor, not a
  ceiling. There is currently no way to know from inside the app how much more a smarter packer
  would recover, because there's nothing to compare against yet.
- Don't use today's numbers to promise a customer or a warehouse crew a specific utilisation on a
  real load. Use them to compare *configurations against each other* (which is what the top-3
  ranking and the priority flag are actually for) — that comparison is valid even while the
  absolute ceiling is low.
- **Fix:** build the real packer behind the same `pack()` interface. Every other feature in this
  app — loss attribution, ranking, tolerance, priority, multi-container-type — was deliberately
  built to sit on top of `pack()`, not inside it, so this is a swap, not a rewrite.
- **Priority: highest.** This is the single change that would tell you whether 82% is close to
  what's achievable or leaving real money on the table.

---

## 2. No weight or centre-of-gravity check

**What's missing:** `SKU.weight` exists as a field. Nothing reads it. A load can show "no
violations" while being badly overweight or badly unbalanced front-to-back.

**Business risk:** PLAN.md's own words apply directly here — "a packing tool that reports 98%
volume on an overweight load is worse than useless." Dense, small SKUs (metal parts, liquids,
dense packaging) hit a truck or container's *weight* limit long before they hit the volume limit.
This tool currently can't warn you about that at all.

**Fix:** requires (a) real weight-per-unit data on every SKU — currently absent from data.csv, and
(b) a check in `validate.ts` against a payload limit on `ContainerSpec`, plus a centre-of-gravity
calculation (a straightforward weighted average over box positions — cheap once weight data
exists). PLAN.md D11 flags this as "fields free now, retrofitting expensive later" — the field is
already there for exactly this reason.

**Priority: high**, but blocked on getting real weight data into the SKU source, which is an
organisational/data problem before it's a code problem (same shape as the carton-dimensions
blocker CLAUDE.md already flags for the Stuffer Planner integration).

---

## 3. Container dimensions are unverified placeholders

**What's missing:** every entry in `src/engine/containers.ts` (20GP, 40GP, 40HC) is sourced as
"commonly cited manufacturer figures" — a reasonable industry-standard number, not a number
pulled from your actual carrier's spec sheet. Real containers vary by manufacturer and by
production year, sometimes by tens of millimetres — which at these tolerances is a whole extra row
of cartons, one way or the other.

**Business risk:** every percentage and every CBM figure in the app is downstream of these three
numbers. If they're off, everything built on top of them is off by the same margin, silently.

**Fix:** low effort, needs a person, not more code — get real internal dimensions from your actual
carrier/lessor for whichever container types you actually book, and swap the values in
`containers.ts`, citing the source per entry (the `source` field exists for exactly this).

**Priority: high, but cheap.** This should happen before anyone treats a number from this tool as
real, and it's an afternoon of sourcing, not an engineering project.

---

## 4. No rotation search

**What's missing:** every box is placed in exactly one orientation — as specified in the SKU
table. The engine has an `Orientation` type with all 6 axis-aligned permutations already defined
(`src/engine/types.ts`), but the packer never tries any orientation but the first.

**Business risk:** some SKUs would pack meaningfully better rotated 90° (e.g. a box that's longer
than it is wide might tile a row more efficiently on its side). Right now that upside is never
found, even when it's free.

**Fix:** moderate. PLAN.md's own default (D2) is deliberately upright-only for realism — most real
cargo shouldn't be tipped on its side — but even upright-only allows rotating the *footprint* 90°
(swapping length and width while keeping height fixed), which is cheap to add and always safe.
Full 6-orientation search is a bigger, and more questionable, change — it can produce plans no
real crew would follow.

**Priority: medium.**

---

## 5. Nothing benchmarks this against known-good results

**What's missing:** the engine is tested against hand-verified known-answer fixtures (does the
packer agree with arithmetic — yes, thoroughly) but never against the published academic
benchmark instances PLAN.md names (Bischoff & Ratcliff `thpack`, Loh & Nee) where the "right"
answer is already known from decades of research.

**Business risk:** there's no external anchor for "is 82% good or bad for this SKU mix." Internally
consistent isn't the same as competitively good.

**Fix:** moderate — pull the standard instances from the OR-Library, run them through `pack()`,
compare against published results. Genuinely useful once the real packer (§1) exists; less
informative to run against today's simpler algorithm.

**Priority: medium, sequenced after §1.**

---

## 6. Single container only

**What's missing:** the app plans one container at a time. When demand doesn't fit (which it
routinely doesn't in the current data.csv example), the leftover is reported as "unplaced," not
automatically packed into a second container.

**Business risk:** for an order that needs 2-3 containers, you currently have to re-run the tool
per container by hand, adjusting quantities yourself.

**Fix:** PLAN.md D5's own default — single container in the engine, multi-container as a thin loop
above it (pack, take the unplaced remainder, pack again into a fresh container, repeat). The
contract was designed for this from the start; it's additive, not a redesign.

**Priority: medium** — real, but a known and comparatively cheap gap when you want it.

---

## 7. "Supported" means almost 100%, which is stricter than real crews

**What's missing:** `validate.ts` currently requires a box's base to be fully supported (within
the carton-tolerance gap). PLAN.md D3 notes real loads commonly run 70-80% support and still hold
up fine in practice — 100% is the conservative extreme, not the realistic one.

**Business risk:** low in practice for this packer specifically, because the current algorithm
only ever stacks a SKU directly on itself (see §1) — every box is either on the floor or on an
identical box below it, so support is trivially 100% by construction today. This becomes relevant
the moment §1 is fixed and SKUs start sharing space, at which point an editable support-ratio
threshold (not hardcoded) becomes necessary, not optional.

**Priority: low today, becomes high the moment §1 ships.**

---

## 8. No visibility tooling yet (timeline, violation overlay)

**What's missing:** `validate()` returns violations as data, but nothing renders them in the 3D
view. There's no timeline scrubber over placement history either, even though the data for both
(`placementHistory`, `Violation[]`) already exists in `ContainerState`.

**Business risk:** low for now, since the packer is simple enough that violations are rare and the
existing tests catch them. This becomes important the moment the packer gets more complex (§1) —
a more sophisticated algorithm is also more likely to produce a subtle bug, and "watch it fill box
by box" is the fastest way anyone has found to catch one.

**Priority: low now, but cheap and worth doing alongside §1**, not after — PLAN.md M3 groups these
together for exactly that reason.

---

## What today's numbers ARE good for

Despite all of the above, everything the app currently reports is **internally honest** — heavily
tested, exact where it claims to be exact (the loss breakdown provably sums to the container's
full volume; see `lossAttribution.test.ts`), and never silently wrong within its own stated scope.
What it's good for right now:

- **Comparing configurations against each other** (order strategies, priority flags, tolerance
  settings) for the *same* SKU mix and container — these comparisons are apples-to-apples even
  while the absolute ceiling is low.
- **Proving the core thesis**: that CBM-only planning overstates what actually fits, and that the
  gap has named, addressable causes instead of being one opaque "dead space" number.
- **Testing packaging and container-type "what if" scenarios directionally** — the mechanism is
  sound even though the absolute numbers will move once the real packer lands.

What it's not yet good for: quoting a real customer, promising a warehouse crew a specific
utilisation, or making a weight-sensitive load without a manual weight check on the side.

---

## Recommended order of fixes

1. **The real packer (§1)** — unlocks everything else being worth doing, and is the one gap
   silently discounting every number in the app.
2. **Verified container dimensions (§3)** — cheap, and everything is downstream of it.
3. **Weight/COG (§2)** — high business risk, but gated on getting real weight data sourced.
4. **Footprint rotation (§4)** and **benchmark validation (§5)** — genuinely useful, best done once
   §1 exists so the improvement is measurable against something.
5. **Multi-container (§6)**, **support ratio (§7)**, **visibility tooling (§8)** — real, lower
   urgency, §7 and §8 naturally ride along with §1's implementation.
