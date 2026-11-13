---
list: minor
---

list: `heldKeys`, held keys for a list not held in memory (`cursorPages`, a server): `hold(initial, whenRemoved)` and
`remove(removals)`, each removal a removed key with its neighbours before the edit. The app calls `remove` inside the
edit, before the list's listeners hear of it, so a held key never names a removed item.
