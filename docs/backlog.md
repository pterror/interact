# Backlog

- Review the rebuilt keybinds (`32b0e22`) with a fresh reader who hasn't seen its build report. It came out at 5,866
  source lines against an estimate of about 2,800, and no one has read all of it. The review checks each module against
  design.md's rules and lists what is dead, duplicated or larger than it needs to be. It comes back to the owner before
  any change. The largest pieces: `keybinds()` (399 lines), the settings panel (about 680 across its parts), the
  rebinding modules (about 870).
- Keybinds decisions for the owner, after that review (also in `packages/keybinds/TODO.md`):
  - Default values: radial menu radius 100px, slot size 64px, cheatsheet hold delay 1s, recording pause 1s.
  - How the Release switch works, and the settings panel's wording.
  - The open cheatsheet takes focus, so a shortcut pressed then goes to it, not the page.
  - A centred popover isn't kept inside the window.
- `mark` writes its off value to every key, so a plain menu item would carry `aria-expanded="false"`. The menu page sets
  that attribute with a facet of its own. Open: whether `mark` should take the keys it applies to.
- Bridges for React, Vue, Svelte and Angular, one at a time, React first. Check whether React's bridge works for Preact
  through `preact/compat` before writing a Preact one.
- Release when the SillyTavern worldbuilding page first needs interact: `nix develop -c bun run release`, then
  `git push --follow-tags`.
