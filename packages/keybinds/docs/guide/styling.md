# Styling

Components use Shadow DOM with `::part()` selectors and BEM class names for styling flexibility.

## Quick Start

Import the optional stylesheet, which styles keybinds' own components (cheatsheet, settings, radial menu):

```js
import '@pterror/interact-keybinds/styles/palette.css'
```

Its colors follow the page's `color-scheme`: with `:root { color-scheme: light dark }` it's light or dark along with the
system.

## Theme Variables

Every color and font in the stylesheet comes from a custom property. Set them on `:root` (or on one component) to match
your page:

```css
:root {
  --keybinds-bg: #fffaf3;
  --keybinds-fg: #2b2118;
  --keybinds-accent: #b4532a;
  --keybinds-font: 'Inter', sans-serif;
}
```

| Variable                             | Used for           | Default          |
| ------------------------------------ | ------------------ | ---------------- |
| `--keybinds-bg`                      | Dialog background  | `Canvas`         |
| `--keybinds-fg`                      | Text               | `CanvasText`     |
| `--keybinds-muted`                   | Secondary text     | 60% of fg        |
| `--keybinds-border`                  | Borders, dividers  | 16% of fg        |
| `--keybinds-surface`                 | Key caps, buttons  | 7% of fg over bg |
| `--keybinds-accent`                  | Matches, recording | `Highlight`      |
| `--keybinds-accent-soft`             | Active row         | 18% of accent    |
| `--keybinds-warn`                    | Binding conflicts  | `#c2410c`        |
| `--keybinds-backdrop`                | Behind dialogs     | black at 45%     |
| `--keybinds-shadow`                  | Dialog shadow      |                  |
| `--keybinds-radius`                  | Dialog corners     | `10px`           |
| `--keybinds-font`, `--keybinds-mono` | Text, key caps     | system fonts     |

## Selecting Components

Each component marks itself with `data-keybinds="<kind>"` when it's added to the page: `cheatsheet`, `settings` or
`radial-menu`. Select by that rather than by tag name, so styles still apply if the component is registered under
another name.

## Custom Styles with ::part()

Target shadow DOM elements using CSS `::part()`:

```css
[data-keybinds='settings']::part(dialog) {
  background: #fff;
  border-radius: 12px;
}

[data-keybinds='cheatsheet']::part(group-title) {
  font-size: 18px;
}

[data-keybinds='settings']::part(binding-recording) {
  background: #0066cc;
  color: white;
}
```

## Cheatsheet Parts

| Part            | Description                 |
| --------------- | --------------------------- |
| `cheatsheet`    | Root container              |
| `backdrop`      | Overlay behind dialog       |
| `dialog`        | Main dialog box             |
| `group`         | Category group container    |
| `group-title`   | Category heading            |
| `list`          | Commands list (`<ul>`)      |
| `item`          | Individual command (`<li>`) |
| `item-disabled` | Inactive command            |
| `item-label`    | Command label text          |
| `item-keys`     | Container for key badges    |
| `item-key`      | Individual key (`<kbd>`)    |

## Settings Parts

| Part                | Description                                                                    |
| ------------------- | ------------------------------------------------------------------------------ |
| `settings`          | Root container                                                                 |
| `backdrop`          | Overlay behind dialog                                                          |
| `dialog`            | Main dialog box                                                                |
| `header`            | Header container                                                               |
| `title`             | Title text                                                                     |
| `reset-all`         | Reset All button                                                               |
| `group`             | Category group container                                                       |
| `group-title`       | Category heading                                                               |
| `list`              | Commands list (`<ul>`)                                                         |
| `item`              | Individual command (`<li>`)                                                    |
| `item-label`        | Command label text                                                             |
| `item-bindings`     | Container for all bindings                                                     |
| `item-reset`        | Per-command reset button                                                       |
| `binding`           | Individual binding span                                                        |
| `binding-recording` | Binding in recording state                                                     |
| `binding-keys`      | Key display container                                                          |
| `binding-key`       | Individual key (`<kbd>`)                                                       |
| `binding-remove`    | Remove (×) button                                                              |
| `binding-release`   | Press/release switch on a binding (`binding-release-on` while it is a release) |
| `binding-invert`    | An axis source's Invert switch (`binding-invert-on` when inverted)             |
| `item-add`          | Add binding container                                                          |
| `add-key`           | Add Key button                                                                 |
| `add-mouse`         | Add Mouse button                                                               |
| `add-gamepad`       | Add Gamepad button (shown while a gamepad is connected)                        |
| `add-axis`          | Add a source to an axis                                                        |
| `recording-overlay` | Recording prompt text                                                          |
| `recording-release` | Release toggle in the recording prompt (`recording-release-on` while on)       |
| `conflict`          | Conflict warning message                                                       |
| `conflict-accept`   | Replace button                                                                 |
| `conflict-cancel`   | Cancel button                                                                  |

## BEM Classes

Inside shadow DOM, elements have BEM class names matching their parts:

```
.cheatsheet
.cheatsheet__backdrop
.cheatsheet__dialog
.cheatsheet__group
.cheatsheet__item
.cheatsheet__item--disabled
...
```

These are useful if you're styling via JavaScript or inspecting elements.

## Example: Light Theme

```css
[data-keybinds='settings']::part(backdrop) {
  background: rgba(0, 0, 0, 0.3);
}

[data-keybinds='settings']::part(dialog) {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

[data-keybinds='settings']::part(binding-key) {
  background: #f5f5f5;
  border-color: #ddd;
  color: #666;
}
```

## Example: Glassmorphic

```css
[data-keybinds='cheatsheet']::part(dialog) {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
```

## Positioning

Override default positioning:

```css
/* Bottom sheet on mobile */
@media (max-width: 600px) {
  [data-keybinds='settings']::part(dialog) {
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    transform: none;
    width: 100%;
    max-width: none;
    border-radius: 12px 12px 0 0;
  }
}
```
