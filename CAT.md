# CAT.md — filling the leftover space

Companion to `CLAUDE.md`, `PLAN.md`, and `LIMITATIONS.md`. A conversation with someone who actually
loads containers just confirmed, independently, the single gap those docs already flagged as the
highest-priority thing wrong with this app. This document is how to think about that gap and a
concrete, honestly-scoped path to closing it. **No code changes here — this is a design doc only.**

---

## 1. Two descriptions of the same gap

The dock worker's version: even when a stack doesn't come out to a clean rectangle, a crew doesn't
leave the leftover space empty. They grab a smaller or different box that completes the gap, then
adjust for whatever comes next.

`LIMITATIONS.md` §1's version, written before that conversation happened: this packer gives every
SKU its own private "room" — full width, full height, however much length it needs — fills that
room with nothing but that one SKU, then seals it and moves on. A 300mm box in a 2,698mm-tall
container leaves 298mm of headroom for the *entire length* of that SKU's room, because nothing else
is allowed in there to use it. Flagged there as **priority: highest**.

Same gap, described from two directions — one by a person who does this for a living, one by the
code auditing itself. That's worth taking seriously precisely because nobody had to go looking for
it; it showed up twice, independently, without either side prompting the other.

*(One unrelated thing worth knowing while we're in `LIMITATIONS.md`: §4, "No rotation search," is
now stale — footprint rotation shipped this session. Not otherwise relevant here.)*

---

## 2. What the worker described, in this project's vocabulary

The worker doesn't reserve a room and fill it with one thing. They finish a rough stack, look at
what's left, and ask: *what do I have that fits this shape?*

That question is `CLAUDE.md`'s entire thesis, restated by someone who's never read it: **a
container is filled with remaining spaces.** And it's not a vague aspiration — it's a specific,
named rung on `PLAN.md`'s own algorithm ladder (§3, rung 3, "Maximal Free Spaces"): *"placing a box
splits every intersecting space into up to six new maximal cuboids... this is where Space becomes a
first-class object with real identity."* The dock worker described the research literature's answer
to this problem without knowing it was one.

---

## 3. How to think about it

**Reframe first.** Leftover space isn't a byproduct of packing — it's inventory, the same as any
SKU. The question isn't "did this SKU's slab pack well," it's "what does the space this slab
*didn't* use qualify to receive next."

**Name what's already sitting there.** This packer already computes the exact volume of four
leftover shapes per SKU slab — `lossAttribution.ts` sums them today, it just doesn't treat them as
literal, fillable regions:

| Shape | What it is | Closest to what the worker described |
|---|---|---|
| Boundary strip | The width no row reaches | |
| Ceiling strip | The height no layer reaches | The 298mm example above |
| Trailing length | Container length no slab claimed at all | |
| Column-rounding remainder | The partial column a SKU's own quantity ran out inside | **Yes — a SKU ran out mid-column, not mid-slab, exactly the "doesn't come out to a clean rectangle" case** |

