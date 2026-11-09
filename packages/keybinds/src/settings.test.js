/** @import { Schema } from './command.js' */

import { afterEach, describe, expect, mock, test } from 'bun:test'

import { KeybindSettings } from './settings.js'
import { BindingsStore } from './store.js'
import { elementOf, shadowOf, textsOf } from './test-components.js'
import { kbd, keybinds } from './test-helpers.js'
import { ALL } from './test-inputs.js'
import { fakePads } from './test-pads.js'

const ONCE = 1
const NONE = 0
const MIDDLE = 1
const BACK = 3
const PAD_Y = 3
const SHORT_PAUSE = 10
const PAST_PAUSE = 30
const SCROLL_UP = -10
const FIRST = 0

/** @type {Element[]} */
const placed = []

/**
 * Takes every panel the test made out of the page
 * @returns {void}
 */
function removePanels() {
  for (const element of placed.splice(FIRST)) {
    element.remove()
  }
}

/**
 * Puts a panel in the page until the test ends
 * @param {Element} panel - The panel
 * @returns {void}
 */
function place(panel) {
  document.body.append(panel)
  placed.push(panel)
}

/**
 * An open panel in the page, over a store of a schema kept nowhere, showing every input
 * @template {Schema} T
 * @param {T} schema - The schema
 * @param {Readonly<{ holds?: boolean, releases?: boolean, sequences?: boolean }>} [syntax] - Which syntax is on
 * @returns {Readonly<{ panel: KeybindSettings, store: BindingsStore<T> }>} The panel, and its store
 */
function openPanel(schema, syntax = {}) {
  const panel = elementOf('keybinds-settings', KeybindSettings)
  panel.inputs = ALL.inputs
  panel.holds = syntax.holds === true
  panel.releases = syntax.releases === true
  panel.sequences = syntax.sequences === true
  const store = new BindingsStore(schema, { load: () => ({}), save: () => undefined })
  panel.store = store
  place(panel)
  panel.open = true
  return { panel, store }
}

/**
 * The elements in a panel with a part name
 * @param {Element} panel - The panel
 * @param {string} part - The part name
 * @returns {HTMLElement[]} The elements, in order
 */
function partsNamed(panel, part) {
  return [...shadowOf(panel).querySelectorAll(`[part~="${part}"]`)].filter((found) => found instanceof HTMLElement)
}

/**
 * Clicks the first element in a panel with a part name
 * @param {Element} panel - The panel
 * @param {string} part - The part name
 * @returns {void}
 * @throws {TypeError} If there's none
 */
