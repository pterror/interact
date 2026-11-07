/**
 * @import { ComboboxExtensions } from './combobox.js'
 */

import { defaultRendering } from '@interact/dom'

import { followPointer } from './follow-pointer.js'
import { navigation } from './navigation.js'
import { typeahead } from './typeahead.js'
import { windowing } from './windowing.js'

const DEFAULT_ROWS = 10

/**
 * What a combobox is made of besides its core: keyboard navigation of its options, typeahead in a select-only one, the
 * active option following the pointer, windowing that shows as many rows as there are options up to `rows`, and the
 * default rendering. An app making a combobox of other parts gives its own.
 * @template T
 * @param {Readonly<{ rows?: number | undefined, now?: (() => number) | undefined }>} [options] - How many options show
 *   at once at most (10), and the clock typing is timed by, in milliseconds
 * @returns {ComboboxExtensions<T>} The extensions
 */
function comboboxExtensions(options = {}) {
  const rows = options.rows ?? DEFAULT_ROWS
  return (combobox) => [
    navigation(combobox.current),
    combobox.kind.editable ? [] : typeahead(combobox.current, { now: options.now }),
    followPointer(combobox.current),
    windowing(combobox.list, { rows, shrink: true }),
    defaultRendering(combobox.list),
  ]
}

export { comboboxExtensions }
