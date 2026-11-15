import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test'

import { bindingParts } from './binding-parts.js'
import { bindingStore } from './binding-store.js'
import { cheatsheet } from './cheatsheet.js'
import { contextMenu } from './context-menu.js'
import { formatAxis } from './format-axis.js'
import { formatKey } from './format-key.js'
import { formatMouse } from './format-mouse.js'
import { formatPad } from './format-pad.js'
import { formatSteps } from './format-steps.js'
import { formatModifier } from './modifiers.js'
import { pads } from './pads.js'
import { palette } from './palette.js'
import { rebindAxes, rebindKeys, rebindMouse, rebindPad } from './rebind-inputs.js'
import { settings } from './settings.js'
import { withStrings } from './strings.js'
import { fakePads } from './test-pads.js'
import { fakePopovers } from './test-popover.js'

/**
 * Every string, as a translation that leaves nothing in English, each marked
 * @type {import('./strings.js').Strings}
 */
const STRINGS = {
  actions: '«Actions»',
  add: (input) => `«+ ${input}»`,
  alreadyBound: (label) => `«Already bound to "${label}".»`,
  alt: '«Alt»',
  axisInput: '«Axis»',
  back: '«Back»',
  cancel: '«Cancel»',
  click: '«Click»',
  clickOrScroll: '«Click or scroll...»',
  commands: '«Commands»',
  ctrl: '«Ctrl»',
  done: '«Done»',
  dpadDown: '«D-pad ↓»',
  dpadLeft: '«D-pad ←»',
  dpadRight: '«D-pad →»',
  dpadUp: '«D-pad ↑»',
  escape: '«Esc»',
  forward: '«Forward»',
  gamepadInput: '«Gamepad»',
  hold: '«Hold»',
  home: '«Home»',
  inverted: '«Inverted»',
  invert: '«Invert»',
  keyInput: '«Key»',
  leftStickX: '«Left stick ↔»',
  leftStickY: '«Left stick ↕»',
  middle: '«Middle»',
  mouseInput: '«Mouse»',
  mouseX: '«Mouse ↔»',
  mouseY: '«Mouse ↕»',
  moveAxis: '«Move the mouse, tilt a stick, or press two keys...»',
  other: '«Other»',
  pressButton: '«Press a gamepad button...»',
  pressKey: '«Press a key...»',
  pressReleaseButton: '«Press and release a button...»',
  pressReleaseKey: '«Press and release a key...»',
  pressReleasePadButton: '«Press and release a gamepad button...»',
  release: '«Release»',
  remove: '«Remove»',
  replace: '«Replace»',
  reset: '«Reset»',
  resetAll: '«Reset all»',
  right: '«Right»',
  rightStickX: '«Right stick ↔»',
  rightStickY: '«Right stick ↕»',
  scrollDown: '«Scroll ↓»',
  scrollLeft: '«Scroll ←»',
  scrollRight: '«Scroll →»',
  scrollUp: '«Scroll ↑»',
  shift: '«Shift»',
  space: '«Space»',
  start: '«Start»',
  steps: '«Steps»',
  stepsSoFar: (steps) => `«${steps} then...»`,
  tab: '«Tab»',
  tap: '«Tap»',
  andThen: '«then»',
  typeCommand: '«Type a command»',
}

/** English words in the defaults, which a translated page shows outside a marked string nowhere */
const ENGLISH =
  /Reset|Remove|Replace|Cancel|Already|Invert|Release|Hold|Tap|Steps|Done|Press|Click|Esc\b|Space|Other\b|then\b|Commands|Actions|Type a|stick|Mouse|Gamepad|Axis|D-pad|Scroll|Back|Home|Start|Forward|Middle|Right|Ctrl|Alt\b|Shift/u

/** @type {(() => void)[]} */
const cleanups = []

/**
 * Runs the pad frame that connects the gamepad of the panel made last
 * @type {() => void}
 */
let connect = () => undefined

/** @type {() => void} */
let unfake = () => undefined

beforeAll(() => {
  unfake = fakePopovers()
})

afterAll(() => {
  unfake()
})

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) {
    cleanup()
  }
})

/**
 * Everything a person could read in an element: its text, and its labels and placeholders
 * @param {Element} element - The element
 * @returns {string[]} The pieces
 */
