# true-load

A container is not filled with boxes. It is filled with remaining spaces.

`true-load` is a 3D container loading and space analysis tool. Where a CBM calculator asks *how many
containers do we need?*, this asks **can that packing actually work?** — and when it can't, it says
why, in terms someone can act on.

It resolves one number into three:

```
Theoretical capacity   76.2 CBM   the manufacturer's spec, never changes
Geometric capacity     72.5 CBM   the most THESE cartons could ever occupy
Loaded                 71.3 CBM   what the packer actually achieved
```

The gap between the first two is a packaging problem. Between the second and third, an algorithm
problem. Conflating them is why "why isn't the container full?" has never had a good answer.

## Documents

- [CLAUDE.md](CLAUDE.md) — architecture, principles, and build order
- [PLAN.md](PLAN.md) — prior art, standard practice, and the open decisions
- [idea.md](idea.md) — the origin conversation

## Status

Pre-implementation. Design is settled; no code yet.
