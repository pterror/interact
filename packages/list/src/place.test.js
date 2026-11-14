import { describe, expect, test } from 'bun:test'

import { place } from './place.js'
import { rows } from './rows.js'

describe('place', () => {
  test("counted from the bottom, places an element's bottom where the layout counts its rank from", () => {
    const ranks = new Map([
      ['a', 0],
      ['b', 2],
    ])
    const facet = place({
      edge: 'bottom',
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
