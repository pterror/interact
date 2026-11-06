# Components Reference

## registerComponents()

Register keybinds' own web components: the cheatsheet, the settings panel and the radial menu. Call once at startup. The
palette and context menus come from `@interact/components` (see
[Components](../guide/components.md#palette-context-menus-and-buttons)).

```ts
function registerComponents(): void
```

```js
import { registerComponents } from 'keybinds'
registerComponents()
```

---

## KeybindCheatsheet

Custom element: `<keybinds-cheatsheet>`

### Properties

| Property   | Type        | Description                                   |
| ---------- | ----------- | --------------------------------------------- |
| `commands` | `Command[]` | Commands to display                           |
| `inputs`   | `InputUI[]` | Which bindings are shown (default: keys only) |
| `context`  | `object`    | Context for `when` evaluation                 |
| `open`     | `boolean`   | Visibility state                              |

### Attributes

| Attribute       | Type    | Description                                                                                         |
| --------------- | ------- | --------------------------------------------------------------------------------------------------- |
| `open`          | boolean | When present, cheatsheet is visible                                                                 |
| `auto-trigger`  | boolean | Open while a modifier is held on its own                                                            |
| `trigger-key`   | string  | The modifier: `$mod` (default; Meta on Mac, Control elsewhere), `Control`, `Alt`, `Shift` or `Meta` |
| `trigger-delay` | number  | How long it's held before opening, in ms (default 1000)                                             |

### Events

| Event   | Description              |
| ------- | ------------------------ |
| `close` | Cheatsheet was dismissed |

### CSS Parts

| Part            | Element               |
| --------------- | --------------------- |
| `cheatsheet`    | Root div              |
| `backdrop`      | Overlay div           |
| `dialog`        | Main dialog container |
| `group`         | Category group div    |
| `group-title`   | Category heading      |
| `list`          | Commands ul           |
| `item`          | Command li            |
| `item-disabled` | Inactive command      |
| `item-label`    | Label span            |
| `item-keys`     | Keys container span   |
| `item-key`      | Individual kbd        |

---

## KeybindSettings

Custom element: `<keybinds-settings>`, from `keybinds/settings`

### Properties

| Property                         | Type            | Description                                                                                                                                           |
| -------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `store`                          | `BindingsStore` | Reactive bindings store instance                                                                                                                      |
| `inputs`                         | `InputUI[]`     | Which bindings are shown and can be recorded (default: keys only)                                                                                     |
| `releases`, `holds`, `sequences` | `boolean`       | Offer recording release bindings (`k:up`), holds and taps (`k:hold`, `k:tap`), and steps (`g i`); the hub sets them from its options (default: false) |
| `open`                           | `boolean`       | Visibility state                                                                                                                                      |

### Attributes

| Attribute | Type    | Description                             |
| --------- | ------- | --------------------------------------- |
| `open`    | boolean | When present, settings panel is visible |

### Events

| Event    | Detail                         | Description                              |
| -------- | ------------------------------ | ---------------------------------------- |
| `close`  | -                              | Settings panel was dismissed             |
| `change` | `{ commandId, keys?, mouse? }` | A binding was changed                    |
| `reset`  | `{ commandId? }`               | Bindings were reset (per-command or all) |

### CSS Parts

| Part                              | Element                                                                                                                 |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `settings`                        | Root `.settings` div                                                                                                    |
| `backdrop`                        | Overlay div                                                                                                             |
| `dialog`                          | Main dialog container                                                                                                   |
| `header`                          | Header container                                                                                                        |
| `title`                           | Title text                                                                                                              |
| `reset-all`                       | Reset All button                                                                                                        |
| `group`                           | Category group div                                                                                                      |
| `group-title`                     | Category heading                                                                                                        |
| `list`                            | Commands ul                                                                                                             |
| `item`                            | Command li                                                                                                              |
| `item-label`                      | Label span                                                                                                              |
| `item-bindings`                   | Bindings container span                                                                                                 |
| `item-reset`                      | Per-command reset button                                                                                                |
| `binding`                         | Individual binding span                                                                                                 |
| `binding-recording`               | Binding in recording state                                                                                              |
| `binding-keys`                    | Key display container                                                                                                   |
| `binding-key`                     | Individual kbd                                                                                                          |
| `binding-remove`                  | Remove (×) button                                                                                                       |
| `binding-release`                 | Press/release switch on a binding (`binding-release-on` while it is a release)                                          |
| `item-add`                        | Add binding container                                                                                                   |
| `add-<input>`                     | Add button for each of `inputs`: `add-key`, `add-mouse`, `add-gamepad` (shown while a gamepad is connected), `add-axis` |
| `binding-invert`                  | An axis source's Invert switch (`binding-invert-on` when inverted)                                                      |
| `recording-overlay`               | Recording prompt text                                                                                                   |
| `recording-release`               | Release toggle in the recording prompt (`recording-release-on` while on)                                                |
| `recording-hold`, `recording-tap` | Hold and Tap toggles, with `holds` (`-on` while on)                                                                     |
| `recording-sequence`              | Steps toggle, with `sequences`: keys are recorded one after another until Done or a pause of a second                   |
| `recording-done`                  | Ends recording steps                                                                                                    |
| `conflict`                        | Conflict warning                                                                                                        |
| `conflict-accept`                 | Replace button                                                                                                          |
| `conflict-cancel`                 | Cancel button                                                                                                           |

### Keyboard Navigation

| Key      | Action                           |
| -------- | -------------------------------- |
| `Escape` | Cancel recording, or close panel |

---

## eventToBindingString(event)

Convert a KeyboardEvent to a canonical binding string.

```ts
function eventToBindingString(event: KeyboardEvent, syntax?: readonly KeySyntax[]): string | undefined
```

Returns `undefined` for bare modifier presses and keys that can't be bound. Uses `$mod` for the platform modifier (Meta
on Mac, Ctrl elsewhere).

---

## eventToMouseBindingString(event)

Convert a MouseEvent to a canonical binding string.

```ts
function eventToMouseBindingString(event: MouseEvent): string | undefined
```

Maps button numbers to canonical names (0=click, 1=middle, 2=right, 3=back, 4=forward). Other buttons, and a wheel event
that doesn't scroll, give `undefined`.

---

## findConflict(bindings, { binding, input, except? })

Check if a binding string conflicts with any command in a schema, or in a list of entries such as `store.entries()`.
`except` is a command not to check, usually the one being rebound.

```ts
function findConflict(
  bindings: Schema | readonly { binding: BindingSchema; id: string }[],
  candidate: { binding: string; input: Input; except?: string },
): { commandId: string; label: string } | undefined
```

Normalizes through parse → lookup for accurate cross-format comparison.

---

## formatMouseParts(binding)

Format a mouse/scroll binding string into an array of display-ready parts.

```ts
function formatMouseParts(binding: string): string[]
```

```js
formatMouseParts('$mod+click') // ["⌘", "Click"] on Mac, ["Ctrl", "Click"] elsewhere
formatMouseParts('scrollup') // ["Scroll ↑"]
formatMouseParts('ctrl+scrolldown') // ["Ctrl", "Scroll ↓"] on Mac, ["Ctrl", "Scroll ↓"] elsewhere
```

---

## formatGamepadParts(binding)

Format a gamepad binding string into display-ready parts.

```ts
function formatGamepadParts(binding: string): string[]
```

```js
formatGamepadParts('rt') // ["RT"]
formatGamepadParts('south:up') // ["A", "Release"]
formatGamepadParts('up') // ["D-pad ↑"]
```

---

## formatAxisParts(binding)

```js
formatAxisParts('mouse:x') // ["Mouse ↔"]
formatAxisParts('-pad:ry') // ["Right stick ↕", "Inverted"]
formatAxisParts('keys:a/d') // ["A", "/", "D"]
```

---

## inMenu(command, menu)

Whether a command is in a menu, by its `menu` tag: with `menu` undefined, every command is.

```ts
function inMenu(command: Command, menu: string | undefined): boolean
```

```js
const items = commands.filter((command) => inMenu(command, 'editor'))
```

---

## onModifierHold(modifiers, callback, options?)

Utility for hold-to-show behavior.

```ts
function onModifierHold(
  modifiers: string | string[],
  callback: (held: boolean) => void,
  options?: { delay?: number; target?: EventTarget },
): () => void
```

**Parameters:**

| Parameter        | Type                      | Default  | Description                                                                                                              |
| ---------------- | ------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| `modifiers`      | `string \| string[]`      | -        | Modifier key(s): `'Control'`, `'Alt'`, `'Shift'`, `'Meta'`                                                               |
| `callback`       | `(held: boolean) => void` | -        | Called with `true` when held by itself for `delay`, `false` on release or when another key, a click or scrolling happens |
| `options.delay`  | `number`                  | `200`    | Hold duration in ms                                                                                                      |
| `options.target` | `EventTarget`             | `window` | Element to listen on                                                                                                     |

**Returns:** Cleanup function.

```js
const cleanup = onModifierHold('Control', (held) => {
  cheatsheet.open = held
})

// Multiple modifiers (either triggers)
onModifierHold(['Control', 'Meta'], callback)

// Custom delay
onModifierHold('Alt', callback, { delay: 300 })
```

---

## onModifierTaps(modifiers, callback, options?)

Calls back when a modifier is tapped (pressed and released by itself) `count` times in a row.

```ts
function onModifierTaps(
  modifiers: string | string[],
  callback: () => void,
  options?: { count?: number; within?: number; target?: EventTarget },
): () => void
```

| Parameter        | Type                 | Default  | Description                                                |
| ---------------- | -------------------- | -------- | ---------------------------------------------------------- |
| `modifiers`      | `string \| string[]` | -        | Modifier key(s): `'Control'`, `'Alt'`, `'Shift'`, `'Meta'` |
| `callback`       | `() => void`         | -        | Called on the last tap's release                           |
| `options.count`  | `number`             | `2`      | Taps in a row                                              |
| `options.within` | `number`             | `400`    | Most ms from one tap's press to the next tap's release     |
| `options.target` | `EventTarget`        | `window` | Element to listen on                                       |

**Returns:** Cleanup function.

```js
onModifierTaps('Shift', () => (cheatsheet.open = true))
```
