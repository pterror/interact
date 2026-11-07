// Legacy: tests of a module the menu, palette and combobox still run on until they are rebuilt (docs/design.md).
import { describe, expect, test } from 'bun:test'

import { landing } from './legacy-landing.js'

const SEPARATOR = '-'
const NONE = 0
const ONE = 1
const TWO = 2
const THREE = 3
const FORWARD = 1
const BACK = -1

/**
 * A list of labels, some read and some not, where focus passes over separators.
 * @param {readonly (string | undefined)[]} labels - Each item's label, or undefined if it isn't read yet
 * @returns {Readonly<{ items: Readonly<{ count: number, item: (position: number) => string | undefined }>, skip: (item: string) => boolean }>}
 *   The list
 */
function list(labels) {
  return {
    items: { count: labels.length, item: (position) => labels[position] },
    skip: (item) => item === SEPARATOR,
  }
}

describe('landing', () => {
  test('steps over separators in the direction of the move', () => {
    const labels = list(['Cut', SEPARATOR, 'Paste', SEPARATOR])
    expect(landing(labels, ONE, FORWARD)).toBe(TWO)
    expect(landing(labels, ONE, BACK)).toBe(NONE)
  })

  test('turns back at an end that is a separator', () => {
    expect(landing(list([SEPARATOR, 'Cut', 'Paste', SEPARATOR]), THREE, FORWARD)).toBe(TWO)
    expect(landing(list([SEPARATOR, 'Cut']), NONE, BACK)).toBe(ONE)
  })

  test('may land on an item not read yet, and nowhere when every item is skipped', () => {
    expect(landing(list([SEPARATOR, undefined, 'Cut']), NONE, FORWARD)).toBe(ONE)
    expect(landing(list([SEPARATOR, SEPARATOR]), NONE, FORWARD)).toBeUndefined()
    expect(landing(list([]), NONE, FORWARD)).toBeUndefined()
  })
})
