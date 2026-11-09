import { afterEach, describe, expect, test } from 'bun:test'

import { bindingStore } from './binding-store.js'
import { pads } from './pads.js'
import { rebindAxes, rebindKeys, rebindMouse, rebindPad } from './rebind-inputs.js'
import { settings } from './settings.js'
import { kbd } from './test-keys.js'
import { fakePads } from './test-pads.js'

const MIDDLE = 1
const BACK = 3
const PAD_Y = 3
const SHORT_PAUSE = 10
const PAST_PAUSE = 30
const SCROLL_UP = -10

/** @type {(() => void)[]} */
const cleanups = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) {
    cleanup()
  }
})

/**
 * @typedef {Readonly<Record<string, Readonly<{ label: string, category?: string, hidden?: boolean,
 *   keys?: readonly string[], mouse?: readonly string[], pad?: readonly string[], axes?: readonly string[] }>>>}
 *   Schema
 */

/**
 * A settings panel in the page, over overrides kept nowhere, showing every input
 * @param {Schema} schema - The schema
 * @param {Readonly<{ holds?: boolean, releases?: boolean, sequences?: boolean, pause?: number }>} [syntax] - Which
 *   syntax is on, and the pause that takes steps
 * @returns {Readonly<{ element: HTMLElement, overrides: ReturnType<typeof bindingStore>,
 *   field: (id: string, field: 'axes' | 'keys' | 'mouse' | 'pad') => readonly string[] | undefined }>} The panel's
 *   element, the overrides, and an id's bindings in effect in a field
 */
function panel(schema, syntax = {}) {
  const element = document.createElement('div')
  document.body.append(element)
  const overrides = bindingStore({ load: () => ({}), save: () => undefined })
  const padsNow = pads()
  const inputs = [rebindKeys(), rebindMouse(), rebindPad({ pads: padsNow }), rebindAxes({ pads: padsNow })]
  const stop = settings({ element, inputs, overrides, schema, ...syntax })
  cleanups.push(stop, () => {
    element.remove()
  })
  return {
    element,
    field: (id, name) => overrides.get()[id]?.[name] ?? schema[id]?.[name],
    overrides,
  }
}

/**
 * The elements in a panel that name themselves so
 * @param {Element} element - The panel
 * @param {string} name - Their `data-keybinds`
 * @returns {HTMLElement[]} The elements, in order
 */
function named(element, name) {
  return [...element.querySelectorAll(`[data-keybinds="${name}"]`)].filter((found) => found instanceof HTMLElement)
}

/**
 * Clicks the first element in a panel named so, with some text
 * @param {Element} element - The panel
 * @param {string} name - Its `data-keybinds`
 * @param {string} [text] - Its text
 * @returns {void}
 * @throws {TypeError} If there's none
 */
function click(element, name, text) {
  const found = named(element, name).find((each) => text === undefined || each.textContent === text)
  if (found === undefined) {
    throw new TypeError(`no ${name} in the panel`)
  }
  found.click()
}

/**
 * A key going down or up in the window, as the recorders hear it
 * @param {string} type - keydown or keyup
 * @param {string} key - The key
 * @param {KeyboardEventInit} [init] - Modifiers
 * @returns {void}
 */
function keyInWindow(type, key, init = {}) {
  globalThis.dispatchEvent(kbd(type, { code: `Key${key.toUpperCase()}`, key, ...init }))
}

/**
 * A key pressed and let go in the window
 * @param {string} key - The key
 * @returns {void}
 */
function tapInWindow(key) {
  keyInWindow('keydown', key)
  keyInWindow('keyup', key)
}

/**
 * A mouse button going down or up in the window
 * @param {string} type - mousedown or mouseup
 * @param {number} button - The button
 * @returns {void}
 */
function mouseInWindow(type, button) {
  globalThis.dispatchEvent(new MouseEvent(type, { button, cancelable: true }))
}

/**
 * Each binding's parts, as its chip shows them
 * @param {Element} element - The panel
 * @returns {readonly (readonly string[])[]} The parts
 */
