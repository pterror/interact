---
list: major
---

list: `drag` takes `drawn` (hearing the drawn keys change) and `held` (a held key of the list, from
`hold(undefined, 'none')`), and an optional `wait`. A drop ends once the drawn keys next change, once `reorder` answers
`false` or fails (it may now answer later), or after `wait` (2000 ms). The dragged key is held while the drag lasts, and
the drag is cancelled when the list removes it; other changes ask the gap again.
