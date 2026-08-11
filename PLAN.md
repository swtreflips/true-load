# PLAN.md — Prior art, standard practice, and the decisions that shape this project

Companion to `CLAUDE.md`. That file says *what* to build and *why*. This one says *how this class of
software is normally built*, what features tools like this always end up having, and which decisions
will cost you weeks if you get them wrong late.

Nothing here overrides `CLAUDE.md`. Where they touch, `CLAUDE.md` wins.

---

## 1. Name the problem correctly, then read what already exists

This is a **3D Container Loading Problem (CLP)** — specifically a *single container loading problem*
(SCLP) with a *strongly heterogeneous* item set. That vocabulary matters only because it unlocks 40
years of published work. Search those exact terms, not "box packing app".

The three papers that between them contain most of what you need:

| Source | What you take from it |
|---|---|
| **George & Robinson (1980)** — wall building | The original layer/wall heuristic. Produces plans a human crew can actually follow. |
| **Crainic, Perboli, Tadei (2008)** — Extreme Points | The simplest placement scheme that performs well. ~200 lines. Start here. |
| **Bortfeldt & Wäscher (2013)** — *Constraints in container loading: a state-of-the-art review* | The complete taxonomy of real-world constraints. Use it as your Phase 5 checklist so you don't discover "multi-drop" a year in. |

Also worth an afternoon: Bischoff & Ratcliff (1995) for stability and the benchmark instances,
Eley (2002) for block loading, Gehring & Bortfeldt (1997) for the GA layer on top.

### Open source to read (not necessarily to depend on)

- **`py3dbp` / `3D-bin-packing` (jerry800416)** — Python, readable, shows the EP approach concretely.
  Good to port ideas from; its API shape is a decent sanity check on yours.
- **`boxologic`** — C, single file, wall-building. Small enough to read in one sitting.
- **`binpackingjs` / `bin-packing-3d`** — npm, mostly weak; useful mainly as a "don't do it that way".
- **OR-Tools CP-SAT `NoOverlap2D` / cumulative** — the exact-solver route. Only relevant much later,
  and only if you accept the backend that `CLAUDE.md` deliberately rejects for now.

**Honest read:** none of these are good enough to depend on. They all treat empty space as a
byproduct, which is exactly the thing this project refuses to do. Read them, port the geometry
tricks, write your own.

### Commercial tools to benchmark features against

CubeMaster, EasyCargo, Cargo-Planner, Goodloading, Packvol, Load Xpert. Every one of them ships the
same core: SKU grid → container picker → 3D view → loading sheet PDF. Their gaps are your opening:
none of them explain *why* a container isn't full, and none quantify what a 20 mm carton change is
worth. That is the whole differentiator — see §6.

---

## 2. The architecture everyone converges on

`CLAUDE.md` already has this right. The refinement worth adding is that mature packers split the
engine into **three composable policies**, not one monolithic packer:

```
pack(items, container, strategy) where strategy = {
  itemOrder      : how to sort what's left        (volume desc, height desc, footprint desc, SKU group)
  spaceSelector  : which free space receives it   (best-fit, back-bottom-left, max-contact, highest-score)
  orientation    : which of the allowed rotations (fewest-waste, tallest-stable, keep-layer-height)
}
```

Every classic algorithm in the literature is just a specific triple. Best Fit Decreasing, DBLF,
wall-building — all of them. Building this seam on day one means "add a strategy" is 30 lines
forever, and the ranked-alternatives feature in Phase 3 becomes *free*: run 20 triples, score, sort.

This is also how you get an honest multi-start optimiser without writing a metaheuristic. Ten
deterministic strategies plus a few seeded shuffles beats a badly-tuned genetic algorithm, runs in
milliseconds, and stays explainable — which `CLAUDE.md` requires.

### The other seam: assertions as a module

Write `engine/validate.ts` in week one, not week ten:

```ts
validate(state): Violation[]   // intersection, out-of-bounds, floating, unsupported,
                               // overweight, stack-limit, orientation-lock
```

Run it after every pack in tests, and surface it in the UI as a red badge. `CLAUDE.md` rule 7
demands this; making it a returned value rather than a thrown error means the viewer can *draw* the
violation, which is how you debug a packer in seconds.

---

## 3. The algorithm ladder — build in this order

Each rung is independently useful and each takes hours, not weeks.

1. **Single-SKU grid fill.** `floor(L/l) × floor(W/w) × floor(H/h)` over allowed orientations. Ten
   lines. This is your first known-answer test *and* your `geometric capacity` estimate (see D9).
