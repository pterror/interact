/**
 * A binding as a settings panel shows it, a `data-keybinds=binding` span: a button of its display parts as `<kbd>`s,
 * which records it again; an Invert switch, for an axis (`data-keybinds=invert`); a Release switch, only for a
 * release (`data-keybinds=release`, on), which turns it back into a press **(P)**; and a button that removes it
 * (`data-keybinds=remove`). A switch is `aria-pressed`; what it switches to is offered, as a recorded binding is.
 */

import { flipRelease } from './flip-release.js'
import { splitBinding } from './split-binding.js'

/** @typedef {'axes' | 'keys' | 'mouse' | 'pad'} Field */

/** @typedef {Readonly<{ id: string, field: Field, index?: number | undefined }>} Slot */

/**
 * @typedef {Readonly<{
 *   parts: (slot: Slot, binding: string) => readonly string[],
 *   record: (slot: Slot) => void,
 *   remove: (slot: Slot) => void,
 *   offer: (slot: Slot, binding: string) => void,
 * }>} SettingsChipOptions
 */

/**
 * A button
 * @param {string} name - Its `data-keybinds`
 * @param {string} text - Its text
 * @param {() => void} click - What it does
 * @returns {HTMLButtonElement} The button
 */
function button(name, text, click) {
  const made = document.createElement('button')
  made.type = 'button'
  made.dataset['keybinds'] = name
  made.textContent = text
  made.addEventListener('click', click)
  return made
}

/**
 * Makes chips
 * @param {SettingsChipOptions} options - A binding's display parts; recording a slot again; removing its binding;
 *   and offering a binding for it
 * @returns {(slot: Slot, binding: string) => HTMLElement} A binding's chip
 */
function settingsChip({ offer, parts, record, remove }) {
  return (slot, binding) => {
    const keys = button('keys', '', () => {
      record(slot)
    })
    keys.append(
      ...parts(slot, binding).map((part) => {
        const kbd = document.createElement('kbd')
        kbd.textContent = part
        return kbd
      }),
    )
    const trimmed = binding.trim()
    /** @type {HTMLButtonElement[]} */
    const switches = []
    if (slot.field === 'axes') {
      const inverted = trimmed.startsWith('-')
      const invert = button('invert', 'Invert', () => {
        offer(slot, inverted ? trimmed.slice('-'.length) : `-${trimmed}`)
      })
      invert.setAttribute('aria-pressed', String(inverted))
      switches.push(invert)
    }
    if (splitBinding(binding).suffix === ':up') {
      const release = button('release', 'Release', () => {
        offer(slot, flipRelease(binding))
      })
      release.setAttribute('aria-pressed', 'true')
      switches.push(release)
    }
    const removing = button('remove', '×', () => {
      remove(slot)
    })
    removing.setAttribute('aria-label', 'Remove')
    const chip = document.createElement('span')
    chip.dataset['keybinds'] = 'binding'
    chip.append(keys, ...switches, removing)
    return chip
  }
}

export { settingsChip }
