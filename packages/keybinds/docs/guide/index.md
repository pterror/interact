# Getting started

```bash
npm install @pterror/interact-keybinds
```

## keybinds()

`keybinds(bindings, options)` is the ready-made composition: bindings as data, listened to until the function it returns
is called.

```js
import { keybinds } from '@pterror/interact-keybinds'

const stop = keybinds([
  { keys: ['$mod+s'], run: () => save() },
  { keys: ['Escape'], run: () => close(), when: () => isOpen() },
  { keys: ['w', 'ArrowUp'], mouse: ['MiddleClick'], pad: ['a'], run: () => jump() },
])
```

A command is what triggers it through each input (`keys`, `mouse`, `pad`) and what it does:

| Field          | Meaning                                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| `run(event)`   | Runs when a binding fires. Returning `false` leaves the event to the next handler; otherwise it is taken. |
| `when()`       | The command applies only while this is true.                                                              |
| `typing`       | Also runs while text is typed into a field (default: it doesn't).                                         |
| `anyModifiers` | Matches whatever other modifiers are held, its own still required (a game's `w` with Shift down).         |

The first command found for a press that applies and doesn't return `false` takes it: its default is prevented and it
goes no further. A binding the inputs can't read, or syntax that isn't on, throws as `keybinds()` starts, naming it.

## Binding syntax

- Keys: modifiers (`ctrl`, `alt`, `shift`, `meta`, `$mod`) and one key, joined by `+`: `$mod+k`, `shift+slash`,
  `Escape`, `ArrowUp`, `Space`. A letter or digit is itself in any layout; a physical key is named by its code (`slash`,
  `digit1`).
- Mouse: modifiers and a button or a scroll direction: `Click`, `RightClick`, `MiddleClick`, `BackClick`,
  `ForwardClick`, `ScrollUp`, `ScrollDown`, `ScrollLeft`, `ScrollRight`.
- Gamepad: one button of the standard layout, by position: `a` (the bottom face button), `rt`, `start`, or an alias
  (`south`, `r2`, `dpadUp`).

More syntax is opt-in, each piece its own module, passed as `syntax`:

| Piece       | Adds                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------- |
| `symbols()` | any typed character as itself: `?` fires however it is typed (Shift+/ on a US layout)             |
| `aliases()` | `up`, `down`, `left`, `right` for the arrows, `plus` for `+`                                      |
| `printed()` | the key `printed`: any key typing one character with no Ctrl, Alt or Meta, found after all others |

The suffixes and steps are options, so a page that doesn't use them can't write them by mistake:

| Option      | Syntax            | Runs                                                                            |
| ----------- | ----------------- | ------------------------------------------------------------------------------- |
| `releases`  | `k:up`            | as the press comes up                                                           |
| `holds`     | `k:hold`, `k:tap` | once held `delay` ms (default 500), or on a shorter press (`{ delay }`)         |
| `sequences` | `g i`             | after each step, within `timeout` ms (default 1000) of the last (`{ timeout }`) |

Other options: `target` (where to listen, default the window), `capture` (listen in the capture phase, before what is
under `target`), `wheel` (`{ step, idle }`: scrolling as a press per notch or per `step` px, default 50; a gesture ends
after `idle` ms, default 200), `pads` (a `pads()` to share; one is made only for gamepad bindings or axes).

## Overlays

An open `<dialog>`, an open popover, or an element with `data-keybinds-modal` and `open` keeps events inside it from
bindings listening outside it. Bindings listening on it or inside it hear them: a menu level binds its keys with
`target: level`. Gamepad buttons and axes have no event target, so they are judged by where focus is.

## Axes

An axis is `{ axes, when? }`, its sources summed: `mouse:x`, `mouse:y`, a stick or trigger (`pad:lx`, `pad:rt`), or a
pair of keys (`keys:a/d`, the first toward -1). A leading `-` inverts one. Read it when you need it:

```js
const look = { axes: ['mouse:x', 'pad:rx'] }
const kb = keybinds([look, { keys: ['e'], run: use }])
function frame() {
  const { position, delta } = kb.axis(look)
}
```

It reads zero while its `when` is false or an overlay holds focus.

## Going further

- [Modules](./modules): the engine and the inputs, wired by hand.
- [Ready-made UI](./ui): the cheatsheet, the radial menu, the settings panel, and people's rebindings.