2. **Extreme Points + Best Fit Decreasing.** The real Phase 1 packer. Deterministic, fast, decent.
3. **Maximal Free Spaces.** The one that matches the project's philosophy — placing a box splits
   every intersecting space into up to six new maximal cuboids, then you discard any space contained
   in another. This is where Space becomes a first-class object with real identity.
   *Known cost:* space count grows superlinearly; containment pruning is mandatory or you'll be at
   thousands of spaces by box 300. Prune aggressively and cap the list.
4. **Layer / wall building.** Not a better packer — a *more loadable* one. Output looks like
   instructions a warehouse can follow. For an internal logistics tool this often beats a higher
   utilisation number nobody can execute.
5. **Block loading.** Group identical cartons into rectangular blocks before placing. Real crews
   load blocks. Big readability win, small utilisation win.
6. **Multi-start + local search.** Run the ladder above across many strategy triples and sorts, keep
   the best by score. Add simulated annealing over the item sequence only if the numbers justify it.

**Do not** start at step 6. The gap between "no packer" and "step 2" is enormous; the gap between
step 4 and step 6 is usually 2–4 percentage points of utilisation.

---

## 4. Conventions to fix now, because changing them later is a rewrite

These are the things that quietly cost people a week each.

- **Axes.** Engine is Z-up: `X = length` (down the container from the doors or from the nose — pick
  one and write it down), `Y = width`, `Z = height`. Three.js is Y-up. Convert **once**, in the
  viewer, in one function. Never let the two conventions meet anywhere else.
- **Origin.** `(0,0,0)` at the floor, at the wall opposite the doors, left-hand side looking in.
  Every box position is its **min corner**, never its centre. (Three.js meshes are centre-origin, so
  the viewer adds `+dim/2`. That is the only place this conversion may exist.)
- **Integer millimetres everywhere internally** — `CLAUDE.md` rule 6. Enforce it with a branded type
  (`type Mm = number & {__mm: void}`) so a stray float can't sneak through in a refactor.
- **Orientation as an index 0–5, not a string.** `"XYZ"` reads nicely in JSON but you'll be parsing
  it in hot loops. Store `0..5`, provide `applyOrientation(dims, o)`, render the label in the UI.
- **IDs stable across repacks.** Box `id` should derive from `{sku, instanceIndex}`, not from
  placement order — otherwise selection, colouring and diffing all break the moment you repack.
- **Schema version on `ContainerState` from the first commit.** A saved JSON layout you can't open
  in three months is worse than no save feature.
- **A cost budget on the packer, not a box budget.** `maxMillis` in the options. Users tolerate a
  slow pack; they don't tolerate a frozen tab.

---

## 5. The realism features people forget (and that make planners trust the number)

This is the part where domain knowledge beats algorithms, and where your logistics background is the
actual moat. Every one of these is a few lines in the model and a huge credibility gain.

- **Carton bulge / loading tolerance.** Real cartons are not their spec dimensions. A 600 mm carton
  packed full bulges to 608. Commercial tools all ship a global "gap factor" or per-SKU tolerance
  (typically 5–15 mm, or 1–3%). Without it your tool over-promises and gets abandoned after the
  first real load. **Model it as an inflation applied at the edges: `effectiveDim = spec + tolerance`.**
- **Door aperture ≠ internal cross-section.** A 40HC is ~2,698 mm tall inside but the door opening is
  ~2,585 mm. Anything loaded by forklift has to pass through. Cheap check, real-world save.
- **Usable vs nominal internal dimensions.** Corner posts, floor rails, ribbing, and the fact that
  no crew loads to the literal millimetre. Ship a container library with a `usable` margin per
  dimension, defaulting to something conservative, and let it be edited.
- **Payload weight, not just volume.** 40HC max gross ~32,500 kg, tare ~3,900 kg → ~28,600 kg
  payload; but the *road-legal* limit at destination is often the real binding constraint and is
  frequently lower. Dense cargo hits weight long before volume. A packing tool that reports 98%
  volume on an overweight load is worse than useless.
- **Centre of gravity.** Longitudinal COG should sit near the middle (commonly required within
  ±5–10% of container length from centre) and low. You already have every box position — this is
  a sum, and it's the cheapest "professional" feature in the whole app.
- **Support ratio, not just "not floating".** A box resting on 30% of its base is floating in
  practice. Standard knob: minimum fraction of base area supported (60–100%). This single parameter
  moves utilisation more than most algorithm changes — which is exactly why it must be explicit and
  visible, never hard-coded.