function clickPart(panel, part) {
  const [found] = partsNamed(panel, part)
  if (found === undefined) {
    throw new TypeError(`no ${part} in the panel`)
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
  globalThis.dispatchEvent(new KeyboardEvent(type, { cancelable: true, code: `Key${key.toUpperCase()}`, key, ...init }))
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

afterEach(removePanels)

const SCHEMA = {
  delete: { category: 'Edit', keys: ['backspace'], label: 'Delete' },
  hidden: { hidden: true, keys: ['h'], label: 'Hidden' },
  open: { category: 'File', keys: ['$mod+o'], label: 'Open' },
  save: { category: 'File', keys: ['$mod+s'], label: 'Save' },
}

/**
 * Notes the details of the events of one type that an element dispatches
 * @param {EventTarget} target - The element
 * @param {string} type - The event type
 * @returns {readonly unknown[]} The details, as they come
 */
function detailsOf(target, type) {
  /** @type {unknown[]} */
  const details = []
  target.addEventListener(type, (event) => {
    details.push(event instanceof CustomEvent ? event.detail : undefined)
  })
  return details
}

describe('an open settings panel', () => {
  test('groups the commands that are not hidden by category, with their bindings', () => {
    const { panel } = openPanel(SCHEMA)
    expect(textsOf(panel, '.settings__group-title')).toEqual(['Edit', 'File'])
    expect(textsOf(panel, '.settings__item-label')).toEqual(['Delete', 'Open', 'Save'])
    expect(textsOf(panel, '.settings__binding-key').length).toBeGreaterThan(ONCE)
  })

  test('removes a binding, keeping the override when the rest differ from the defaults, and says which changed', () => {
    const { panel, store } = openPanel(SCHEMA)
    const changes = detailsOf(panel, 'change')
    clickPart(panel, 'binding-remove')
    expect(store.get('delete').keys).toEqual([])
    expect(store.getOverrides()['delete']).toEqual({ keys: [] })
    expect(changes).toMatchObject([{ commandId: 'delete' }])
  })

  test('resets one command to its defaults, or all of them, and says so', () => {
    const { panel, store } = openPanel(SCHEMA)
    const resets = detailsOf(panel, 'reset')
    store.save({ delete: { keys: ['ctrl+shift+d'] }, open: { keys: ['ctrl+p'] } })
    clickPart(panel, 'item-reset')
    expect(store.get('delete').keys).toEqual(['backspace'])
    expect(store.get('open').keys).toEqual(['ctrl+p'])
    clickPart(panel, 'reset-all')
    expect(store.getOverrides()).toEqual({})
    expect(resets).toEqual([{ commandId: 'delete' }, {}])
  })
})

describe('a settings panel in the page', () => {
  test('closes from its backdrop, and says so', () => {
    const { panel } = openPanel(SCHEMA)
    const closes = detailsOf(panel, 'close')
    clickPart(panel, 'backdrop')
    expect(closes).toHaveLength(ONCE)
    expect(panel.open).toBe(false)
  })

  test('shows the bindings again when the store changes', () => {
    const { panel, store } = openPanel(SCHEMA)
    store.save({ save: { keys: ['ctrl+shift+s'] } })
    expect(textsOf(panel, '.settings__binding-key')).toContain('Shift')
  })

  test('keeps the bindings of the page from firing inside it', () => {
    const target = document.createElement('div')
    document.body.append(target)
    const execute = mock(() => undefined)
    const stop = keybinds([{ execute, id: 'save', keys: ['ctrl+s'], label: 'Save' }], undefined, { target })
    const { panel } = openPanel(SCHEMA)
    target.append(panel)
    panel.dispatchEvent(kbd('keydown', { code: 'KeyS', ctrlKey: true, key: 's' }))
    expect(execute).not.toHaveBeenCalled()
    stop()
    target.remove()
  })

  test('shows sequences as steps, and holds as what they wait for', () => {
    const { panel, store } = openPanel({ go: { keys: ['space'], label: 'Go', mouse: ['scrollup'] } }, { holds: true })
    store.save({ go: { keys: ['ctrl+k ctrl+s', 'k:hold'] } })
    const chips = partsNamed(panel, 'binding-keys').map((chip) =>
      Array.from(chip.querySelectorAll('kbd'), (key) => key.textContent),
    )
    expect(chips).toEqual([['Ctrl', 'K', 'then', 'Ctrl', 'S'], ['K', 'Hold'], ['Scroll ↑']])
  })
})

const RELEASES = {
  hold: { category: 'A', keys: ['space'], label: 'Hold', mouse: ['middle', 'scrollup'] },
  other: { category: 'A', keys: ['o:up'], label: 'Other' },
}

describe('recording a release', () => {
  test('is a switch in the prompt, off at first', () => {
    const { panel } = openPanel(RELEASES, { releases: true })
    clickPart(panel, 'add-key')
    const [toggle] = partsNamed(panel, 'recording-release')
    expect(toggle?.getAttribute('aria-pressed')).toBe('false')
    clickPart(panel, 'recording-release')
    expect(partsNamed(panel, 'recording-release-on')).toHaveLength(ONCE)
  })

  test('takes the key when it comes up, with the modifiers held as it went down', () => {
    const { panel, store } = openPanel(RELEASES, { releases: true })
    clickPart(panel, 'add-key')
    clickPart(panel, 'recording-release')
    keyInWindow('keydown', 'k', { ctrlKey: true })
    expect(store.get('hold').keys).toEqual(['space'])
    keyInWindow('keyup', 'k')
    expect(store.get('hold').keys).toEqual(['space', '$mod+k:up'])
  })

  test('ignores a key coming up that did not go down while recording', () => {
    const { panel, store } = openPanel(RELEASES, { releases: true })
    clickPart(panel, 'add-key')
    clickPart(panel, 'recording-release')
    keyInWindow('keyup', 'k')
    expect(store.get('hold').keys).toEqual(['space'])
  })

  test('with the switch off, takes the press', () => {
    const { panel, store } = openPanel(RELEASES, { releases: true })
    clickPart(panel, 'add-key')
    keyInWindow('keydown', 'k')
    expect(store.get('hold').keys).toEqual(['space', 'k'])
  })
})

describe('recording the release of a mouse button', () => {
  test('takes it when it comes up, but not scrolling or a click on the switch', () => {
    const { panel, store } = openPanel(RELEASES, { releases: true })
    clickPart(panel, 'add-mouse')
    clickPart(panel, 'recording-release')
    globalThis.dispatchEvent(new WheelEvent('wheel', { cancelable: true, deltaY: SCROLL_UP }))
    const [toggle] = partsNamed(panel, 'recording-release')
    toggle?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, composed: true }))
    expect(store.get('hold').mouse).toEqual(['middle', 'scrollup'])
    mouseInWindow('mousedown', BACK)
    mouseInWindow('mouseup', BACK)
    expect(store.get('hold').mouse).toEqual(['middle', 'scrollup', 'back:up'])
  })

  test('again, in place of a binding, can take its release', () => {
    const { panel, store } = openPanel(RELEASES, { releases: true })
    clickPart(panel, 'binding-keys')
    clickPart(panel, 'recording-release')
    tapInWindow('j')
    expect(store.get('hold').keys).toEqual(['j:up'])
  })
})

