# TODO

- [x] Publish to npm as `@pterror/interact-keybinds`
- [x] Scroll (wheel) shortcuts: a press per notch or per 50 px of trackpad deltas, the page held still during a bound
      gesture, which 200 ms idle ends; both numbers are options.
- [x] Shifted punctuation: any single character can be bound as itself (`symbols()`) and fires however it is typed (`?`
      on Shift+/); `shift+<symbol>` and `shift+<digit>` mean the physical key (`shift+slash`, `shift+digit1`), and
      recording a shifted symbol writes the character.
- [x] Physical key names show as the character they type on the person's layout (`layout()`, followed as it changes).
- [x] Overrides kept in any storage (`bindingStore({ load, save, subscribe? })`), localStorage among them.
- [x] `anyModifiers`: a binding that matches whatever other modifiers are held, its own still required.
- [x] Held keys released when the window loses focus; held mouse buttons checked against the next mouse event.
- [x] Gamepad buttons as presses, read each frame only while a pad is connected and something watches.
- [x] Axes from mouse movement, sticks, triggers and key pairs, with `-` to invert.
- [x] Sequences (`g i`), holds and taps (`k:hold`, `k:tap`), recordable in the settings panel.
- [x] The rebuild: the package is small modules wired by hand (the engine as Sinks over Finds, each input, each piece of
      key syntax, each axis, each format and recorder its own module), with `keybinds()` as one ready-made wiring and
      the cheatsheet, radial menu and settings panel as unstyled compositions over `@pterror/interact-list`. No context
      bag, no command shape beyond the fields a module reads, no custom elements, no stylesheet.
- [x] The settings panel shows a Release switch only on a binding that is a release (it turns it back into a press);
      recording a release is a switch in the prompt, offered while releases are on.
- [x] The cheatsheet lists axes.
- [x] Space bound with `when: not typing` no longer hides the key from a `printed` binding: a table gives every lookup's
      handlers, best first.

## Open

- [ ] A centred popover (the radial menu, the cheatsheet) isn't kept inside the viewport.
- [ ] The browser's default popover styles (border, background) apply until the app styles them. The radial menu sets
      its box's padding to 0 inline, as its slots are placed inside it.
- [ ] The cheatsheet takes focus while open, so a shortcut pressed while it is open goes to it, not the page.
- [ ] Escape doesn't cancel the settings panel's conflict question.
- [ ] Rebuilding a settings row moves focus off the button that was clicked.
- [ ] Should gamepad presses be blocked by any open overlay, or (as now) only while focus is inside one?
- [ ] Is a click in a text field typing?
- [ ] `axis()` given a binding it wasn't given throws; should it read zero?
- [ ] The binding field `typing` sits beside typeahead's `typing` state, which means something else.
- [ ] `isMac` is read once, at load.
- [ ] `keybinds()` returns stopping (and `axis`) but not `held(id)`.