- **Stack limits and `THIS SIDE UP`.** Already in `CLAUDE.md` Phase 5. Put the *fields* in the SKU
  type from day one even if nothing reads them; adding a field to a type is free, migrating saved
  data is not.
- **Loading sequence = reverse of unloading.** For multi-drop, last on / first off. If your loads
  ever serve more than one consignee, this constraint dominates everything else.

⚠️ **Verify every container dimension and weight figure above against your own carrier specs before
they reach a user.** They vary by manufacturer and by year, and a planner who finds one wrong number
will discard the whole tool. Make the container library data, not code, and cite the source per entry.

---

## 6. Features this category always ships — sorted by whether you should build them

### Table stakes (users will assume these exist)

- SKU grid with paste-from-Excel. **Paste, not upload** — it's 20× less work and covers 90% of use.
  (An AG Grid–style editable table matches the Stuffer Planner; a plain table is fine for Phase 1.)
- Container picker with a real library (20GP, 40GP, 40HC, 45HC) plus custom dimensions.
- Orbit / pan / zoom, plus **preset camera angles** (top, door, side, iso). The presets get used far
  more than free orbit — one click to "door view" is the shot everyone screenshots.
- Show/hide by SKU, colour by SKU.
- Click a box → inspect its SKU, dimensions, weight, position, sequence number.
- Live metrics panel next to the 3D, never on another screen.
- Unit toggle: mm/inches, CBM/CFT. Non-negotiable if anyone outside your market sees it.

### High leverage, cheap, and where this project wins

- **Timeline scrubber over placement history.** `CLAUDE.md` rule 3 already mandates the data. This is
  the single best debugging tool you will have, and it demos better than anything else in the app.
- **Clipping plane / cross-section slider.** Nearly free with drei; it's how anyone inspects the
  interior of a full container.
- **The three-capacity readout** (theoretical / geometric / loaded) as the headline UI. This is the
  product. Lead with it.
- **Loss attribution by named category** with a "what fixes this" line per category. Also the product.
- **Side-by-side layout comparison.** Two viewers, synced cameras, diffed metrics. Phase 3.
- **Carton dimension sensitivity ("what if this box were 20 mm shorter?").** Sweep one dimension,
  repack at each step, plot utilisation. `CLAUDE.md` already identifies this as possibly worth more
  than the loading plan itself. It is: it's the feature nobody else has, it turns the tool from
  operational to strategic, and it's a `for` loop over a function you already wrote.
- **Shareable state in the URL.** Encode SKUs + container + strategy into the query string. No
  backend needed, and "send me the link" is how the tool spreads internally.
- **Printable layer-by-layer loading sheet.** The output the warehouse actually holds. `window.print()`
  with a print stylesheet gets you 80% of a PDF export for 5% of the effort.
- **Violation overlay.** Render intersecting/floating boxes in flashing red rather than hiding the
  problem. Trust comes from visible self-criticism.

### Later, if earned

GLTF/GLB export · Excel report · multi-container splitting · pallet-then-container two-stage packing ·
loading-time estimate · forklift reachability · axle-load distribution · saved templates for
recurring orders · historical-load learning.

### Deliberately skip

Auth, accounts, a database, a backend, real-time collaboration, AI-anything. `CLAUDE.md` is right:
a layout is a JSON file until it isn't.

---

## 7. Performance playbook

You will hit these three walls in this order.

1. **~500 boxes: React re-render cost.** Fix: never put box positions in React state. One
   `<instancedMesh>`, positions written into the instance matrix array in a `useLayoutEffect`. One
   draw call for 5,000 boxes.
2. **~2,000 boxes: packer time.** Fix: spatial hash grid for collision (bucket by ~1 m cells) instead
   of scanning all placed boxes; prune contained free spaces every placement. Only *then* consider a
   Web Worker — a worker hides latency, it doesn't create speed.
3. **Selection/hover on instanced meshes.** Raycasting instances gives you `instanceId`; keep a
   parallel `instanceId → boxId` array. Plan for it before you write the picking code.

Target to hold yourself to: **2,000 cartons packed and rendered in under 2 seconds, 60 fps orbit.**
Write the benchmark fixture that measures it now, so regressions are visible.

---

## 8. Testing and validation

`CLAUDE.md` rule 4 asks for a test runner from day one. Vitest, since you're on Vite. What to test:

- **Known-answer fixtures.** Container that fits exactly 24 identical boxes → 24 boxes, 100%.
  A container 1 mm too short → 20 boxes. Build a dozen of these; they catch nearly everything.
