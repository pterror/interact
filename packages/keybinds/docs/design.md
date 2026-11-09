# Design notes

The design, its rules and what changed in review are in the repo's
[docs/design.md](https://github.com/pterror/interact/blob/master/docs/design.md), under "Keybinds". In short:

- Each module does one thing and declares the shapes it uses (Find, Sink, Handler, Query, ...); the app wires them by
  hand. `keybinds()` is one such wiring, for pages and simple apps.
- Which table a binding goes in is the syntax it uses (`k:up` is a release), decided by the composition, not the engine;
  the engine has no list of phases or inputs.
- An overlay blocks a binding by where the binding listens: inside the overlay, or on it, it hears its keys.

## Why it ships UI, and no stylesheet

The cheatsheet, the radial menu and the settings panel own hard parts an app shouldn't redo: recording a binding with
its modifiers and suffix, asking before taking another command's binding, writing only what differs from the defaults, a
radial menu's directions, focus going in and coming back, the overlay rule while open. How they look is the app's: they
are light DOM with their state in `aria-*` and `data-*` attributes, so the app's own CSS styles them with no specificity
or shadow boundary to fight, and a piece the app wants otherwise is replaced by copying a few lines of wiring.
