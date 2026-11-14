---
list: minor
---

list: `drag` takes `drawn` (hearing the drawn keys change) and `held` (a held key of the list, from
`hold(undefined, 'none')`), both required (breaking, so a minor version while below 1.0). Reorder answers: `true` once
the list is as the move left it and its listeners have heard, `false` if it won't move, at once or later; `arrayReorder`
and `groupReorder` answer so. A drop ends once the reorder answers or fails. The dragged key is held while the drag
lasts, and the drag is cancelled when the list removes it; other changes ask the gap again. Stopping `drag` cancels and
ends a drag under way, ends a drop waiting for its answer, and lets go of the held key.