function chips(element) {
  return named(element, 'keys').map((chip) => Array.from(chip.querySelectorAll('kbd'), (part) => part.textContent))
}

const SCHEMA = {
  delete: { category: 'Edit', keys: ['backspace'], label: 'Delete' },
  hidden: { hidden: true, keys: ['h'], label: 'Hidden' },
  open: { category: 'File', keys: ['$mod+o'], label: 'Open' },
  save: { category: 'File', keys: ['$mod+s'], label: 'Save' },
}

describe('a settings panel', () => {
  test('groups the ids that are not hidden by category under headers, with their bindings', () => {
    const { element } = panel(SCHEMA)
    const groups = [...element.querySelectorAll('[role=group]')].map((group) => [
      group.querySelector(`#${group.getAttribute('aria-labelledby') ?? ''}`)?.textContent,
      ...[...group.children].slice(1).map((row) => row.firstElementChild?.textContent),
    ])
    expect(groups).toEqual([
      ['Edit', 'Delete'],
      ['File', 'Open', 'Save'],
    ])
    expect(chips(element)[0]).toEqual(['⌫'])
  })

  test('removes a binding, keeping as the override only the fields that differ from the defaults', () => {
    const { element, overrides } = panel(SCHEMA)
    click(element, 'remove')
    expect(overrides.get()).toEqual({ delete: { keys: [] } })
  })

  test('resets one id to its defaults, or all of them, marking the rows that differ', () => {
    const { element, field, overrides } = panel(SCHEMA)
    const changed = () =>
      [...element.querySelectorAll('[data-changed]')].map((row) => row.firstElementChild?.textContent)
    const resets = () => named(element, 'reset').map((reset) => reset.getAttribute('aria-disabled'))
    expect([changed(), resets()]).toEqual([[], ['true', 'true', 'true']])
    overrides.set({ delete: { keys: ['ctrl+shift+d'] }, open: { keys: ['ctrl+p'] } })
    expect([changed(), resets()]).toEqual([
      ['Delete', 'Open'],
      ['false', 'false', 'true'],
    ])
    expect(chips(element)[0]).toEqual(['Ctrl', 'Shift', 'D'])
    click(element, 'reset')
    expect([field('delete', 'keys'), field('open', 'keys')]).toEqual([['backspace'], ['ctrl+p']])
    click(element, 'reset-all')
    expect(overrides.get()).toEqual({})
  })

  test('shows sequences as steps, and holds as what they wait for', () => {
    const { element, overrides } = panel({ go: { keys: ['space'], label: 'Go', mouse: ['scrollup'] } }, { holds: true })
    overrides.set({ go: { keys: ['ctrl+k ctrl+s', 'k:hold'] } })
    expect(chips(element)).toEqual([['Ctrl', 'K', 'then', 'Ctrl', 'S'], ['K', 'Hold'], ['Scroll ↑']])
  })

  test('records a binding from the next key, in place of one clicked or added; Escape stops', () => {
    const { element, field } = panel(SCHEMA)
    click(element, 'keys')
    expect(named(element, 'prompt').map((prompt) => prompt.textContent)).toEqual(['Press a key...'])
    tapInWindow('d')
    click(element, 'add', '+ Key')
    keyInWindow('keydown', 'Escape')
    tapInWindow('x')
    expect([field('delete', 'keys'), named(element, 'prompt')]).toEqual([['d'], []])
  })

  test('asks before taking a binding another id has, and replaces it, or not', () => {
    const { element, field } = panel(SCHEMA)
    click(element, 'add', '+ Key')
    keyInWindow('keydown', 's', { ctrlKey: true })
    expect([field('delete', 'keys'), named(element, 'conflict').map((asked) => asked.textContent)]).toEqual([
      ['backspace'],
      ['Already bound to "Save". ReplaceCancel'],
    ])
    click(element, 'cancel')
    expect([field('delete', 'keys'), named(element, 'conflict')]).toEqual([['backspace'], []])
    click(element, 'add', '+ Key')
    keyInWindow('keydown', 's', { ctrlKey: true })
    click(element, 'replace')
    expect([field('delete', 'keys'), field('save', 'keys')]).toEqual([['backspace', '$mod+s'], []])
  })
})

