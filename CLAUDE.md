# Claude Project Instructions — Container 3D (Packing & Space Visualiser)

## Core Product Context

A container is not filled with boxes. **It is filled with remaining spaces.**

That sentence is the whole project. Everything below follows from it.

Today the Stuffer Planner allocates PO lines into containers by CBM alone: sum the cases, compare
against the container's capacity, warn near the limit. That is optimistic by construction. Real
cartons leave volume that no carton can occupy — gaps between boxes, a strip along the wall, a
layer that does not reach the roof, the irregular seam where one SKU size meets another. The
planner cannot see any of it, so a load that reads 95% full can be physically impossible, and one
that reads 80% may have been avoidable.

This project answers a different question from the planner's:

| Stuffer Planner asks | This asks |
|---|---|
| How many containers do we need? | **Can that packing actually work?** |

It resolves one number into three, which is the practical output:

```
Theoretical capacity   76.2 CBM   the manufacturer's spec, never changes
Geometric capacity     72.5 CBM   the most THESE cartons could ever occupy
Loaded                 71.3 CBM   what the packer actually achieved
```

The difference between the first and second is a **packaging** problem. Between the second and
third is an **algorithm** problem. Conflating them is why "why isn't the container full?" has never
had a good answer.

---

## Build order — this is deliberate and non-obvious

**Build the model first. The visualiser only draws what the model already knows.**

Like a game engine: physics decides where everything is; the renderer draws it. If the renderer
ever computes a position, the architecture has already failed.

```
                 Input (SKUs + container)
                            │
                            ▼
                  Packing / Space Engine
                            │
                            ▼
                    Container State          ← the contract
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
     Metrics            3D Viewer            Export
```

**Container State is the only interface that matters.** Every box with `{id, sku, x, y, z, l, w, h,
rotation}`, plus the free spaces and the placement history. Given that, the viewer is a loop that
creates a cube, sizes it, moves it, colours it. Improve the algorithm, add a container type, swap
in a solver — the viewer never changes.

Write the engine so it could run with no DOM at all. It should be testable in Node with no browser,
no canvas, and no React.

---

## Two decisions that differ from `idea.md`

`idea.md` is the origin conversation and its thinking is sound. Two of its conclusions are
deliberately **not** followed, and the reasons matter.

### 1. TypeScript in the browser, not Python/FastAPI

`idea.md` recommends a Python backend "because all optimization libraries are Python". True for
OR-Tools and mixed-integer programming. **Not true for where this starts.** Extreme Points and
Maximal Spaces are a few hundred lines of pure geometry — arrays and comparisons, no library.

Choosing TypeScript buys three things that matter more than solver libraries at this stage:

- **No backend at all.** No service to host, no CORS, no latency, no cost. Static deploy.
- **The integration story becomes an import.** The Stuffer Planner is React + TypeScript. A TS
  engine is `import { pack } from 'packing-engine'` — no HTTP boundary, no deployment coupling, no
  serialisation contract to keep in sync. That is the difference between a plug-in and a
  dependency, and it is the whole reason for building this standalone.
- **Instant feedback.** Change a dimension, see the repack. Round-tripping a server kills that.

If genuine metaheuristics are needed later, add a solver service **then**, behind the same
`Container State` contract. Web Workers cover far more than people expect first.

### 2. Standalone app first

`idea.md` argues against standalone: build it as an engine the planner calls. The instruction here
is the opposite, and it is a considered choice — a standalone app is demonstrable, independently
testable, and does not require the planner to change before anything works.

**These reconcile.** Build a standalone app whose core is a clean, dependency-free engine. Package
the engine so it can be lifted out unchanged. Standalone in delivery, engine-first in structure.

---

## Space is a first-class object

The one genuinely novel idea in `idea.md`, and the thing that should distinguish this from every
bin-packing demo on GitHub.

Most packers track boxes and treat leftover air as a byproduct. Here, **empty space is a tracked
object with identity, dimensions, and a quality score.** Placing a box destroys one Space and
creates several. The engine asks "which Space should receive this box?" rather than "where does
this box go?" — the same shift that underlies state-of-the-art packing research, and the reason the
optimiser can eventually reason like a chess engine about the position it leaves behind.

```
Space #17
  position     (6.2, 1.8, 1.4)
  dimensions   0.42 × 0.31 × 1.20 m
  volume       0.156 m³
  fits         SKU B, D, F
  quality      78/100
  status       recoverable
```

Classify every space, because the classes drive completely different advice:

| Class | Meaning | What it tells the user |
|---|---|---|
| **Available** | fits one or more remaining SKUs | productive |
| **Residual** | fits nothing remaining | lost for this load |
| **Fragmented** | many small spaces, meaningful total, individually useless | lost, and the volume is surprising |
| **Recoverable** | residual now, usable under a different arrangement | the optimisation headroom |

**A 1 CBM space is not equal to another 1 CBM space. Shape matters.** Score accordingly: large,
rectangular, accessible, compatible with many remaining SKUs scores high; thin, isolated,
incompatible scores low.

### Name the losses separately