- **Invariants after every pack, as a property test** (`fast-check` over random SKU sets): no
  intersections, all inside bounds, all supported, total loaded volume equals sum of box volumes,
  loss categories sum exactly to free volume. This last one matters more than it sounds — if the
  categories don't partition the free space exactly, the "why isn't it full" story has a hole in it
  and a planner *will* find it.
- **Determinism.** Same input + same seed → byte-identical `ContainerState`. Snapshot it.
- **Literature benchmarks.** The Bischoff & Ratcliff `thpack` instances and the Loh & Nee set are in
  the OR-Library and are the standard yardstick. Being able to say "we hit 87% where published
  heuristics report 88–91%" is the difference between a demo and a tool. Add these once step 3 of the
  ladder works.
- **The real validation, eventually:** take historical shipments where you know what actually fit,
  and check the engine agrees. Nothing else will convince a planner. Start collecting those cases
  now — see D12.

---

## 9. Risks, ranked

1. **Carton dimensions don't exist in the planner's data.** Already flagged in `CLAUDE.md` and it is
   correctly identified as the top risk. It is a data/process problem with a long lead time — start
   it in parallel with Phase 1, not at Phase 4.
2. **The tool is right and nobody believes it.** Mitigation: explainability, the violation overlay,
   the timeline scrubber, and validation against real historical loads.
3. **The tool is believed and it's wrong** — usually because of missing bulge tolerance or support
   ratio. Mitigation: conservative defaults, visible assumptions, never a bare percentage without
   the assumptions next to it.
4. **Scope creep into a solver project.** The interesting research is the metaheuristics; the
   *valuable* work is loss attribution and the sensitivity analysis. Notice when you're doing the
   fun thing instead of the useful thing.
5. **Engine boundary erosion.** One `import type { Vector3 } from 'three'` in `engine/` and Phase 4
   gets expensive. Enforce it mechanically: an ESLint `no-restricted-imports` rule on `src/engine/**`,
   in the first commit.

---

## 10. Decisions to make — these change the shape of the project

Each has a recommended default so nothing blocks. Answer the **§10.1 blocking** ones before writing
engine code; the rest can wait but shouldn't be forgotten.

### 10.1 — Blocking: answer before the first line of the engine

**D1 · Is the output a theoretical maximum, or a plan a crew can execute?**
Two different products. A theoretical packer maximises volume and produces arrangements no human
will replicate. An executable packer builds layers and blocks, loses 3–6 points of utilisation, and
prints a sheet the warehouse follows. It determines your algorithm ladder, your output format, and
who the user is.
*Impact: total.* *Default: executable — layer/block-oriented, with theoretical max reported alongside as the ceiling.*

**D2 · Which rotations are allowed by default?**
All 6 orientations, or upright-only (2: footprint rotated 90°)? Most real cargo is upright-only; 6
orientations triple the search space and produce plans that violate unwritten warehouse rules.
*Impact: high — search space, realism, plan credibility.* *Default: upright-only globally, per-SKU opt-in to full 6.*

**D3 · What does "supported" mean?**
Minimum fraction of a box's base area that must rest on something. 100% is safe and conservative;
70–80% is what real loads look like; below that you're producing fantasy.
*Impact: high — moves the headline number by several points.* *Default: 80%, exposed as a visible, editable setting, always shown next to any utilisation figure.*

**D4 · Is a partial load a valid answer?**
If the items don't fit, does the engine return "doesn't fit" (complete-shipment constraint), or load
what it can and report the remainder? These are different problems — knapsack vs. decision.
*Impact: high — API shape, and the whole planner integration story.* *Default: always load what fits and return the remainder; let the caller decide what "fits" means.*

**D5 · Single container, or split across many?**
Phase 1 is one container. But the planner's actual question is "how many containers, and what goes
in each" — a bin-packing problem wrapping the single-container one.
*Impact: high on the `PackResult` contract.* *Default: single container in the engine; multi-container as a thin loop above it, added at Phase 3, with the contract designed for it now.*

**D6 · Floor-loaded cartons, palletised, or both?**
If your cargo is palletised, the problem is two much easier problems (cartons→pallet, pallets→
container) and half this document is irrelevant. If it's floor-loaded, it's the hard version.
*Impact: total — possibly changes the project.* *Default: floor-loaded cartons only; pallets deferred and explicitly out of scope until asked for.*

