/**
 * @import { Point } from '@interact/core/intent'
 * @import { MenuExtensions } from './menu.js'
 * @import { SubmenuExtension } from './submenus.js'
 */

import { describe, expect, test } from 'bun:test'

import { keyInput } from '@interact/core'
import { contentOf, defaultRendering, renderToString } from '@interact/dom'

import { followPointer } from './follow-pointer.js'
import { Menu } from './menu.js'
import { navigation } from './navigation.js'
import { submenus } from './submenus.js'
import { editEntries, editMenu, entries, manualWait, submenuOf } from './test-menus.js'

const COPY = 1
const SHARE = 5
const SMALL = 7
const NONE = 0
const ONCE = 1

/**
 * Presses keys in a menu in turn.
 * @param {Menu} menu - The menu
 * @param {readonly string[]} keys - The keys
 * @returns {boolean[]} Whether each meant something
 */
function press(menu, keys) {
  return keys.map((key) => menu.handle(keyInput.of({ alt: false, key, shift: false, toggle: false })))
}

/**
 * Makes an entry active, as the keys would.
 * @param {Menu} menu - The menu
 * @param {number} position - The entry's position
 * @returns {void}
 */
function goTo(menu, position) {
  menu.dispatch({ effects: menu.core.current.go(position) })
}

/**
 * How many times a menu has asked for focus to come to its list.
 * @param {Menu} menu - The menu
 * @returns {number} How many
 */
function asked(menu) {
  return menu.state.field(menu.core.focusAsked)
}

/**
 * The pointer moving over an entry.
 * @param {Menu} menu - The menu
 * @param {number} position - The entry's position
 * @param {Point} pointer - Where the pointer is
 * @returns {void}
 */
function pointTo(menu, position, pointer) {
  menu.handle(menu.core.list.hover.of({ focused: true, position, ...pointer }))
}

/**
 * The edit menu, open, with what was chosen in it.
 * @returns {Readonly<{ menu: Menu, chosen: string[], clock: ReturnType<typeof manualWait> }>} The menu, the ids
 *   chosen, and its clock
 */
function opened() {
  const clock = manualWait()
  const menu = editMenu(clock.wait)
  /** @type {string[]} */
  const chosen = []
  menu.onSelect(({ entry }) => {
    chosen.push(entry.id)
  })
  menu.open()
  return { chosen, clock, menu }
}

/**
 * The edit menu, open, made with its submenus extension at hand, as the pointer drives it.
 * @returns {Readonly<{ menu: Menu, sub: SubmenuExtension, clock: ReturnType<typeof manualWait> }>} The menu, its
 *   submenus, and its clock
 */
function pointed() {
  const clock = manualWait()
  /** @type {SubmenuExtension[]} */
  const made = []
  /** @type {MenuExtensions} */
  const extensions = (core) => {
    const sub = submenus(core, { extensions, wait: clock.wait })
    made.push(sub)
    return [navigation(core.current), sub, followPointer(core.current), defaultRendering(core.list)]
  }
  const menu = new Menu({ extensions, id: 'edit', items: entries(editEntries()), label: 'Edit' })
  menu.open()
  const [sub] = made
  if (sub === undefined) {
    throw new Error('No submenus were made')
  }
  return { clock, menu, sub }
}

describe('a submenu', () => {
  test('opens from the arrow toward the inline end with focus on its first item, and closes with the one back', () => {
    const { menu } = opened()
    goTo(menu, SHARE)
    press(menu, ['ArrowRight'])
    const submenu = submenuOf(menu)
    const inside = [submenu.active, asked(submenu), asked(menu)]
    press(submenu, ['ArrowLeft'])
    expect([...inside, menu.submenu, asked(menu), menu.layer.open.get()]).toEqual([
      NONE,
      ONCE,
      NONE,
      undefined,
      ONCE,
      true,
    ])
  })

  test('reports what is chosen in it to the menu it opened from, and closes them both', () => {
    const { chosen, menu } = opened()
    goTo(menu, SHARE)
    press(menu, ['Enter'])
    const submenu = submenuOf(menu)
    press(submenu, ['ArrowDown', 'Enter'])
    expect([chosen, menu.layer.open.get(), submenu.layer.open.get()]).toEqual([['link'], false, false])
  })

  test('closes when the menu it opened from does', () => {
    const { menu } = opened()
    goTo(menu, SHARE)
    press(menu, ['Enter'])
    const submenu = menu.submenu?.menu
    menu.close()
    expect([submenu?.layer.open.get(), menu.submenu]).toEqual([false, undefined])
  })

  test('is named by its entry, and shown in an overlay after its menu’s list', () => {
    const { menu } = opened()
    goTo(menu, SHARE)
    press(menu, ['Enter'])
    const markup = renderToString(contentOf(menu))
    expect(markup).toContain('aria-labelledby="edit-5" id="edit-5-menu"')
    expect(markup).toContain('id="edit-5" role="menuitem" aria-expanded="true"')
  })
})

describe('a submenu and the pointer', () => {
  test('opens once the pointer has rested on its entry, without taking focus', () => {
    const { clock, menu } = pointed()
    pointTo(menu, SHARE, { x: 10, y: 10 })
    const before = menu.submenu
    clock.run()
    const open = menu.submenu?.menu
    expect([before, menu.submenu?.position, open?.active, open === undefined ? undefined : asked(open)]).toEqual([
      undefined,
      SHARE,
      undefined,
      NONE,
    ])
  })

  test('stays open while the pointer crosses entries on its way there, and closes once it strays', () => {
    const { clock, menu, sub } = pointed()
    pointTo(menu, SHARE, { x: 10, y: 10 })
    clock.run()
    menu.dispatch({
      effects: sub.headed.of([
        { x: 5, y: 10 },
        { x: 100, y: 0 },
        { x: 200, y: 0 },
        { x: 200, y: 100 },
        { x: 100, y: 100 },
      ]),
    })
    pointTo(menu, SMALL, { x: 50, y: 20 })
    const crossed = [menu.active, menu.submenu?.position]
    pointTo(menu, SMALL, { x: 50, y: 90 })
    expect([crossed, menu.active, menu.submenu, clock.waiting()]).toEqual([[SHARE, SHARE], SMALL, undefined, NONE])
  })

  test('opening another entry instead stops the first opening', () => {
    const { clock, menu } = pointed()
    pointTo(menu, SHARE, { x: 10, y: 10 })
    pointTo(menu, COPY, { x: 10, y: 0 })
    expect([clock.waiting(), menu.active, menu.submenu]).toEqual([NONE, COPY, undefined])
  })
})
