---
list: minor
---

list: `follow`, a Facet drawing the dragged item along with the pointer by its `translate` (kept under the pointer as
the items scroll or change under it) and, once the drag ends, sliding it from where it was let go to where it is laid
out (into its new place, or back to where it started), marked `data-settling` while it does; and `makeRoom`, a Facet
moving the items a drag would pass one place aside, sliding, held through a drop or cancel until the drag ends and then
slid to where they are laid out. `makeRoom` takes `rank` as Rank's record (`{ rank }`). Each gives drag's `showing`, and
`has(key)`: whether it draws that key's `translate` now. Every slide is one Web Animation of `translate`, eased out, one
at a time per element.
