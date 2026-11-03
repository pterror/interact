/**
 * @import { Span } from '@interact/core/memory-source'
 * @import { Menu } from './menu.js'
 */

import { describe, expect, test } from 'bun:test'

import { menuKey } from './menu-keys.js'
import { editMenu, manualWait, submenuOf } from './test-menus.js'

const PLAIN = { shift: false, toggle: false }
/** @type {Readonly<{ direction: 'ltr' | 'rtl', modifiers: typeof PLAIN }>} */
const LTR = { direction: 'ltr', modifiers: PLAIN }
const CUT = 0
const COPY = 1
const PASTE = 2
const WRAP = 4
const SHARE = 5
const SMALL = 7
const LARGE = 8
const NONE = 0
const ROWS = 9

/**
 * Presses keys in a menu in turn.
 * @param {Menu<Span>} menu - The menu
 * @param {readonly string[]} keys - The keys
 * @returns {boolean[]} Whether each meant something
 */
function press(menu, keys) {
  return keys.map((key) => menuKey(menu, key, LTR))
}

/**
 * The edit menu, open, with what was chosen in it.
 * @returns {Readonly<{ menu: Menu<Span>, chosen: string[], clock: ReturnType<typeof manualWait> }>} The menu, the ids
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

describe('a menu', () => {
  test('opens with focus on its first item or its last, showing as many rows as it has entries', () => {
    const { menu } = opened()
    const first = menu.list.active.get()
    menu.close()
    menu.open('last')
    expect([first, menu.list.active.get(), menu.list.scroll.rows.get(), menu.layer.open.get()]).toEqual([
      CUT,
      LARGE,
      ROWS,
      true,
    ])
  })

  test('moves past separators with the arrows, and wraps nowhere', () => {
    const { menu } = opened()
    press(menu, ['ArrowDown', 'ArrowDown', 'ArrowDown'])
    const pastLine = menu.list.active.get()
    press(menu, ['ArrowUp', 'Home', 'ArrowUp'])
    expect([pastLine, menu.list.active.get()]).toEqual([WRAP, CUT])
  })

  test('runs a command with Enter, reporting it and closing', () => {
    const { chosen, menu } = opened()
    press(menu, ['ArrowDown', 'Enter'])
    expect([chosen, menu.layer.open.get(), menu.list.active.get()]).toEqual([['copy'], false, undefined])
  })

  test('leaves a disabled item focusable and does nothing with it', () => {
    const { chosen, menu } = opened()
    press(menu, ['ArrowDown', 'ArrowDown', 'Enter'])
    expect([menu.list.active.get(), chosen, menu.layer.open.get()]).toEqual([PASTE, [], true])
  })
})

describe('a menu item', () => {
  test('reports a checkbox or radio item with Space and stays open; Enter closes it', () => {
    const { chosen, menu } = opened()
    menu.list.goTo(WRAP)
    press(menu, [' '])
    menu.list.goTo(LARGE)
    press(menu, [' '])
    const open = menu.layer.open.get()
    press(menu, ['Enter'])
    expect([chosen, open, menu.layer.open.get()]).toEqual([['wrap', 'large', 'large'], true, false])
  })

  test('takes a space as part of what is typed while typing goes on', () => {
    const { chosen, menu } = opened()
    menu.list.goTo(SMALL)
    press(menu, ['c', ' '])
    expect(chosen).toEqual([])
  })
})

describe('a submenu', () => {
  test('opens from the arrow toward the inline end with focus on its first item, and closes with the one back', () => {
    const { menu } = opened()
    menu.list.goTo(SHARE)
    press(menu, ['ArrowRight'])
    const submenu = submenuOf(menu)
    const inside = [submenu.list.active.get(), submenu.takeFocus(), menu.takeFocus()]
    press(submenu, ['ArrowLeft'])
    expect([...inside, menu.submenu, menu.takeFocus(), menu.layer.open.get()]).toEqual([
      NONE,
      true,
      false,
      undefined,
      true,
      true,
    ])
  })

  test('reports what is chosen in it to the menu it opened from, and closes them both', () => {
    const { chosen, menu } = opened()
    menu.list.goTo(SHARE)
    press(menu, ['Enter'])
    const submenu = submenuOf(menu)
    press(submenu, ['ArrowDown', 'Enter'])
    expect([chosen, menu.layer.open.get(), submenu.layer.open.get()]).toEqual([['link'], false, false])
  })

  test('closes when the menu it opened from does', () => {
    const { menu } = opened()
    menu.openSubmenu(SHARE, true)
    const submenu = menu.submenu?.menu
    menu.close()
    expect([submenu?.layer.open.get(), menu.submenu]).toEqual([false, undefined])
  })
})

describe('a submenu and the pointer', () => {
  test('opens once the pointer has rested on its entry, without taking focus', () => {
    const { clock, menu } = opened()
    menu.pointTo(SHARE, { x: 10, y: 10 })
    const before = menu.submenu
    clock.run()
    expect([
      before,
      menu.submenu?.position,
      menu.submenu?.menu.list.active.get(),
      menu.submenu?.menu.takeFocus(),
    ]).toEqual([undefined, SHARE, undefined, false])
  })

  test('stays open while the pointer crosses entries on its way there, and closes once it strays', () => {
    const { clock, menu } = opened()
    menu.pointTo(SHARE, { x: 10, y: 10 })
    clock.run()
    menu.headFor([
      { x: 5, y: 10 },
      { x: 100, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 100 },
      { x: 100, y: 100 },
    ])
    const crossed = menu.pointTo(SMALL, { x: 50, y: 20 })
    const open = menu.submenu?.position
    const strayed = menu.pointTo(SMALL, { x: 50, y: 90 })
    expect([crossed, open, menu.list.active.get(), strayed, menu.submenu, clock.waiting()]).toEqual([
      false,
      SHARE,
      SMALL,
      true,
      undefined,
      NONE,
    ])
  })

  test('opening another entry instead stops the first opening', () => {
    const { clock, menu } = opened()
    menu.pointTo(SHARE, { x: 10, y: 10 })
    menu.pointTo(COPY, { x: 10, y: 0 })
    expect([clock.waiting(), menu.list.active.get(), menu.submenu]).toEqual([NONE, COPY, undefined])
  })
})
