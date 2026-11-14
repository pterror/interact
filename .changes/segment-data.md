---
editor: minor
---

editor: `segmentData`, a value kept with each segment of `segments` by its key: moved and joined with it, brought back
with it by undo, derived by the app's `split` for a segment Enter splits off, changed by an effect in the app's own
transaction or `put` from elsewhere out of history, with `inverse` for the app's history and `changed` for what to save.