function readable(element) {
  return [element, ...element.querySelectorAll('*')].flatMap((each) => [
    ...[...each.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent ?? ''),
    each.getAttribute('aria-label') ?? '',
    each.getAttribute('placeholder') ?? '',
  ])
}

/**
 * Pieces of what is readable that are in English
 * @param {Element} element - The element
 * @returns {string[]} The pieces
 */
function english(element) {
  return readable(element).filter((piece) => ENGLISH.test(piece.replaceAll(/«[^»]*»/gu, '')))
}

/**
 * A key going down in the window
 * @param {string} key - The key
 * @param {KeyboardEventInit} [init] - Modifiers
 * @returns {void}
 */
function press(key, init = {}) {
  globalThis.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key, ...init }))
}

/**
 * Clicks the first piece named so
 * @param {Element} element - The panel
 * @param {string} name - Its `data-keybinds`
 * @param {string} [text] - What its text has
 * @returns {void}
 * @throws {TypeError} If there is none
 */
function click(element, name, text = '') {
  const found = [...element.querySelectorAll(`[data-keybinds="${name}"]`)].find((each) =>
    each.textContent.includes(text),
  )
  if (!(found instanceof HTMLElement)) {
    throw new TypeError(`no ${name}`)
  }
  found.click()
}

const SCHEMA = {
  fire: {
    axes: ['-pad:ry', 'keys:a/d'],
    category: 'Combat',
    keys: ['escape', 'shift+space', 'g tab', 'k:up'],
    label: 'Fire',
    mouse: ['ctrl+scrollup', 'alt+RightClick', 'back'],
    pad: ['up', 'start'],
  },
  jump: { keys: ['alt+x'], label: 'Jump' },
  stray: { label: 'Stray' },
  zoom: { category: 'Combat', keys: ['p'], label: 'Zoom' },
}

/**
 * A settings panel with every input, with every syntax on, and strings
 * @param {import('./strings.js').StringsOption} strings - The strings, for the panel and each input
 * @returns {HTMLElement} The panel
 */
function panel(strings) {
  const element = document.createElement('div')
  document.body.append(element)
  const overrides = bindingStore({ load: () => ({}), save: () => undefined })
  const faked = fakePads()
  cleanups.push(faked.restore)
  faked.set([])
  const connected = pads()
  connect = faked.frame
  const inputs = [
    rebindKeys({ strings }),
    rebindMouse({ strings }),
    rebindPad({ pads: connected, strings }),
    rebindAxes({ pads: connected, strings }),
  ]
  const stop = settings({
    element,
    holds: true,
    inputs,
    overrides,
    releases: true,
    schema: SCHEMA,
    sequences: true,
    strings,
  })
  cleanups.push(stop, () => {
    element.remove()
  })
  connect()
  return element
}

describe('a settings panel with strings', () => {
  test('shows English without them', () => {
    const element = panel(undefined)
    expect(english(element)).not.toEqual([])
    expect(element.textContent).toContain('Reset all')
  })

  test('shows its buttons, headers, binding parts and input names in them, not in English', () => {
    const element = panel(STRINGS)
    expect(english(element)).toEqual([])
    expect(element.querySelector('[data-keybinds="reset-all"]')?.textContent).toBe('«Reset all»')
    expect(element.querySelector('[data-keybinds="remove"]')?.getAttribute('aria-label')).toBe('«Remove»')
    expect(element.querySelector('[data-keybinds="add"]')?.textContent).toBe('«+ «Axis»»')
    expect([...element.querySelectorAll('[role=presentation]')].map((header) => header.textContent)).toEqual([
      'Combat',
      '«Other»',
    ])
  })

  test('asks, and prompts, in them', () => {
    const element = panel(STRINGS)
    const adds = [...element.querySelectorAll('[data-keybinds="add"]')]
    for (const add of adds) {
      if (add instanceof HTMLElement) {
        add.click()
        const prompt = element.querySelector('[data-keybinds="prompt"]')
        expect(prompt?.textContent).toContain('«')
        expect(english(element)).toEqual([])
        press('Escape')
      }
    }
    expect(element.textContent).toContain('«Gamepad»')
    click(element, 'add', 'Key')
    click(element, 'record-steps')
    press('z')
    expect(element.querySelector('[data-keybinds="prompt"]')?.textContent).toContain('«Z then...»')
    click(element, 'record-done')
    expect(english(element)).toEqual([])
  })

  test('asks before taking a binding another id has, in them', () => {
    const element = panel(STRINGS)
    click(element, 'add', 'Key')
    press('x', { altKey: true })
    const asked = element.querySelector('[data-keybinds="conflict"]')
    expect(asked?.textContent).toBe('«Already bound to "Jump".» «Replace»«Cancel»')
    expect(english(element)).toEqual([])
  })
})