Aggregate "dead CBM" is not actionable. These are, because each has a different fix:

- **Boundary loss** — the strip left when a row of 560 mm cartons meets a 12,030 mm wall. Predictable
  from arithmetic; fixed by carton dimensions.
- **Ceiling loss** — the last layer does not reach the roof. Also arithmetic.
- **Packing gaps** — small voids between neighbours of different sizes. Numerous, hard to remove.
- **Transition loss** — the irregular seam where one SKU size gives way to another. Fixed by
  sequencing.
- **Stair-step loss** — uneven layer heights leaving the next layer an irregular platform.
- **Door loss** — space near the doors that cannot be filled efficiently.

---

## Tech stack

Chosen to match the Stuffer Planner exactly, so the later merge is close to free.

**App**
- React + Vite + **TypeScript** (strict)
- **React Three Fiber** + Three.js + `@react-three/drei` (orbit controls, clipping planes)
- Zustand — same store pattern as the planner
- Tailwind CSS

**Engine** — plain TypeScript, zero runtime dependencies
- Pure geometry. No Three.js import anywhere in engine code. Ever.
- Web Worker when a pack takes long enough to drop frames

**Deliberately not yet:** no backend, no database, no Python, no OR-Tools, no auth. A saved layout
is a JSON file. Add persistence when there is something worth persisting.

**Later, if earned:** a solver service behind the same contract; Supabase if layouts need sharing.

---

## Project structure

```text
src/
  engine/                 ← pure TypeScript. No React, no Three.js, no DOM.
    geometry/             cuboid maths, collision, containment
    spaces/               Space objects, splitting, classification, scoring
    packers/              extremePoints.ts, layerBuilder.ts — swappable strategies
    metrics/              utilisation, loss attribution, centre of gravity
    types.ts              ContainerState, Box, Space, SKU, PackResult
  viewer/                 R3F scene, camera, clipping, layer + timeline controls
  ui/                     SKU editor, container picker, metrics panel
  store/                  Zustand
  fixtures/               known-answer scenarios for testing
```

The `engine/` boundary is the important one: it is what gets extracted into the planner later, so
nothing in it may import from `viewer/`, `ui/` or `store/`.

---

## Phases

Each phase should be usable and reviewable on its own.

**Phase 1 — the model, visible.** 40HC only. Hand-entered SKUs. One deterministic packer. Container
State rendered in 3D with orbit controls. Utilisation and loaded CBM. *Done when you can watch a
container fill and believe the positions.*

**Phase 2 — space as an object.** Track, classify, score and render free spaces as transparent
volumes (green available, yellow limited, red residual, grey fragmented). Attribute losses by
category. *Done when the app explains why a container is not full.*

**Phase 3 — alternatives.** Rotation, several strategies, ranked layouts, side-by-side comparison.
*Done when it recommends rather than reports.*

**Phase 4 — the planner integration.** Extract `engine/` as a package; the planner calls it for
"will this allocation actually fit?".

**Phase 5 — real constraints.** Stack limits, orientation locks (`THIS SIDE UP`), weight and centre
of gravity, door accessibility, loading sequence.

---

## Integration blocker — know this before Phase 4

**The Stuffer Planner does not have carton dimensions.** Its `MasterItem` carries `cbmPerCase`,
`cbmTotal` and `cbmSource` — volume only. The ERP export has no length, width or height, and this
engine cannot do anything with a volume alone: 0.084 m³ could be 600×400×350 or 1200×200×350, and
those pack completely differently.

So Phase 4 depends on a **data** change, not a code change: carton L/W/H per SKU has to reach the
planner, whether from the ERP export, the supplier template, or a maintained dimensions table.

Worth surfacing early — it is the kind of prerequisite that turns a two-week integration into a
two-month one if it is discovered at the end. It is also independently valuable: dimensions unlock
the "if this carton were 20 mm shorter we would save 11 containers a year" analysis, which is
arguably worth more than the loading plan.

---

## Workflow expectations

1. **Engine before pixels.** A feature that cannot be expressed in Container State does not belong
   in the viewer.
2. **Every packing run is reproducible.** Same input, same seed, same output — otherwise nothing can
   be tested or compared.
3. **Keep the placement history.** Store every placement in order. It powers the timeline scrubber,
   and a scrubber is how you catch a floating or intersecting box in seconds instead of hours.
4. **Test the engine as pure functions.** Known-answer fixtures — a container that fits exactly 24
   identical boxes should return 24 and 100%. No browser needed. *(Set up a test runner here from
   day one; the other three apps in this estate have none, and it shows.)*
5. **Explainability over cleverness.** A planner must be able to see *why* a layout scored as it
   did. A better score nobody can justify will not be trusted, and will not be used.
6. **Millimetres as integers internally.** Floating-point centimetres accumulate error across
   hundreds of placements and produce boxes that overlap by 0.0001. Convert at the edges.
7. **Physical plausibility is not optional.** Boxes must not intersect, must not float, must stay
   inside the container. Assert it after every pack — a beautiful render of an impossible load is
   worse than no render.
