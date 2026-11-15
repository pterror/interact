# Ready-made UI

`cheatsheet()`, `radialMenu()`, `palette()`, `contextMenu()` and `settings()` each build into an element the app gives
them. They are unstyled: light DOM, no shadow root, no stylesheet; state shows only as `aria-*` and `data-*` attributes,
and the only inline style is geometry that is behaviour (a popover's place, a radial slot's place). The app styles them
with its own CSS. Until it does, the cheatsheet and the radial menu, which are popovers, have the browser's default
popover styles.

## People's bindings

A schema names each command once, with its default bindings and how it is shown; a person's overrides are laid over it.

```js
import { bindingStore, bound, keybinds, localStorageBindings } from '@pterror/interact-keybinds'

const schema = {
  save: { category: 'File', keys: ['$mod+s'], label: 'Save' },
  look: { axes: ['mouse:x'], label: 'Look' },
}
const overrides = bindingStore(localStorageBindings('app:keys'))
const run = { save: () => save() }

let stop = () => undefined
const listen = () => {
  stop()
  const bindings = bound(schema, overrides.get())
  stop = keybinds([{ ...bindings.save, run: run.save }])
}
listen()
overrides.watch(listen)
```

`bindingStore(storage)` keeps the overrides in any `{ load, save, subscribe? }`; `localStorageBindings(key)` is one in
localStorage that hears other tabs. `bound(schema, overrides)` is each id's bindings in effect.

## cheatsheet()

```js
const sheet = cheatsheet({ element, overrides, schema })
```

Every bound id not `hidden`, under a header per category (each group a `role=group` labelled by its header), its
bindings as `<kbd>`s, axes included. An id whose command doesn't apply now (`applies(id)` false) is `aria-disabled`. It
opens while `$mod` is held on its own for `delay` ms (default 1000), until let go, or after it is tapped twice, until
tapped twice again; `modifier` picks another. Escape or a press outside closes it. While open it is a manual popover
centred on the viewport, and has focus (given back as it closes), so by the overlay rule the page's bindings don't fire.
`sheet.open` is a cell: `sheet.open.set(true)` opens it from a button.

## radialMenu()

```js
const menu = radialMenu({
  element,
  items: () => [
    { label: 'Copy', run: copy },
    { label: 'Paste', run: paste },
  ],
})
keybinds([{ mouse: ['RightClick'], run: (event) => menu.openAt({ x: event.clientX, y: event.clientY }) }])
```

Up to eight items evenly round a point (the first at the top, then clockwise), `radius` px out (default 100), each slot
`size` px square (default 64). While open it is a manual popover (`role=menu`, items `role=menuitem`) centred on the
point, with focus, so the page's bindings don't fire. Arrows point at a slot (or the filled one nearest), Tab and
Shift+Tab go round, Enter and Space run the active item (`data-active`), the pointer resting on an item makes it active,
a click runs it, and Escape or a press outside closes it; focus goes back where it was. An item whose `when` is false is
`aria-disabled` and doesn't run.

## palette()

```js
const commands = [
  { id: 'save', keys: ['$mod+s'], label: 'Save', run: save },
  { id: 'close', label: 'Close tab', run: close, when: () => tabs.length > 1 },
]
const shown = palette({ commands: () => commands, element })
keybinds([...commands, { keys: ['$mod+k'], run: () => shown.open.set(true) }])
```

The commands whose `when` holds, each with its bindings as `<kbd>`s, filtered as the person types: a field
(`role=combobox`) and a `role=listbox`, in a `role=dialog`. Up and Down move the active command (`data-active`,
`aria-selected=true`), Enter or a click runs it after closing, so it runs where focus was. Escape or a press outside
closes it. While open it is a manual popover centred on the viewport, with focus in its field, so the page's bindings
don't fire. It reads no key to open: the app binds a command that opens it.

## contextMenu()

```js
const menu = contextMenu({ element })
keybinds(
  [
    {
      mouse: ['RightClick'],
      run: (event) =>
        menu.openAt({ getBoundingClientRect: () => new DOMRect(event.clientX, event.clientY, 0, 0) }, commands),
    },
  ],
  { target: message },
)
```

