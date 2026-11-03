import { afterEach, describe, expect, test } from 'bun:test'

import { KeybindSettings } from './settings.js'
import { kbd } from './test-helpers.js'
import { fakePads } from './test-pads.js'
import {
  clickPart,
  keyInWindow,
  mouseInWindow,
  openPanel,
  partsNamed,
  removePanels,
  tapInWindow,
} from './test-settings.js'

const ONCE = 1
const NONE = 0
const MIDDLE = 1
const BACK = 3
const PAD_Y = 3
const SHORT_PAUSE = 10
const PAST_PAUSE = 30
const SCROLL_UP = -10

afterEach(removePanels)

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
    clickPart(panel, 'binding-invert')
    expect(store.get('strafe').axes).toEqual(['-keys:a/d', 'keys:j/l'])
  })
})