const RELEASES = {
  hold: { category: 'A', keys: ['space'], label: 'Hold', mouse: ['middle', 'scrollup'] },
  other: { category: 'A', keys: ['o:up'], label: 'Other' },
}

describe('recording a release', () => {
  test('is a switch in the prompt, off at first, only while releases are on', () => {
    const off = panel(RELEASES)
    click(off.element, 'add', '+ Key')
    expect(named(off.element, 'record-release')).toEqual([])
    const { element } = panel(RELEASES, { releases: true })
    click(element, 'add', '+ Key')
    expect(named(element, 'record-release').map((each) => each.getAttribute('aria-pressed'))).toEqual(['false'])
    click(element, 'record-release')
    expect(named(element, 'record-release').map((each) => each.getAttribute('aria-pressed'))).toEqual(['true'])
  })

  test('takes the key when it comes up, with the modifiers held as it went down, not one that was already down', () => {
    const { element, field } = panel(RELEASES, { releases: true })
    click(element, 'add', '+ Key')
    click(element, 'record-release')
    keyInWindow('keyup', 'j')
    keyInWindow('keydown', 'k', { ctrlKey: true })
    expect(field('hold', 'keys')).toEqual(['space'])
    keyInWindow('keyup', 'k')
    expect(field('hold', 'keys')).toEqual(['space', '$mod+k:up'])
  })

  test('with the switch off, takes the press', () => {
    const { element, field } = panel(RELEASES, { releases: true })
    click(element, 'add', '+ Key')
    keyInWindow('keydown', 'k')
    expect(field('hold', 'keys')).toEqual(['space', 'k'])
  })

  test('of a mouse button, takes it when it comes up, but not scrolling or a press on the switch', () => {
    const { element, field } = panel(RELEASES, { releases: true })
    click(element, 'add', '+ Mouse')
    click(element, 'record-release')
    globalThis.dispatchEvent(new WheelEvent('wheel', { cancelable: true, deltaY: SCROLL_UP }))
    named(element, 'record-release')[0]?.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true, composed: true }),
    )
    expect(field('hold', 'mouse')).toEqual(['middle', 'scrollup'])
    mouseInWindow('mousedown', BACK)
    mouseInWindow('mouseup', BACK)
    expect(field('hold', 'mouse')).toEqual(['middle', 'scrollup', 'back:up'])
  })

  test('again, in place of a binding, can take its release', () => {
    const { element, field } = panel(RELEASES, { releases: true })
    click(element, 'keys')
    click(element, 'record-release')
    tapInWindow('j')
    expect(field('hold', 'keys')).toEqual(['j:up'])
  })
})

describe("a binding's Release switch", () => {
  test('is only on a release, which it turns back into a press', () => {
    const { element, field } = panel(RELEASES, { releases: true })
    const releases = () => named(element, 'release').map((each) => each.getAttribute('aria-pressed'))
    expect(releases()).toEqual(['true'])
    click(element, 'release')
    expect([field('other', 'keys'), releases()]).toEqual([['o'], []])
  })

  test('into a binding another id has asks first, then replaces it', () => {
    const { element, field, overrides } = panel(RELEASES, { releases: true })
    overrides.set({ hold: { keys: ['o'] } })
    click(element, 'release')
    expect(named(element, 'conflict')).toHaveLength(1)
    expect(field('other', 'keys')).toEqual(['o:up'])
    click(element, 'replace')
    expect([field('other', 'keys'), field('hold', 'keys')]).toEqual([['o'], []])
  })

  test('into a binding another id has, cancelled, leaves it', () => {
    const { element, field, overrides } = panel(RELEASES, { releases: true })
    overrides.set({ hold: { keys: ['o'] } })
    click(element, 'release')
    click(element, 'cancel')
    expect([field('other', 'keys'), named(element, 'conflict'), named(element, 'prompt')]).toEqual([['o:up'], [], []])
  })
})