describe("a binding's release switch", () => {
  test('flips a press to its release and back, and scrolling has none', () => {
    const { panel, store } = openPanel(RELEASES, { releases: true })
    clickPart(panel, 'binding-release')
    expect(store.get('hold').keys).toEqual(['space:up'])
    clickPart(panel, 'binding-release-on')
    expect(store.get('hold').keys).toEqual(['space'])
    const scroll = partsNamed(panel, 'binding').find((chip) => chip.textContent.includes('Scroll'))
    expect(scroll?.querySelectorAll('[part~="binding-release"]')).toHaveLength(NONE)
  })

  test('into a taken binding asks first, then replaces the other command’s', () => {
    const { panel, store } = openPanel(RELEASES, { releases: true })
    store.save({ hold: { keys: ['o'] } })
    clickPart(panel, 'binding-release')
    expect(store.get('hold').keys).toEqual(['o'])
    expect(partsNamed(panel, 'conflict')).toHaveLength(ONCE)
    clickPart(panel, 'conflict-accept')
    expect(store.get('hold').keys).toEqual(['o:up'])
    expect(store.get('other').keys).toEqual([])
  })

  test('into a taken binding, cancelled, leaves the binding and ends the prompt', () => {
    const { panel, store } = openPanel(RELEASES, { releases: true })
    store.save({ hold: { keys: ['o'] } })
    clickPart(panel, 'binding-release')
    clickPart(panel, 'conflict-cancel')
    expect(store.get('hold').keys).toEqual(['o'])
    expect([...partsNamed(panel, 'conflict'), ...partsNamed(panel, 'recording-overlay')]).toEqual([])
  })
})

const GO = { go: { keys: ['space'], label: 'Go', mouse: ['scrollup'] } }