*(These four are cleanly separate almost everywhere in a slab — except inside a SKU's own single
partial column, where the column-rounding and ceiling shapes typically merge into one larger,
irregular pocket. §4 works through a real example where that's exactly what happens.)*

**Take the difficulty seriously — it's real, not a confidence problem.** This project already
learned this lesson once, the expensive way: `density-desc` (most volume per mm of length) looked
*provably* optimal on paper — a textbook greedy fractional-knapsack solution. It lost to
`footprint-desc` on real data (81.6% vs 82.6%), because the derivation ignored integer
column-rounding waste that only shows up once you actually pack and measure. Void-filling is a
harder version of the same trap: filling one gap changes what's available for the next one, so a
choice that looks locally smart can be globally worse. Two bits of vocabulary worth having for that
conversation later:

- **First-fit vs. best-fit** — take the first box that fits a gap, or search for the one that
  wastes the gap least.
- **Greedy-now vs. reserve-for-later** — fill this gap with the best thing available right now, or
  deliberately hold a mediocre fit back because something better is coming later in the load.

The house rule this implies: **never trust a derived void-fill heuristic.** Pack it, measure it
against real `data.csv`, and let the number decide — the same discipline `rankConfigurations`
already enforces on the six sequencing strategies.

---

## 4. Worked example: Citybird → Eagle, with real numbers

Worth working through with your own actual data, because it's exactly the example you already
noticed in the 3D view — Citybird doesn't tile into a clean rectangle, and Eagle, being smaller,
looks like it could use what's left. Here's what's actually there, verified against the real
engine and its real `validate()` check — not eyeballed.

Citybird (570 × 460 × 350mm, qty 300) alone in a 40HC grid-fills 5 across the width and 7 up the
height, and needs 9 columns of length to place all 300 of them. But 9 columns hold 315 (9 × 35 per
column), so the 9th column is only 20 of 35 full. That's the "doesn't come out to a clean
rectangle" moment, and it's worth checking both of the *obvious* leftover shapes against Eagle
(530 × 366 × 300mm) before getting excited: the boundary strip here is 27mm wide — too thin for
anything in your catalog — and the ceiling strip is 213mm tall, which is *shorter* than Eagle needs
to stand upright (305mm with tolerance). Neither obvious shape is where your observation is
actually happening.

The real pocket is the partial 9th column itself, and it's bigger than the ceiling-strip number
alone suggests. In that one column, two of Citybird's five width-bands (930mm combined) have zero
boxes at *any* height — not just above the 2,485mm line, but from the floor all the way up. The
column didn't run out of height, it ran out of *units*: Citybird's column-rounding remainder and
its ceiling strip physically merge into one larger, irregular pocket, but only in that one partial
column — every other column in Citybird's slab is packed solid, so this doesn't happen anywhere
else.

Measured exactly, that pocket is 575mm long × 930mm wide × 2,698mm tall (floor to the real
container ceiling). Eagle fits **1 × 2 × 8 = 16 boxes** in it — not 2. Sixteen real Eagle boxes were
constructed at those exact coordinates and run through the actual `validate()` alongside Citybird's
real boxes: zero violations, nothing intersecting, nothing floating.

Two things worth taking from this, beyond the number itself:

- **The instinct was exactly right, and the gap between instinct and reality is precisely what §3's
  "measure it" rule exists to catch.** 2 vs. 16 is a big miss, and it came from a strip being bigger
  than it looked from the viewer, not from the reasoning being wrong.
- **Eagle never appears in `state.unplaced` anywhere in this example — it's fully placed already, in
  its own slab immediately after Citybird's.** That's the detail that matters most for §6's design:
  it means "leftover SKUs" can't just mean "whatever's still unplaced once the whole plan is
  packed" — see decision 1 in §11.

---

## 5. The real fork: two different sizes of fix

**Option A — the textbook fix.** Replace `pack()`'s slab approach with `PLAN.md`'s rung 2 (Extreme
Points) or rung 3 (Maximal Spaces): every SKU placement competes for the best available space,
tracked as a real object. This is what `LIMITATIONS.md` calls "the fix."

**Option B — recommended first.** Leave today's slab packer exactly as it is, and bolt on a second
pass that runs *after* it finishes: walk each slab's four already-known leftover shapes and try to
fit smaller, still-unplaced SKUs into them. Same shape as how rotation and priority got built this
session — small, modular, never conflated with the core algorithm.

**Why B first:**

- It leaves the entire tested surface untouched — six `PackOrder`s, rotation, priority, tolerance,
  ranking, the loss-partition invariant that provably sums to the container's exact volume. None of
  it has to be re-verified against a different placement algorithm.
- It follows this project's own rule against running two unverified packers side by side.
- It's the closer literal match to what the worker actually described — patching a mostly-built
  rectangular load, not a from-scratch space-native rewrite.
- It produces the evidence that would justify Option A, instead of guessing. `LIMITATIONS.md`
  itself admits there's currently no way to know how much a smarter packer would recover, because
  there's nothing to compare against. Option B, measured on real data, answers that directly.

**Its honest ceiling:** Option B can only reach voids inside a *single* slab — the four shapes in
the table above. It cannot touch "packing gaps" or the transition seam *between* two different
SKUs' slabs. Those categories genuinely need Option A's real space-tracking to ever close. Don't
oversell B as solving the whole problem the worker described — it solves the biggest, cleanest
piece of it.

---

## 6. How Option B would actually work

**A new, deliberately minimal `Space` type** — geometry only, no baked-in score, since scoring
depends on which SKUs are still unplaced at fill time, not on the space's own history:

```
Space { id, originSlabIndex, kind: boundary|ceiling|trailing|columnRounding, x, y, z, l, w, h, volumeMm3 }
```

Natural home: `src/engine/spaces/` — a directory `CLAUDE.md`'s own project structure already names
as intended, that nothing has built yet.

**Each shape's region is defined to exactly match what `lossAttribution.ts` already computes the
volume of**, so a `Space`'s volume can never silently disagree with the loss number already on
screen. One precise detail matters here: the ceiling space's *floor* is the top of the primary
SKU's boxes, not the container floor, and its width is that SKU's own row footprint, not the full
slab width. A filler placed outside that footprint would genuinely float — which is exactly what
the *unmodified* `validate.ts` would catch, since it already checks real support box-by-box,
independent of which SKU or slab a box belongs to.

**Candidate pool: not just `state.unplaced`.** §4's example is exactly why this needs more care
than it first looks like it does. Eagle was never unplaced — it just hadn't had its turn yet. The
real candidate pool is *any SKU not yet placed at this point in the sequence*, which for a SKU
later in the order means its full remaining quantity, not merely whatever's still unplaced once the
whole plan finishes. Whether that's built as an interleaved step or a final cleanup pass is decision
1 in §11 — it determines whether this design can reach your own example at all.

**Scoring: measured fill ratio** (placed volume ÷ space volume), not a derived formula — the same
"measure, don't assume" rule from §3.

**Interaction with `priority`:** worth being precise here, because it's easy to get wrong. Priority
doesn't mean "this SKU competes harder for space" — it only controls whether a SKU's *own* trailing
column rounds up (ships in full) or down (holds the remainder back). Void-fill never revisits an
earlier slab decision. Priority is reused only as a tie-break among eligible filler candidates — the
same "second axis, not a redefinition" pattern `UIUX.md` already established when priority was
extended into the multi-container Plan mode.

**Interaction with the six `PackOrder`s: one global toggle**, structurally identical to
`toleranceMm` — applied uniformly regardless of which of the six strategies packs, not crossed into
`rankConfigurations` as a second ranked dimension. No 12-way explosion, same modularity rule already
applied to rotation. And there's a real, non-hypothetical reason to keep it a visible toggle rather
than always-on: mixing two SKUs into one region might be harder for an unloading crew to sort or
execute on a multi-drop load. That's exactly the kind of question `ROLLOUT.md` already told you to
ask the dock team directly — see §10.

**What has to change:** `lossAttribution.ts`, unavoidably — its formulas are closed-form arithmetic
derived from one SKU's uniform grid per slab, and the moment a second SKU's boxes occupy part of a
ceiling, boundary, or column-rounding shape, those formulas overcount loss unless they're told to
subtract the filler's volume. Two ways to fix it, worth presenting honestly rather than picking one
blindly:
1. **Subtract the filler** from the existing closed-form formulas. Smaller change, keeps
   zero-void-fill output byte-identical to today. Recommended for a first pass.
2. **Recompute by scanning actual box geometry** against each discovered `Space`'s bounds. More
   invasive now, but it's the version that survives unchanged if Option A ever happens.

`pack()`'s core loop changes too, and how much depends entirely on decision 1: cleanup-only timing
needs just one additive field (a slab's starting position); interleaved timing needs a real, if
small, change — before computing a SKU's own slab, subtract whatever quantity a prior slab's
void-fill already claimed for it, so the same units are never placed twice (once in the pocket,
once again in that SKU's own slab further down the container).

**What doesn't change either way:** `validate.ts` (already box-agnostic — it checks real geometry,
not which SKU or slab a box "belongs" to — which is exactly what proved §4's 16 boxes were real) and
`footprintOrientation.ts`.

---

## 7. Phased build sequence

A small sub-ladder that sits *beside* `PLAN.md`'s numbered one, not a renumbering of it.

One correction worth making explicit: timing (§11 decision 1) isn't its own rung, and shouldn't be
deferred. Cleanup-only — running once, at the very end, against final `state.unplaced` — cannot see
the Citybird/Eagle case at all, since Eagle is never unplaced there. Interleaved timing has to be
present from rung 0 for this feature to reach the case that motivated it. What actually scales
across the rungs below is *scoring sophistication* (how many candidates get considered, and how a
winner gets picked among them), not whether the pass runs interleaved — that part is a prerequisite,
not a later upgrade.

| Rung | What it does | Why this order |
|---|---|---|
| **0** | `Space` geometry + a transparent-volume viewer layer. No filling at all. | Touches zero existing files. Verifies the region math visually before any placement risk exists — almost exactly `CLAUDE.md`'s own Phase 2 description. |
| **1** | Interleaved, but only auto-fill a pocket when exactly one geometrically-eligible filler SKU exists among those later in the sequence. | Sidesteps the *scoring* question entirely (no ranking needed when there's only one candidate) while still reaching real cases. Proves placement + validation + the loss-attribution fix — §4's Citybird/Eagle pocket, verified against the real engine, is exactly this rung's known-answer fixture. |
| **2** | Full design from §6 — multi-candidate scoring, priority tie-break, the global toggle. | The real feature. |
| **3** | `MetricsPanel`/`LossBreakdownBar` show what void-fill actually recovered, in a sentence. | `CLAUDE.md`'s explainability rule — a better number nobody can explain won't be trusted. |
| **4** *(conditional)* | Only if rung 2's *measured* recovery on real `data.csv` justifies it: revisit Option A, entering at Extreme Points, not Maximal Spaces. | Don't skip rungs — and don't guess when you could know. |

---

## 8. If Option A is ever the real answer

Briefly, honestly: placing a box splits the space it's in into up to six candidate cuboids (and
forces re-splitting of any *other* space the box happens to intersect), discarding anything fully
contained in another. `PLAN.md`'s own flagged cost is real: without aggressive pruning, the space
count grows superlinearly — "thousands of spaces by box 300."

What survives from today vs. what needs real rework:

| Concept | Under Option A |
|---|---|
| `PackOrder` | Survives as an idea, but none of today's rankings transfer — footprint-desc beating density-desc is a fact about *this* algorithm, not physics. Re-measure from scratch. |
| `priority` | Needs genuine redesign — there's no "own slab" left to round a column within. |
| `spaceSelector` (`PLAN.md` §2's third policy) | Wholly new. Doesn't exist in any form today. |
| `toleranceMm` | Unaffected either way — pure edge-inflation, independent of placement algorithm. |

---

## 9. Explicitly not doing

For whoever eventually builds this: no recursive re-splitting of a void's own leftover-after-fill
(that's real Maximal-Spaces recursion — out of scope for a first pass); no full six-orientation
tipping as a side effect (stays footprint-only, per the existing compliance reasoning behind
`allowRotation`); not crossing void-fill into `PackOrder` as a ranked dimension.

---

## 10. Questions for the dock team

Since you're already mid-conversation with the people who'd actually judge this:

- Does mixing two different SKUs into one region match what a crew can safely sort or execute,
  especially on a load with more than one drop?
- Is "leave it empty" sometimes the *correct* real-world call over "mixed and harder to unload" —
  and if so, what tells you which situation you're in?

---

## 11. Decisions to make before building this — and the recommended call on each

These are yours to make, not something to derive from the code — §6's design depends on each one.
Each carries a recommendation below, arrived at by actually working the numbers rather than
guessing, same as everything else in this document — but they're still open calls, not settled
facts, and worth revisiting once real use says otherwise.

1. **Timing: interleaved, or cleanup-only?** Does void-fill run *between* each SKU's turn, so a
   later SKU's not-yet-placed quantity can be drawn forward into an earlier SKU's gap (with that
   SKU's own subsequent slab correspondingly reduced, so nothing is placed twice) — or strictly
   *after* the whole plan is packed, touching only whatever's left in the final `state.unplaced`?
   **This is the single most consequential decision here.** Cleanup-only is the smaller change, but
   it would not reach your own Citybird → Eagle example — Eagle is never unplaced, it's just not
   placed *yet*. Interleaved reaches it, at the cost of a real, if small, change inside `pack()`'s
   core loop rather than a pure bolt-on after it.
   **Recommendation: interleaved, from the first line of code.** Cleanup-only isn't meaningfully
   cheaper to build — discovery, scoring, and validation are the same either way, and the only extra
   cost interleaving adds is a qty-reduction step before a SKU's own slab, which isn't the hard part.
   Building the weaker version first wouldn't buy anything, since it can't see the case that
   motivated this whole document. See §7's revised ladder — timing is a rung-0 prerequisite, not a
   later upgrade.

2. **Minimum fill-quality threshold.** A pocket that fits one small box while wasting most of its
   own volume is still, technically, a fit. Do you want any geometric fit accepted regardless of how
   much of the pocket goes unused, or a minimum utilisation bar below which a pocket is left alone —
   and if the latter, a fixed number, or something you'd tune per load?
   **Recommendation: no threshold for v1.** Once a filler's own later slab is correspondingly
   reduced (already required for correctness, per decision 1), an accepted fit is a strict
   improvement no matter how small — dead volume becomes loaded volume, and nothing gets worse.
   Add a threshold later only if real use shows a tiny filler isn't worth the extra handling
   complexity on the loading sheet — which is a question for decision 5 and §10, not this one.

3. **Which SKUs are allowed to be fillers.** The default in §6 is "any SKU that geometrically fits"
   — same posture as `priority`/`allowRotation` today: on by default, opt out per SKU. Real reasons
   you might want an exception: a fragile SKU, one with a printed or branded face that shouldn't end
   up wedged sideways into a scrap pocket, or a high-value SKU you'd rather not split across two
   physical locations on the loading sheet.
   **Recommendation: all SKUs eligible by default, opt out per SKU.** Mirrors `priority`/
   `allowRotation` exactly, so it costs nothing new to learn — the same row, the same kind of
   checkbox, the same "on unless you say otherwise" posture the user already trusts.

4. **How many of the four leftover shapes to target first.** Your own example landed on the
   column-rounding pocket — which, as §4 shows, often *merges* with that same SKU's ceiling gap into
   one larger, irregular void, specifically in whichever single column absorbed the rounding. Scope
   v1 to just that combined case (closest to what you actually observed, and apparently where the
   real opportunity is in your current catalog), or all four shapes — including boundary and
   trailing-length, which didn't apply to Citybird specifically but will to other SKUs — from the
   start?
   **Recommendation: column-rounding merged with ceiling, plus true end-of-container trailing
   length — skip boundary strips for now.** This isn't just what your example happened to hit, it's
   structurally the common case: a column-rounding/ceiling merge shows up for essentially any SKU
   whose quantity doesn't exactly fill its last column, which is most of them. Boundary strips are
   only real when a SKU's width doesn't evenly divide the container's width, and are frequently too
   thin to matter — Citybird's is 27mm. Trailing length is only ever a genuine pocket at the very
   end of the whole sequence, since slabs already sit flush against each other today. Boundary strips
   are the one shape that's cheap to add later without disturbing anything already built.

5. **Loading-sheet visibility.** If two different SKUs end up sharing one physical pocket, does a
   crew need that called out explicitly on the plan so nobody misses it, or is the 3D view and box
   list enough on their own? Same question as §10 — worth deciding for yourself before you ask them,
   so you know what you're actually asking.
   **Recommendation: defer.** Ship with the 3D view and box list as the only visibility, same as
   every other feature today — rotation and priority didn't get a dedicated callout either, just a
   marker in the row that was already there. Add an explicit "mixed pocket" indicator only if the
   dock team says, once they've actually seen it, that it isn't enough.
