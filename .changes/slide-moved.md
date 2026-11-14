---
list: minor
---

list: adds `slideMoved({ drawn, duration, leave })`, a facet that slides the items a change to the drawn keys moves from
where they were drawn to where they are laid out, leaving the keys `leave` names (`follow`'s and `makeRoom`'s `has`) to
what draws them. It hears the drawn keys from when it is made until `stop()`.