describe('a cheatsheet with strings', () => {
  test('headers its uncategorised ids and shows binding parts in them', () => {
    const element = document.createElement('div')
    document.body.append(element)
    const made = cheatsheet({ element, schema: SCHEMA, strings: STRINGS })
    cleanups.push(made.stop, () => {
      element.remove()
    })
    made.open.set(true)
    expect([...element.querySelectorAll('[role=presentation]')].map((header) => header.textContent)).toEqual([
      'Combat',
      '«Other»',
    ])
    expect(english(element)).toEqual([])
  })
})

describe('a palette and a menu with strings', () => {
  const commands = [{ id: 'save', keys: ['escape', 'g tab'], label: 'Save', run: () => undefined }]

  test('label the dialog and the field, and show bindings, in them', () => {
    const element = document.createElement('div')
    document.body.append(element)
    const made = palette({ commands: () => commands, element, strings: STRINGS })
    cleanups.push(made.stop, () => {
      element.remove()
    })
    made.open.set(true)
    expect([element.getAttribute('aria-label'), element.querySelector('input')?.placeholder]).toEqual([
      '«Commands»',
      '«Type a command»',
    ])
    expect(english(element)).toEqual([])
  })

  test('default to English', () => {
    const element = document.createElement('div')
    document.body.append(element)
    const made = palette({ commands: () => commands, element })
    cleanups.push(made.stop, () => {
      element.remove()
    })
    expect([element.getAttribute('aria-label'), element.querySelector('input')?.placeholder]).toEqual([
      'Commands',
      'Type a command',
    ])
  })

  test('a menu is labelled in them, and shows bindings in them', () => {
    const element = document.createElement('div')
    document.body.append(element)
    const made = contextMenu({ element, strings: STRINGS })
    cleanups.push(made.stop, () => {
      element.remove()
    })
    made.openAt(element, commands)
    expect(element.getAttribute('aria-label')).toBe('«Actions»')
    expect(english(element)).toEqual([])
  })
})

describe('the formats with strings', () => {
  test('show names, suffixes and the separator in them, and leave symbols', () => {
    expect([
      formatKey('escape', undefined, { escape: 'Échap' }),
      formatKey('space', undefined, { space: 'Espace' }),
      formatKey('tab', undefined, { tab: 'Tabulation' }),
      formatMouse('scrollup', { scrollUp: 'Haut' }),
      formatMouse('back', { back: 'Retour' }),
      formatPad('up', { dpadUp: 'Croix haut' }),
      formatPad('a', { dpadUp: 'Croix haut' }),
      formatAxis('-mouse:x', undefined, { inverted: 'Inversé', mouseX: 'Souris ↔' }),
      formatSteps('g tab:hold', (step) => formatKey(step, undefined, { tab: 'T' }), {
        andThen: 'puis',
        hold: 'Maintenir',
      }),
      bindingParts({ keys: ['g k:up'] }, undefined, { andThen: 'puis', release: 'Relâcher' }),
    ]).toEqual([
      ['Échap'],
      ['Espace'],
      ['Tabulation'],
      ['Haut'],
      ['Retour'],
      ['Croix haut'],
      ['A'],
      ['Souris ↔', 'Inversé'],
      ['G', 'puis', 'T', 'Maintenir'],
      [['G', 'puis', 'K', 'Relâcher']],
    ])
  })

  test('are English without them', () => {
    expect([formatKey('escape'), formatSteps('g i', formatKey), formatAxis('-pad:ry')]).toEqual([
      ['Esc'],
      ['G', 'then', 'I'],
      ['Right stick ↕', 'Inverted'],
    ])
  })

  test('keep a Mac modifier a symbol and name the others', () => {
    expect(formatModifier('shift', { shift: 'Maj' })).toBe(navigator.platform.includes('Mac') ? '⇧' : 'Maj')
  })

  test('are merged over the English ones', () => {
    expect([withStrings({ reset: 'Zurücksetzen' }).reset, withStrings({ reset: 'Zurücksetzen' }).remove]).toEqual([
      'Zurücksetzen',
      'Remove',
    ])
  })
})