describe('recording holds and taps', () => {
  test('offers switches only for the syntax that is on', () => {
    const off = openPanel(GO)
    clickPart(off.panel, 'add-key')
    expect([...partsNamed(off.panel, 'recording-hold'), ...partsNamed(off.panel, 'recording-sequence')]).toEqual([])
    const on = openPanel(GO, { holds: true, sequences: true })
    clickPart(on.panel, 'add-key')
    expect(
      ['recording-hold', 'recording-tap', 'recording-sequence'].map((part) => partsNamed(on.panel, part).length),
    ).toEqual([ONCE, ONCE, ONCE])
  })

  test('takes a key as k:hold or k:tap', () => {
    const { panel, store } = openPanel(GO, { holds: true })
    clickPart(panel, 'add-key')
    clickPart(panel, 'recording-hold')
    tapInWindow('k')
    clickPart(panel, 'add-key')
    clickPart(panel, 'recording-tap')
    tapInWindow('j')
    expect(store.get('go').keys).toEqual(['space', 'k:hold', 'j:tap'])
  })

  test('takes a mouse button held, but not scrolling', () => {
    const { panel, store } = openPanel(GO, { holds: true })
    clickPart(panel, 'add-mouse')
    clickPart(panel, 'recording-hold')
    globalThis.dispatchEvent(new WheelEvent('wheel', { cancelable: true, deltaY: SCROLL_UP }))
    mouseInWindow('mousedown', MIDDLE)
    expect(store.get('go').mouse).toEqual(['scrollup', 'middle:hold'])
  })
})

describe('recording steps', () => {
  test('takes steps one after another until Done', () => {
    const { panel, store } = openPanel(GO, { sequences: true })
    clickPart(panel, 'add-key')
    clickPart(panel, 'recording-sequence')
    tapInWindow('g')
    tapInWindow('i')
    const [overlay] = partsNamed(panel, 'recording-overlay')
    expect(overlay?.textContent).toBe('G then I then...')
    clickPart(panel, 'recording-done')
    expect(store.get('go').keys).toEqual(['space', 'g i'])
  })

  test('takes the steps so far after a pause', async () => {
    const pause = KeybindSettings.SEQUENCE_PAUSE
    KeybindSettings.SEQUENCE_PAUSE = SHORT_PAUSE
    const { panel, store } = openPanel(GO, { sequences: true })
    clickPart(panel, 'add-key')
    clickPart(panel, 'recording-sequence')
    tapInWindow('j')
    tapInWindow('j')
    await Bun.sleep(PAST_PAUSE)
    KeybindSettings.SEQUENCE_PAUSE = pause
    expect(store.get('go').keys).toEqual(['space', 'j j'])
  })
})

describe('recording pads and axes', () => {
  test('takes a gamepad button', () => {
    const pads = fakePads()
    pads.set([])
    const { panel, store } = openPanel({ jump: { keys: ['space'], label: 'Jump' } })
    clickPart(panel, 'add-gamepad')
    pads.frame()
    pads.set([PAD_Y])
    pads.frame()
    pads.restore()
    expect(store.getOverrides()).toEqual({ jump: { gamepad: ['y'] } })
  })

  test('takes two keys as an axis, and inverts it', () => {
    const { panel, store } = openPanel({ strafe: { axes: ['keys:a/d'], label: 'Strafe' } })
    clickPart(panel, 'add-axis')
    globalThis.dispatchEvent(kbd('keydown', { code: 'KeyJ', key: 'j' }))
    globalThis.dispatchEvent(kbd('keydown', { code: 'KeyL', key: 'l' }))
    expect(store.get('strafe').axes).toEqual(['keys:a/d', 'keys:j/l'])
    expect(partsNamed(panel, 'binding-invert').map((part) => part.className)).toEqual([
      'settings__binding-invert',
      'settings__binding-invert',
    ])
    clickPart(panel, 'binding-invert')
    expect(store.get('strafe').axes).toEqual(['-keys:a/d', 'keys:j/l'])
  })
})
