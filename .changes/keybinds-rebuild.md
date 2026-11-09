---
keybinds: minor
---

keybinds: rebuilt as small modules the app wires by hand; every API changed (breaking, so a minor version while below
1.0). The engine is Sinks over Finds: `presses`, `releases`, `holds` and `sequences` over `bindingTable`, `looseTable`
and `anyOf`, a Find giving every lookup's handlers best first. The inputs are `keyListen`, `mouseListen` and
`padButtons` over one `pads()` loop, each taking `blocked` (`outsideOverlay(target)`, or `focusInOverlay(target)` for
pads); key syntax is opt-in pieces (`symbols()`, `aliases()`, and `printed()`, a fallback key for typeahead); axes are
values (`keyPairAxis`, `mouseAxis`, `padAxis`, `sumAxis`, `scaleAxis`, `axisWhen`); formatting, recording, modifiers
alone and rebinding (`bindingStore`, `localStorageBindings`, `bound`, `rebind`, `recording`) are modules of their own.
`keybinds(bindings, options)` is the ready-made composition: commands are
`{ keys, mouse, pad, run, when, typing, anyModifiers }` (no ids, labels or context; `gamepad` is now `pad`), routed by
their syntax (`:up`, `:hold`, `:tap`, steps) as the `releases`, `holds` and `sequences` options allow; it returns
stopping and `axis(axis)`. The cheatsheet, radial menu and settings panel are now `cheatsheet()`, `radialMenu()` and
`settings()`, unstyled compositions over `@pterror/interact-list` (a new dependency) in the light DOM, with their state
as `aria-*` and `data-*` attributes; no custom elements. The settings panel shows a Release switch only on releases; the
cheatsheet lists axes. No stylesheet: `styles/palette.css` is gone, and `sideEffects` is false.
