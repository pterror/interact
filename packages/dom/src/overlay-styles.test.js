import { describe, expect, test } from 'bun:test'

import { PLACED } from './anchored.js'
import { overlayStyles } from './overlay-styles.js'

describe('overlayStyles', () => {
  test('reads the attribute and custom properties positioning writes, and nothing else of its own', () => {
    const written = [PLACED.anchored, PLACED.x, PLACED.y, PLACED.width, PLACED.height]
    expect(written.filter((name) => !overlayStyles.text.includes(name))).toEqual([])
    expect(overlayStyles.text.match(/--interact-overlay-[\w-]+/gu)?.toSorted()).toEqual(
      [PLACED.height, PLACED.width, PLACED.x, PLACED.y].toSorted(),
    )
  })
})
