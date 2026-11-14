---
list: minor
---

list: `heldKeys`, held keys for a list not held in memory (`cursorPages`, a server): `hold(initial, whenRemoved)`,
`remove(removals)`, each removal a removed key with its neighbours before the edit, and `add(keys)`, keys the list has
again. The app calls `remove` inside the edit, before the list's listeners hear of it, so a held key never names a
removed item; a removed key can't be held until it is added back, as `arrayList` holds only keys it has.
