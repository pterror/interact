# Components

keybinds has three web components of its own for discoverability and customization:

- **`<keybinds-cheatsheet>`** - Glanceable reference (like ChatGPT's hold-Ctrl overlay)
- **`<keybinds-settings>`** - Rebindable keyboard shortcuts panel
- **`<keybinds-radial-menu>`** - Up to eight commands around a point

A command palette, context menus and command buttons are the app's own, kept in step with keybinds through the hub as a
command system: see [A Command System](#a-command-system).

## Setup

```js
import { registerComponents } from '@pterror/interact-keybinds'

registerComponents() // Defines keybinds' own custom elements
```

Then use in HTML:

```html
<keybinds-cheatsheet></keybinds-cheatsheet> <keybinds-settings></keybinds-settings>
```

## A Command System

`hub.commandSystem()` is a `CommandHub` as a command system: an app's own palette, menus and buttons list, search and
run the hub's commands through it, and follow its context as it changes. keybinds draws none of them.

```js
import { CommandHub, defaultScorer, keysUI } from '@pterror/interact-keybinds'

const hub = new CommandHub({ context: () => ({ selection: editor.hasSelection() }), inputs: [keysUI()] })
hub.setSource('editor', () => editorCommands)
hub.refresh()

const system = hub.commandSystem({ scorer: defaultScorer(history) })

// A palette: every command (no tag), searched and ranked by keybinds
const found = await system.search(query, undefined) // [{ id, label, enabled, shortcut?, positions? }, ...]
system.run(found[0].id)

// A context menu over the editor: the commands tagged 'editor'
const showMenu = () => drawMenu(system.list('editor'))

// A button, disabled while its command doesn't apply
const showSave = () => {
  saveButton.disabled = !system.list(undefined).find((command) => command.id === 'save')?.enabled
}
const stop = system.subscribe(() => {
  showSave()
  showMenu()
})
```

The hub tells its subscribers whenever its context syncs (`hub.syncContext()`, which `refresh()` also does), so the
palette, menus and buttons follow it live.

### What the command system does

| Call                  | Does                                                                            |
| --------------------- | ------------------------------------------------------------------------------- |
| `list(tag)`           | The commands tagged `tag` (every command for `undefined`), hidden ones left out |
| `search(query, tag)`  | The commands matching what was typed, best first, with where each label matched |
| `run(id)`             | Runs a command if it applies now                                                |
| `subscribe(listener)` | Hears whenever which commands apply may have changed                            |

Each command is listed with whether it applies now and its first binding through any of the hub's inputs, as people read
it ("Ctrl+S").

### Options

`hub.commandSystem(options)`:

| Option        | Type                                         | Description                                                                                                                                                                                                                       |
| ------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `matcher`     | `Matcher`                                    | How labels and ids match what was typed (default `fuzzyMatcher`)                                                                                                                                                                  |
| `scorer`      | `Scorer`                                     | Ranks a menu's commands, and is added to each search result's score. `defaultScorer(history)` ranks by specificity and by what ran recently; with a scorer, a command whose `when` fails scores nothing and is left out of a menu |
| `source`      | `(query) => Command[] \| Promise<Command[]>` | Further commands for a query, from elsewhere (a server), asked once typing pauses; a command found only there runs from its answer, and a source that fails adds none                                                             |
| `sourceDelay` | `number`                                     | Milliseconds typing must pause before `source` is asked (default 200)                                                                                                                                                             |

To hear a command run, wrap the system:

```js
const system = hub.commandSystem()
const logged = {
  ...system,
  run: (id) => {
    log(id)
    return system.run(id)
  },
}
```

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

| Property                         | Type            | Description                                                                                                                                           |
| -------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `store`                          | `BindingsStore` | Reactive bindings store instance                                                                                                                      |
| `inputs`                         | `InputUI[]`     | Which bindings are shown and can be recorded (default: keys only)                                                                                     |
| `releases`, `holds`, `sequences` | `boolean`       | Offer recording release bindings (`k:up`), holds and taps (`k:hold`, `k:tap`), and steps (`g i`); the hub sets them from its options (default: false) |
| `open`                           | `boolean`       | Show/hide the settings panel                                                                                                                          |

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
import { BindingsStore, defineSchema, registerComponents, keysUI, mouseUI } from '@pterror/interact-keybinds'

const schema = defineSchema({
  save: { label: 'Save', category: 'File', keys: ['$mod+s'] },
  open: { label: 'Open', category: 'File', keys: ['$mod+o'] },
})

const store = new BindingsStore(schema, 'myapp:keybinds')
registerComponents()

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

Bindings don't fire inside an open overlay: an open `<dialog>`, an open popover (the palette, a menu, a combobox's
list), or any element with `data-keybinds-modal` and `open`, found along the event's path, inside shadow roots too. A
page's own overlay that is neither a dialog nor a popover can take the keyboard the same way:

```html
<div data-keybinds-modal open>...</div>
```