The commands it is opened with, below a point or an element: `role=menu`, items `role=menuitem` with their bindings as
`<kbd>`s. Up and Down move (wrapping), Home and End go to the ends, Enter, Space or a click runs the active command
after closing; a command whose `when` is false is `aria-disabled` and doesn't run. A `RightClick` binding that runs
keeps the browser's own menu from opening.

## settings()

```js
const stop = settings({ element, inputs: [rebindKeys(), rebindMouse()], overrides, schema })
```

A Reset all button (`data-keybinds=reset-all`), then a row per id not `hidden`, under a header per category: its label,
each binding as a button of `<kbd>`s (`data-keybinds=keys`, for every input) that records it again, a remove button, a
"+ Key" button per input (`data-keybinds=add`) that records a new one, and Reset (`data-keybinds=reset`). A row that
differs from its defaults is `data-changed`. Recording takes what is done next; Escape stops it. A binding another id
has asks first (`data-keybinds=conflict`, `role=alert`) whether to take it. With `releases`, `holds` or `sequences` on
(as `keybinds()` has them), the prompt offers switches to record `k:up`, `k:hold`, `k:tap` or several steps, which a
pause of `pause` ms (default 1000) or Done ends. A Release switch shows on a binding only when it is a release, and
turns it back into a press. Each edit is one write to the overrides, of the fields that differ. It is no overlay: show
it in your own dialog.

Every word comes from a `strings` option (`settings({ strings })`, and the inputs'), `defaultStrings` in English;
`{ resetAll: 'Tout réinitialiser' }` replaces one and leaves the rest. The cheatsheet, palette and menu take it too.

The inputs are `rebindKeys({ syntax, layout })`, `rebindMouse()`, `rebindPad({ pads })` (recordable while a pad is
connected) and `rebindAxes({ pads, syntax, layout })`.

## Replacing a piece

Each ready-made UI is a short module wiring exported pieces with `@pterror/interact-list`; its comment names them. To
change one piece, copy the composition and swap that piece. A cheatsheet whose rows show only the first binding:

```js
import {
  bound,
  bindingParts,
  categoryHeaders,
  cheatsheetKeys,
  cheatsheetTrigger,
  focusReturn,
} from '@pterror/interact-keybinds'
import { cell, dismiss, focusWhen, groupMount, popover, render } from '@pterror/interact-list'

const open = cell(false)
const bindings = { get: () => bound(schema, overrides.get()), watch: overrides.watch }
const keys = cheatsheetKeys({ bindings, open })
const headers = categoryHeaders({ categoryOf: keys.groupOf, drawn: keys, prefix: 'sheet' })
const firstOnly = {
  apply(key, row) {
    const entry = bindings.get()[key]
    if (entry !== undefined) row.textContent = `${entry.label}: ${bindingParts(entry)[0]?.join(' ') ?? ''}`
  },
  watch: bindings.watch,
}
render({
  create: (key) => headers.header(key) ?? document.createElement('div'),
  drawn: headers.drawn,
  facets: [firstOnly],
  mount: groupMount({ container: element, groupOf: headers.groupOf, labelIdOf: headers.labelIdOf }),
})
const viewport = { getBoundingClientRect: () => ({ bottom: innerHeight, left: 0, right: innerWidth, top: 0 }) }
element.tabIndex = -1
focusReturn({ element, open })
popover({ anchor: viewport, element, open, side: 'center' })
focusWhen({ element, when: open })
dismiss({ elements: [element], to: open.set })
cheatsheetTrigger({ open, to: open.set })
```

The settings panel's pieces are `settingsKeys`, `settingsRow`, `settingsChip`, `settingsPrompt`, `settingsQuestion`,
`rebind`, `conflictQuestion`, `recording` and `settingsRecorder`; the radial menu's are `radialPlace` (a Place) and
`radialStep` (a Step), with list's `render`, `place`, `move`, `pick` and `hoverIntent`.