const GO = { go: { keys: ['space'], label: 'Go', mouse: ['scrollup'] } }

describe('recording holds, taps and steps', () => {
  test('offers switches only for the syntax that is on', () => {
    const off = panel(GO)
    click(off.element, 'add', '+ Key')
    expect([...named(off.element, 'record-hold'), ...named(off.element, 'record-steps')]).toEqual([])
    const on = panel(GO, { holds: true, sequences: true })
    click(on.element, 'add', '+ Key')
    expect(['record-hold', 'record-tap', 'record-steps'].map((name) => named(on.element, name).length)).toEqual([
      1, 1, 1,
    ])
  })

  test('takes a key as k:hold or k:tap, and a mouse button held, but not scrolling', () => {
    const { element, field } = panel(GO, { holds: true })
    click(element, 'add', '+ Key')
    click(element, 'record-hold')
    tapInWindow('k')
    click(element, 'add', '+ Key')
    click(element, 'record-tap')
    tapInWindow('j')
    click(element, 'add', '+ Mouse')
    click(element, 'record-hold')
    globalThis.dispatchEvent(new WheelEvent('wheel', { cancelable: true, deltaY: SCROLL_UP }))
    mouseInWindow('mousedown', MIDDLE)
    expect([field('go', 'keys'), field('go', 'mouse')]).toEqual([
      ['space', 'k:hold', 'j:tap'],
      ['scrollup', 'middle:hold'],
    ])
  })

  test('takes steps one after another until Done', () => {
    const { element, field } = panel(GO, { sequences: true })
    click(element, 'add', '+ Key')
    click(element, 'record-steps')
    tapInWindow('g')
    tapInWindow('i')
    expect(named(element, 'prompt')[0]?.firstElementChild?.textContent).toBe('G then I then...')
    click(element, 'record-done')
    expect(field('go', 'keys')).toEqual(['space', 'g i'])
  })

  test('takes the steps so far after a pause', async () => {
    const { element, field } = panel(GO, { pause: SHORT_PAUSE, sequences: true })
    click(element, 'add', '+ Key')
    click(element, 'record-steps')
    tapInWindow('j')
    tapInWindow('j')
    await Bun.sleep(PAST_PAUSE)
    expect(field('go', 'keys')).toEqual(['space', 'j j'])
  })
})

describe('recording pads and axes', () => {
  test('takes a gamepad button, offered only while a pad is connected', () => {
    const faked = fakePads()
    cleanups.push(faked.restore)
    const without = panel({ jump: { keys: ['space'], label: 'Jump' } })
    expect(named(without.element, 'add').map((add) => add.textContent)).toEqual(['+ Key', '+ Mouse'])
    faked.set([])
    const { element, overrides } = panel({ jump: { keys: ['space'], label: 'Jump' } })
    click(element, 'add', '+ Gamepad')
    faked.frame()
    faked.set([PAD_Y])
    faked.frame()
    expect(overrides.get()).toEqual({ jump: { pad: ['y'] } })
  })

  test('takes two keys as an axis, which has its own Invert switch and no Release switch', () => {
    const { element, field } = panel({ strafe: { axes: ['keys:a/d'], label: 'Strafe' } }, { releases: true })
    expect(named(element, 'add').map((add) => add.textContent)).toEqual(['+ Axis'])
    click(element, 'add', '+ Axis')
    expect(named(element, 'record-release')).toEqual([])
    globalThis.dispatchEvent(kbd('keydown', { code: 'KeyJ', key: 'j' }))
    globalThis.dispatchEvent(kbd('keydown', { code: 'KeyL', key: 'l' }))
    expect(field('strafe', 'axes')).toEqual(['keys:a/d', 'keys:j/l'])
    expect([named(element, 'invert').length, named(element, 'release').length]).toEqual([2, 0])
    click(element, 'invert')
    expect(field('strafe', 'axes')).toEqual(['-keys:a/d', 'keys:j/l'])
    expect(named(element, 'invert').map((invert) => invert.getAttribute('aria-pressed'))).toEqual(['true', 'false'])
  })
})
