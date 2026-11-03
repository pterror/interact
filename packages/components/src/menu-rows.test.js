/**
 * @import { Span } from '@interact/core/memory-source'
 * @import { MenuEntry } from './menu-entry.js'
 */

import { describe, expect, test } from 'bun:test'

import { renderToString } from '@interact/dom'

import { menuBody } from './menu-rows.js'
import { Menu } from './menu.js'
import { editMenu, entries } from './test-menus.js'

const LONG = 40

/**
 * A menu of more commands than it shows at once.
 * @returns {Menu<Span>} The menu
 */
function longMenu() {
  /** @type {MenuEntry<Span>[]} */
  const list = Array.from({ length: LONG }, (_unused, index) => ({
    id: `c${String(index)}`,
    kind: 'command',
    label: `Command ${String(index)}`,
  }))
  return new Menu({ id: 'long', items: entries(list), label: 'Long' })
}

/**
 * The size and place each rendered item says it has, as "posinset/setsize", or "-" for one that says neither.
 * @param {string} markup - The menu's markup
 * @returns {string[]} One per item
 */
function placesIn(markup) {
  const items = [...markup.matchAll(/<div[^>]*role="menuitem[^"]*"[^>]*>/gu)].map(([tag]) => tag)
  return items.map((tag) => {
    const size = /aria-setsize="(?<size>\d+)"/u.exec(tag)?.groups?.['size']
    const place = /aria-posinset="(?<place>\d+)"/u.exec(tag)?.groups?.['place']
    return size === undefined || place === undefined ? '-' : `${place}/${size}`
  })
}

const FIRST_TWO = ['1/40', '2/40']
const START = 0

describe("a menu's items", () => {
  test('say their place and the menu’s size when only some are rendered', () => {
    const markup = renderToString(menuBody(longMenu(), undefined))
    const places = placesIn(markup)
    expect(places.slice(START, FIRST_TWO.length)).toEqual(FIRST_TWO)
    expect(places.length).toBeLessThan(LONG)
  })

  test('leave counting to the browser when every one is rendered', () => {
    const markup = renderToString(menuBody(editMenu(), undefined))
    const places = placesIn(markup)
    expect(places).not.toEqual([])
    expect(places.filter((place) => place !== '-')).toEqual([])
  })
})
