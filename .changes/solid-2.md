---
solid: minor
---

solid: Solid 2 (`solid-js` 2 with `@solidjs/web`, an optional peer) from `@pterror/interact-solid/2`, which exports what
`@pterror/interact-solid` does for Solid 1.8+. Both run one implementation: its modules export a factory binding them to
a version's adapter (`interactWith`, `componentWith`, `toWatchedWith`, ...; `componentItems`, `toSet` and `toValue` as
they are), and each widget's module a factory binding it to an entry's `component` (`selectWith`, ...). In Solid 2 a
Watched hears a change, and an item's effects run, at the flush that applies it.
