---
list: minor
---

list: `follow`, a Facet drawing the dragged item along with the pointer by its `translate` (kept under the pointer as
the items scroll or change under it) and, once the drag ends, sliding it from where it was let go to its place, marked
`data-settling` while it does; and `makeRoom`, a Facet moving the items a drag would pass one place aside, sliding, held
through a drop or cancel until the drag ends and then slid to where they are laid out. Each also takes drag's `showing`.
