import { describe, expect, test } from 'bun:test'

import { placeFromBottom } from './place-from-bottom.js'
import { rows } from './rows.js'

describe('placeFromBottom', () => {
  test("places an element's bottom where the layout counts its rank from, leaving its top to its height", () => {
    const ranks = new Map([
      ['a', 0],
      ['b', 2],
    ])
    const facet = placeFromBottom({
      layout: rows(30),
      rank: { rank: (/** @type {string} */ key) => ranks.get(key), watchRanks: () => () => undefined },
    })
    const element = document.createElement('li')
    facet.apply('b', element)
    expect([element.style.position, element.style.bottom, element.style.top]).toEqual(['absolute', '60px', ''])
    expect([element.style.height, element.style.left, element.style.right]).toEqual(['30px', '0px', '0px'])
    const unranked = document.createElement('li')
    facet.apply('z', unranked)
    expect(unranked.getAttribute('style')).toBeNull()
  })
})
