---
editor: minor
---

editor: `toolbarKeys`, the WAI-ARIA toolbar's moves composed onto a toolbar's buttons: a roving tabindex (one Tab stop,
the button last focused), and `by(n)` and `edge(n)`, which focus another button, wrapping at the ends, a button whose
tool doesn't apply included. It reads no key: the app binds the arrow keys along its `orientation` (set as
`aria-orientation`), Home and End to them.
