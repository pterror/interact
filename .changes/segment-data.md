---
editor: minor
---

editor: `segmentData({ made, initial, splitOff })`, a value kept with each segment of `segments` by its key: moved and
joined with it, brought back with it by undo, derived by the app's `splitOff` for a segment split off another (as
`segments`' `made` reports), none for one laid in from elsewhere until `put` gives it one; changed by an effect in the
app's own transaction or `put` from elsewhere out of history, with `inverse` for the app's history and `changed` for
what to save.
