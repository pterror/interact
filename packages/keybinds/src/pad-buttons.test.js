import { afterEach, describe, expect, test } from 'bun:test'

import { keybinds } from './keybinds.js'
import { padButtons } from './pad-buttons.js'
import { pads } from './pads.js'
import { notes } from './test-keys.js'
import { fakePads } from './test-pads.js'

const BUTTON_A = 0
const BUTTON_RT = 7

/** @type {(() => void)[]} */
const cleanups = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) {
    cleanup()
  }
})

/**
 * Fake pads with one connected, nothing down, put back after the test
 * @returns {ReturnType<typeof fakePads>} The pads
 */
function onePad() {
  const faked = fakePads()
  cleanups.push(faked.restore)
  faked.set([])
  return faked
}

/**
 * Gamepad buttons listened to, noting each press and release
 * @param {() => boolean} [blocked] - Whether handlers are kept from running
 * @returns {readonly string[]} What was noted
 */
function listen(blocked) {
  /** @type {string[]} */
  const log = []
  cleanups.push(
    padButtons({
      pads: pads(),
      to: {
        down(press) {
          log.push(`down ${press.id} ${press.query.exact.join(',')} ${press.event.type}`)
        },
        up(release) {
          log.push(`up ${release.id}${release.blocked ? ' blocked' : ''}`)
        },
      },
      ...(blocked === undefined ? {} : { blocked }),
    }),
  )
  return log
}

describe('padButtons', () => {
  test('makes a button going down a press by its name, and coming up its end', () => {
    const faked = onePad()
    const log = listen()
    faked.frame()
    faked.set([BUTTON_RT])
    faked.frame()
    faked.set([])
    faked.frame()
    expect(log).toEqual(['down 0:7 rt gamepadbuttondown', 'up 0:7'])
  })

  test("doesn't make a button already down when the pad is first seen a press", () => {
    const faked = onePad()
    faked.set([BUTTON_A])
    const log = listen()
    faked.frame()
    faked.frame()
    expect(log).toEqual([])
  })

  test('lets go of the buttons of a pad that goes away', () => {
    const faked = onePad()
    const log = listen()
    faked.frame()
    faked.set([BUTTON_RT])
    faked.frame()
    faked.set()
    faked.frame()
    expect(log).toEqual(['down 0:7 rt gamepadbuttondown', 'up 0:7'])
  })

  test('presses nothing while blocked, and says so of a release', () => {
    const faked = onePad()
    let blocking = true
    const log = listen(() => blocking)
    faked.frame()
    faked.set([BUTTON_A])
    faked.frame()
    faked.set([])
    faked.frame()
    expect(log).toEqual(['up 0:0 blocked'])
    blocking = false
    faked.set([BUTTON_A])
    faked.frame()
    expect(log).toEqual(['up 0:0 blocked', 'down 0:0 a gamepadbuttondown'])
  })
})

describe('gamepad bindings', () => {
  test('run as a button is pressed and let go', () => {
    const faked = onePad()
    const log = notes()
    cleanups.push(keybinds([{ pad: ['south', 'a:up'], run: log.as('jump') }], { releases: true }))
    faked.frame()
    faked.set([BUTTON_A])
    faked.frame()
    faked.set([])
    faked.frame()
    expect(log.entries).toEqual(['jump:gamepadbuttondown', 'jump:gamepadbuttonup'])
  })

  test("don't run while an overlay outside where they listen holds focus", () => {
    const faked = onePad()
    const log = notes()
    const dialog = document.createElement('dialog')
    const field = document.createElement('input')
    dialog.append(field)
    document.body.append(dialog)
    cleanups.push(
      () => {
        dialog.remove()
      },
      keybinds([{ pad: ['a'], run: log.as('jump') }]),
    )
    dialog.setAttribute('open', '')
    field.focus()
    faked.frame()
    faked.set([BUTTON_A])
    faked.frame()
    expect(log.entries).toEqual([])
  })
})