**D7 · Carton bulge / loading tolerance — global or per-SKU, and what value?**
See §5. Whatever you choose, it must be visible in the UI.
*Impact: high on trust; low on code.* *Default: global percentage, default conservative, per-SKU override later.*

### 10.2 — Shortly after: shapes the model and the numbers

**D8 · Whose container dimensions are authoritative?**
Manufacturer spec, your carrier's, or measured? They differ by tens of millimetres, which is a
whole extra row of cartons.
*Impact: medium-high — it's the denominator of every percentage you print.* *Default: a `containers.json` data file with a source cited per entry, editable, plus a usable-margin per dimension.*

**D9 · How is "geometric capacity" actually computed?**
`CLAUDE.md` promises this number to users, but it isn't a measurement — it's a definition, and a
defensible one is needed. Candidates: (a) best single-SKU idealised grid fill; (b) best result across
all strategies (an achieved lower bound, honestly labelled); (c) a relaxation-based upper bound.
*Impact: high — this number is the product's central claim.* *Default: (b), labelled "best achieved across N strategies", with (a) shown as the idealised ceiling. Never present a computed bound as a physical fact.*

**D10 · How do losses get attributed, and do they partition exactly?**
A void near the roof at the wall is both ceiling loss and boundary loss. Without a deterministic
priority order, categories double-count and stop summing to the total.
*Impact: high — it's the credibility of the explanation feature.* *Default: fixed priority order, each free-space voxel assigned to exactly one category, with an automated test that the categories sum to total free volume.*

**D11 · Weight: model it from day one, or defer?**
Fields in the type are free; retrofitting weight through a packer that assumed volume-only is not.
*Impact: medium now, high later.* *Default: `weight` on the SKU type and COG in metrics from Phase 1; weight *constraints* in the packer at Phase 5.*

**D12 · What's the acceptance test — what makes this "right"?**
Literature benchmarks, agreement with historical real loads, or a planner's judgment?
*Impact: high — it decides when you're done.* *Default: all three, in that order of availability; start collecting 5–10 real historical loads (SKU dims, quantities, what actually fit) now, because it has the longest lead time of anything in the project.*

### 10.3 — Before Phase 4 (planner integration)

**D13 · How does the engine physically reach the Stuffer Planner?**
Copied directory, git submodule, private npm package, or monorepo workspace. This decides whether
"improve the algorithm" is a version bump or a manual sync.
*Impact: medium-high on long-term maintenance.* *Default: build inside `src/engine/` with zero outward imports and a single `index.ts` barrel, so any of the four remains possible; decide at Phase 4 with real information.*

**D14 · Is the pack synchronous in the planner's UI, or a background job?**
The planner may pack dozens of allocations at once. Per-allocation packing at 200 ms each is fine;
at 3 s each it isn't.
*Impact: medium — determines whether a fast approximate mode is needed.* *Default: two modes — a fast estimate (single strategy, capped time) for list views, a full pack on demand.*

**D15 · Where do carton dimensions come from, and who owns them?**
ERP export change, supplier template, or a maintained dimensions table with someone accountable for
it. This is the Phase 4 blocker in `CLAUDE.md`, and it's an organisational question, not a technical
one.
*Impact: total on Phase 4 timing.* *Default: assume a maintained table you own, so nothing depends on an ERP change landing; treat any ERP fields that appear as a bonus.*
*Related: are the dimensions you get **external** carton dims? Internal/product dims are useless here, and the two get confused constantly.*

**D16 · Internal tool, or eventually a product?**
Changes nothing in Phase 1–3 and everything about auth, multi-tenancy, licensing and data handling
afterwards.
*Impact: low now, structural later.* *Default: internal tool, explicitly. Revisit after Phase 3, when there's something to judge.*

---

## 11. What to do first, concretely

1. Vite + React + TS strict, Vitest, the ESLint boundary rule on `src/engine/**`.
2. `engine/types.ts` — `ContainerState`, `Box`, `Space`, `SKU`, `PackResult`, `Violation`, branded `Mm`,
   schema version. Include `weight`, `maxStack`, `allowedOrientations` now even though nothing reads them.
3. `engine/validate.ts` and three known-answer fixtures. Before any packer exists.
4. Single-SKU grid fill → passes the fixtures.
5. Extreme Points + BFD behind the strategy triple.
6. The viewer: instanced mesh, orbit, four camera presets, the three-capacity readout.
7. The timeline scrubber — it will immediately show you what step 5 got wrong.

Phase 1 of `CLAUDE.md` is done when you can watch a container fill and believe the positions. Steps
1–7 are that phase, in dependency order.
