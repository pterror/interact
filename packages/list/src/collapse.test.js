import { describe, expect, test } from 'bun:test'

import { cell } from './cell.js'
import { collapse } from './collapse.js'
import { keySet } from './key-set.js'

describe('keySet', () => {
  test('holds keys and tells each one added or deleted', () => {
    /** @type {ReturnType<typeof keySet<string>>} */
    const keys = keySet()
    /** @type {(readonly string[] | undefined)[]} */
    const heard = []
    keys.watch((changed) => {
      heard.push(changed)
    })
    keys.add('a')
    keys.add('a')
    keys.delete('b')
    keys.delete('a')
    expect([keys.has('a'), heard]).toEqual([false, [['a'], ['a']]])
  })
})

/**
 * Regions over keys with "/" between levels
 * @returns {Readonly<{ active: ReturnType<typeof cell<string | undefined>>, closed: ReturnType<typeof keySet<string>>,
 *   regions: ReturnType<typeof collapse<string>> }>} Them
 */
function setup() {
  /** @type {typeof cell<string | undefined>} */
  const keyCell = cell
  const active = keyCell('a/b/c')
  /** @type {ReturnType<typeof keySet<string>>} */
  const closed = keySet()
  const regions = collapse({
    active,
    closed,
    inside: (key, region) => Promise.resolve(key.startsWith(`${region}/`)),
  })
  return { active, closed, regions }
}

describe('collapse', () => {
  test('moves the active key to the head of a region closed around it, then closes it', async () => {
    const { active, closed, regions } = setup()
    await regions.close('a/b')
    expect([active.get(), closed.has('a/b')]).toEqual(['a/b', true])
    regions.open('a/b')
    expect(closed.has('a/b')).toBe(false)
  })

  test('leaves the active key alone when it is outside the region closed', async () => {
    const { active, closed, regions } = setup()
    await regions.close('x')
    expect([active.get(), closed.has('x')]).toEqual(['a/b/c', true])
  })
})
