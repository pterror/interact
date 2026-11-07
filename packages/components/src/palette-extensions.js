/**
 * @import { PaletteExtensions } from './palette.js'
 */

import { defaultRendering } from '@interact/dom'

import { followPointer } from './follow-pointer.js'
import { navigation } from './navigation.js'
import { windowing } from './windowing.js'

const DEFAULT_ROWS = 10

/**
 * What a palette is made of besides its core: keyboard navigation of its results, the active command following the
 * pointer, windowing that always shows `rows` rows, so nothing moves as what is found changes, and the default
 * rendering. An app making a palette of other parts gives its own.
 * @template C
 * @param {Readonly<{ rows?: number | undefined }>} [options] - How many results show at once (10)
 * @returns {PaletteExtensions<C>} The extensions
 */
function paletteExtensions(options = {}) {
  const rows = options.rows ?? DEFAULT_ROWS
  return (palette) => [
    navigation(palette.current),
    followPointer(palette.current),
    windowing(palette.list, { rows }),
    defaultRendering(palette.list),
  ]
}

export { paletteExtensions }
