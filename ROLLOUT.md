# ROLLOUT.md — Taking this to the stuffer planning team

Companion to `CLAUDE.md`, `PLAN.md`, and `UIUX.md`. Those describe what the app is and how it
should evolve. This one is about the conversation you're about to have with people who actually do
this job every day, who you've said you're not deeply embedded with yet. Its job is to make sure
that conversation surfaces the right facts instead of just admiring the 3D view.

The core risk of any demo like this: a good render is persuasive whether or not it's correct.
CLAUDE.md already says it — "a beautiful render of an impossible load is worse than no render."
Nobody in the room will know that but you. This doc is the checklist for making sure you do.

---

## 1. What you can honestly claim today, and what you can't yet

Be precise about this before you're precise about it in front of them.

**Solid, and demonstrable live:**
- Loss attribution is exact — the six categories (loaded, gaps, column rounding, boundary,
  ceiling, trailing length) provably sum to the container's exact volume. Not an estimate.
- Ranked strategies show a real, measured spread on your actual data — 77–83% depending on
  sequencing and rotation, not a made-up range.
- The rotation feature is a real, verified effect (MOCK01/MOCK02: 83.4% vs 77.0%, boundary loss
  0.0% vs 9.8%, same carton, same volume, just turned 90°).
- Priority flags let a business rule ("this SKU ships complete, no exceptions") override pure
  geometry — the app doesn't just optimize blindly.

**Not proven yet — say this out loud before someone else finds the gap:**
- The packer places each SKU in its own exclusive slab and never mixes two SKUs in the same
  layer (see the doc comment on `pack()` in `shelfPacker.ts`). That's a deliberate, documented
  simplification to stay support-correct, but it means your utilisation numbers are a **lower
  bound** on what's geometrically possible — a skilled human crew doing true wall-building might
  already beat it by eye. Don't let the demo imply "the algorithm found more space than your
  loaders" until you've checked that against a real load.
- Zero real-world constraints yet: no stack limits, no weight/axle distribution, no `THIS SIDE UP`
  orientation locks, no multi-drop sequencing, no door accessibility. CLAUDE.md calls this out as
  Phase 5. If any of those are load-bearing in daily operations (literally), the current numbers
  are optimistic in a different, more serious way than the planner's CBM-only estimate is.
- Untested outside your current ~7 SKUs' actual dimensions. Real catalog is presumably hundreds of
  SKUs with far more shape variety.

---

## 2. The blocker to raise first, not last

CLAUDE.md already names this: the Stuffer Planner's `MasterItem` carries `cbmPerCase` and
`cbmTotal` — volume only, no length/width/height. This entire app is worthless without carton
dimensions, because 0.084 m³ could be 600×400×350 or 1200×200×350, and those pack completely
differently.

**Ask this in the first ten minutes, not at the end of the demo:** where would carton L/W/H
actually come from in production — the ERP export, a supplier packing template, a maintained
dimensions spreadsheet someone already keeps, or nowhere at all today? The answer reshapes
everything else in this document. If the honest answer is "nobody has this reliably for most
SKUs," the highest-leverage next step isn't improving the algorithm, it's a data-collection pilot
on the top 20–30 SKUs by shipped volume.

---

## 3. Concrete things to propose piloting

Each of these is a plausible way this plugs into a real week, with the catch to watch for named
alongside it.

