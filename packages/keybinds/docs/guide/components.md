# Components

keybinds has three web components of its own for discoverability and customization:

- **`KeybindCheatsheet`** - Glanceable reference (like ChatGPT's hold-Ctrl overlay)
- **`KeybindSettings`** - Rebindable keyboard shortcuts panel
- **`RadialMenu`** - Up to eight commands around a point

## Setup

Importing keybinds defines no element. Define each component you use under a name of your choosing; the examples here
use `keybinds-<kind>`:

```js
import { KeybindCheatsheet, KeybindSettings, RadialMenu } from '@pterror/interact-keybinds'

customElements.define('keybinds-cheatsheet', KeybindCheatsheet)
customElements.define('keybinds-settings', KeybindSettings)
customElements.define('keybinds-radial-menu', RadialMenu)
```

Then use in HTML:

```html
<keybinds-cheatsheet></keybinds-cheatsheet> <keybinds-settings></keybinds-settings>
```

The stylesheet selects them by the `data-keybinds` attribute they set on themselves, so any name works.

## Keybind Cheatsheet

Grouped display of available bindings.

```html
<keybinds-cheatsheet auto-trigger></keybinds-cheatsheet>
```

### Properties

| Property   | Type        | Description                                          |
| ---------- | ----------- | ---------------------------------------------------- |
| `commands` | `Command[]` | Array of command definitions                         |
| `context`  | `object`    | Context for `when` checks (inactive commands grayed) |
| `open`     | `boolean`   | Show/hide the cheatsheet                             |

### Attributes

| Attribute       | Description                                                                                                                       |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `open`          | When present, cheatsheet is visible                                                                                               |
| `auto-trigger`  | Open while a modifier is held on its own; tapping it twice keeps it open until it's tapped twice again, Escape or a click outside |
| `trigger-key`   | Which modifier: `$mod` (default; Meta on Mac, Control elsewhere), `Control`, `Alt`, `Shift` or `Meta`                             |
| `trigger-delay` | How long it's held before opening, in ms (default 1000)                                                                           |

### Events

| Event   | Description                        |
| ------- | ---------------------------------- |
| `close` | Fired when cheatsheet is dismissed |

### Usage

```js
const cheatsheet = document.querySelector('keybinds-cheatsheet')
cheatsheet.commands = commands
cheatsheet.context = getContext()

// Manual trigger
helpButton.onclick = () => (cheatsheet.open = true)
```

## Keybind Settings

Rebindable keyboard shortcuts panel with conflict detection.

```html
<keybinds-settings></keybinds-settings>
```

### Properties

| Property                         | Type            | Description                                                                                                       |
| -------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------- |
| `store`                          | `BindingsStore` | Reactive bindings store instance                                                                                  |
| `inputs`                         | `InputUI[]`     | Which bindings are shown and can be recorded (default: keys only)                                                 |
| `releases`, `holds`, `sequences` | `boolean`       | Offer recording release bindings (`k:up`), holds and taps (`k:hold`, `k:tap`), and steps (`g i`) (default: false) |
| `open`                           | `boolean`       | Show/hide the settings panel                                                                                      |

### Attributes

| Attribute | Description                             |
| --------- | --------------------------------------- |
| `open`    | When present, settings panel is visible |

### Events

| Event    | Detail                    | Description                                                              |
| -------- | ------------------------- | ------------------------------------------------------------------------ |
| `close`  | -                         | Fired when settings panel is dismissed                                   |
| `change` | `{ commandId, bindings }` | Fired when a binding is changed; `bindings` has a list per input's field |
| `reset`  | `{ commandId? }`          | Fired when bindings are reset                                            |

### Usage

```js
import { BindingsStore, KeybindSettings, defineSchema, keysUI, mouseUI } from '@pterror/interact-keybinds'

const schema = defineSchema({
  save: { label: 'Save', category: 'File', keys: ['$mod+s'] },
  open: { label: 'Open', category: 'File', keys: ['$mod+o'] },
})

const store = new BindingsStore(schema, 'myapp:keybinds')
customElements.define('keybinds-settings', KeybindSettings)

const settings = document.querySelector('keybinds-settings')
settings.inputs = [keysUI(), mouseUI()]
settings.store = store

// Open settings
settingsButton.onclick = () => (settings.open = true)

// Listen for changes
settings.addEventListener('change', (e) => {
  console.log('Changed:', e.detail.commandId)
})
```

### Behavior

- Groups commands by category
- Click a binding to re-record it
- Click "+ Key" or "+ Mouse" to add a new binding
- Conflicts are detected and shown inline with Replace/Cancel options
- Per-command and global reset buttons
- Escape cancels recording or closes the panel

## onModifierHold Utility

For custom hold-to-show behavior:

```js
import { onModifierHold } from '@pterror/interact-keybinds'

const cleanup = onModifierHold(
  'Control',
  (held) => {
    cheatsheet.open = held
  },
  { delay: 200 },
)

// Later: cleanup()
```

### Options

| Option   | Type          | Default  | Description                    |
| -------- | ------------- | -------- | ------------------------------ |
| `delay`  | `number`      | `200`    | Milliseconds before triggering |
| `target` | `EventTarget` | `window` | Element to listen on           |

### Multiple modifiers

```js
onModifierHold(['Control', 'Meta'], callback) // Either modifier
```

A hold only counts while the modifier is down by itself: another key, a click or scrolling ends it (a shortcut like
Ctrl+B never shows the cheatsheet, however long Ctrl stays down), and the key's auto-repeat doesn't start it again.

## onModifierTaps Utility

For double-tapping a modifier (pressing and releasing it by itself), as in double-tapping Shift:

```js
import { onModifierTaps } from '@pterror/interact-keybinds'

const cleanup = onModifierTaps(
  'Control',
  () => {
    cheatsheet.open = !cheatsheet.open
  },
  { count: 2, within: 400 },
)
```

`count` is how many taps in a row (default 2), and `within` the most milliseconds from one tap's press to the next tap's
release (default 400).

### Recording releases

While recording, the prompt has a **Release** toggle. With it on, the next key or button is recorded as a release
(`k:up`, `back:up`): press it, and the binding is stored when it comes up, with the modifiers held at press time. Each
binding also has a **Release** switch that flips it between its press and release form. Scroll bindings have no release.

## Your Own Dialogs

An open overlay takes the keyboard from bindings listening outside it: keys typed inside an open `<dialog>`, an open
popover (a palette, a menu, a combobox's list), or any element with `data-keybinds-modal` and `open`, found along the
event's path (inside shadow roots too), don't fire bindings listening around it, such as the page's. Bindings listening
on the overlay itself, or inside it, are its own keyboard handling and do fire, so a menu level binds its keys on its
own element:

```js
keybinds(menuCommands, undefined, { inputs: [keys()], target: menuElement })
```

A page's own overlay that is neither a dialog nor a popover can take the keyboard the same way:

```html
<div data-keybinds-modal open>...</div>
```
