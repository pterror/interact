---
editor: minor
---

editor: `segments({ parent, initial, key, text, edit, extensions })`, one editor over many texts that live apart, as one
document, the texts in order with one line break between two. Each segment's text comes through its own port, as
`textEditor`'s does: `text(key)` is its Text, laid in with the edits it doesn't include yet over it, and
`edit(key, changes, id)` hears each edit to it, positions in its text. `key()` makes the key of a segment `split` makes;
keys are the app's and opaque. It gives the view, `of(state)` (the segments in order, with where each text is), `split`
(a command the app binds), `made(transaction)` (the segments a transaction split off another or laid in), `insert`,
`remove` and `move` for changes made elsewhere, `reorder` for the person's move, which undo undoes with the effects
`inverse(transaction)` gives the app's history, and `stop()`. A join is undone with the segment's key.
`fromElsewhere(transaction)` tells a transaction that lays in a change made elsewhere (from `textEditor`, `segments` or
`segmentData`) from the person's.