| Use case | What it offers | Watch for |
|---|---|---|
| **Pre-ship sanity check** | Planner's CBM-based estimate says 95% full; this app either agrees it physically fits or flags that it doesn't, before a truck shows up. Low-risk — doesn't replace anything, just a second opinion. | False confidence if carton dims for that order are stale or approximate. |
| **Reconstruct a chronically underfilled load** | Take 2–3 real past shipments that came in lower than expected, rebuild them here, see if loss attribution names something fixable (boundary loss from one SKU's orientation, e.g.) vs. something that's just how that SKU mix behaves. | If the app's number doesn't match what actually happened, that's not necessarily the app being wrong — ask what the loaders did differently, since the answer might be a missing constraint (see §1). |
| **Carton-dimension what-if** | "If SKU X were 20mm shorter, would we save a container a year?" — a question the planner currently has no tool to answer at all, since it only sees CBM. Arguably the highest-leverage pitch in this list because it's a packaging/procurement decision, not a loading-skill one. | Needs the dimensions data from §2 to be trustworthy per-SKU, not just in aggregate. |
| **Rotation / orientation check** | Confirm compliant 90° turns that reduce boundary loss, as already demonstrated live. | Ask whether experienced loaders already do this by instinct — if so, the app's value is *confirming and documenting* a judgment call, not discovering a new one. Also confirm rotation is compliant per-SKU, not universally (printed face, strap, spout — exactly why `allowRotation` is per-SKU already). |
| **"Will this order need 2 containers"** | The multi-container Plan mode sketched in `UIUX.md` — most directly matches a planner's actual daily question, and shows what the remainder container looks like so they can decide to ship partial, wait, or add a filler SKU. | Not built yet — mention it as a direction, not a current capability. |

---

## 4. Questions to ask the planning team

**Their current process**
- Walk me through how you decide container count and allocation today — spreadsheet, a formula,
  experience, some mix? Where does the CBM number you currently trust actually come from?
- When a container comes back underfilled, how do you find out why? Is there already an intuition
  for "that SKU always leaves a gap," or does it stay a mystery?
- How much of this is a solo decision vs. something the loading crew adjusts once cartons are
  actually in hand?

**Data reality (the load-bearing questions)**
- Do you have carton L/W/H anywhere reliable, per SKU? (See §2 — ask this early.)
- **Are cartons loaded loose, or palletized before they go in?** This one can invalidate the
  entire per-carton model if the answer is "palletized" — the real packing unit might be the
  pallet, not the individual carton, which is a different geometry problem than the one this app
  currently solves.
- Do you have carton weight? Stacking limits (max cartons high, or a "no stacking" flag)?
  `THIS SIDE UP` / orientation-locked SKUs?
- Are containers usually single-SKU, or a genuine mix per load? (Changes how much the ranked
  multi-SKU strategies actually matter in practice.)

**Constraints this app doesn't model yet**
- Multi-drop loads — does one container ever serve more than one destination, requiring
  load-order-by-unload-order sequencing near the doors?
- Weight distribution / axle limits, separate from volume?
- Any fragile, hazmat, or temperature-based separation rules between SKUs?

**Trust and adoption**
- What would make you *not* trust a number this app gives you? What's already burned you before
  with a tool that looked authoritative and was wrong?
- Is a wrong-but-confident 3D plan worse than today's CBM-only estimate, because it looks more
  certain than it is? (Ask directly — this is the real risk CLAUDE.md's explainability rule
  exists to manage.)
- If this said a load "should" achieve 83% and the crew only hits 77% in practice, whose number
  wins, and why?

**What "better" would even mean**
- Fewer containers shipped per year? Higher average utilisation? Fewer loads that had to be
  redone? Less time spent planning per order? Get a number they'd actually recognize as success —
  without one, "efficiency improvement" stays a slogan neither of you can check later.

---

## 5. Going into the demo

- **Bring real shipments, not just the MOCK01/MOCK02 demo pair.** Reconstruct 2–3 actual past
  loads — ideally one that's remembered as a good load and one remembered as a frustrating one —
  so the numbers land against something they already have an opinion about, not an abstraction.
- **Let them drive, don't just present.** The priority and rotation checkboxes are simple enough
  to hand over directly; watching someone with real domain knowledge poke at it surfaces gaps
  faster than a scripted walkthrough.
- **Lead with §2's data question as an ask, not just a question.** "Can we get L/W/H for the top
  20 SKUs by shipped volume as a trial" turns the conversation into a concrete next step instead
  of ending on "interesting, let us think about it."
- **Don't let the ranked-strategies view become a black box.** If you show the six-strategy
  comparison, be ready to explain each one in one plain sentence (CLAUDE.md's own rule: a better
  score nobody can justify won't be trusted). If you can't explain why one order beats another in
  a sentence, don't show that view yet.

---

## 6. After the conversation

Whatever you hear should directly reorder what gets built next, not just get filed away:

- If carton dimensions are genuinely unavailable → the highest-leverage next step is a data pilot,
  not more algorithm work. Say so, even though it's less exciting to build.
- If cartons are palletized before loading → the packing unit assumption needs revisiting before
  any of this is production-relevant. Worth knowing before Phase 3 alternatives work goes further.
- If stacking/weight/orientation-lock constraints are common → those move up ahead of `UIUX.md`'s
  Plan mode, since a geometrically-full container that can't legally stack that way isn't useful.
- If the team already hits or beats this app's utilisation numbers by feel → the pitch shifts from
  "optimizes better than you" to "explains and documents what you already know how to do," which
  is a different, still valuable, but differently-framed product.
