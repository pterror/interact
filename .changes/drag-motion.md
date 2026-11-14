---
list: minor
---

list: `drag` asks Gap with a second argument, the drag (`{ key, from }`, the same record throughout one drag), and calls
`showing` with a second argument, the Motion (`{ key, from, point, phase }`): on every move, over the dragged item
itself too, then `dropped` (before `reorder`) or `cancelled`, then `ended` (after `reorder`). Gaps and showings that
take one argument behave as before, but `showing` is also called again with an unchanged place, and twice with none at
the end.
