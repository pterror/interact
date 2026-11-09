import { afterEach, describe, expect, mock, test } from 'bun:test'

import { focusInOverlay, outsideOverlay } from './overlay.js'
import { kbd, listening } from './test-keys.js'

/** @type {(() => void)[]} */
const cleanups = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) {
    cleanup()
  }
})

/**
 * Whether a key typed in an element is kept from a listener on the document, judged as it goes through
 * @param {Element} element - Where it's typed
 * @returns {boolean} Whether it is
 */
function kept(element) {
  const blocked = outsideOverlay(document)
  let inside = false
  document.addEventListener(
    'keydown',
    (event) => {
      inside = blocked(event)
    },
    { once: true },
  )
  element.dispatchEvent(kbd('keydown', { code: 'KeyS', composed: true, key: 's' }))
  return inside
}

/**
 * A page's bindings listening on an element in the page, with an overlay of the page's own inside
 * @param {() => void} run - What Ctrl+S runs
 * @returns {Readonly<{ overlay: HTMLElement, page: HTMLElement }>} The overlay, and the page's element
 */
function page(run) {
  const keys = listening([{ keys: ['ctrl+s'], run }])
  document.body.append(keys.target)
  const overlay = document.createElement('my-overlay')
  Object.assign(overlay.dataset, { keybindsModal: '' })
  keys.target.append(overlay)
  cleanups.push(() => {
    keys.stop()
    keys.target.remove()
  })
  return { overlay, page: keys.target }
}

describe('overlays', () => {
  test('keep keys typed inside them from bindings outside while they are open', () => {
    const run = mock(() => undefined)
    const { overlay } = page(run)
    overlay.setAttribute('open', '')
    overlay.dispatchEvent(kbd('keydown', { code: 'KeyS', ctrlKey: true, key: 's' }))
    expect(run).not.toHaveBeenCalled()
    overlay.removeAttribute('open')
    overlay.dispatchEvent(kbd('keydown', { code: 'KeyS', ctrlKey: true, key: 's' }))
    expect(run).toHaveBeenCalledTimes(1)
  })

  test('leave keys typed inside them to bindings listening on them or inside them', () => {
    const own = mock(() => undefined)
    const outer = mock(() => undefined)
    const { overlay } = page(outer)
    overlay.setAttribute('open', '')
    const inner = document.createElement('div')
    overlay.append(inner)
    const onOverlay = listening([{ keys: ['ArrowDown'], run: own }], { target: overlay })
    const insideIt = listening([{ keys: ['ArrowUp'], run: own }], { target: inner })
    inner.dispatchEvent(kbd('keydown', { code: 'ArrowDown', key: 'ArrowDown' }))
    inner.dispatchEvent(kbd('keydown', { code: 'ArrowUp', key: 'ArrowUp' }))
    inner.dispatchEvent(kbd('keydown', { code: 'KeyS', ctrlKey: true, key: 's' }))
    expect([own.mock.calls.length, outer.mock.calls.length]).toEqual([2, 0])
    onOverlay.stop()
    insideIt.stop()
  })

  test('are open dialogs, and elements marked and open whatever their tag', () => {
    const marked = document.createElement('my-dialog')
    Object.assign(marked.dataset, { keybindsModal: '' })
    const dialog = document.createElement('dialog')
    document.body.append(marked, dialog)
    const closed = [kept(marked), kept(dialog)]
    marked.setAttribute('open', '')
    dialog.setAttribute('open', '')
    const open = [kept(marked), kept(dialog)]
    marked.remove()
    dialog.remove()
    expect([closed, open]).toEqual([
      [false, false],
      [true, true],
    ])
  })

  test('include an open dialog inside a shadow root', () => {
    const host = document.createElement('div')
    document.body.append(host)
    const dialog = document.createElement('dialog')
    const field = document.createElement('input')
    dialog.append(field)
    host.attachShadow({ mode: 'open' }).append(dialog)
    const closed = kept(field)
    dialog.setAttribute('open', '')
    const open = kept(field)
    host.remove()
    expect([closed, open]).toEqual([false, true])
  })
})

describe('focus in an overlay', () => {
  test('keeps listeners outside an open overlay from input with no target of its own, not those on it', () => {
    const dialog = document.createElement('dialog')
    const field = document.createElement('input')
    dialog.append(field)
    document.body.append(dialog)
    cleanups.push(() => {
      dialog.remove()
    })
    field.focus()
    const closed = focusInOverlay(globalThis)()
    dialog.setAttribute('open', '')
    expect([closed, focusInOverlay(globalThis)(), focusInOverlay(document)(), focusInOverlay(dialog)()]).toEqual([
      false,
      true,
      true,
      false,
    ])
  })

  test('finds focus inside a shadow root', () => {
    const dialog = document.createElement('dialog')
    const host = document.createElement('div')
    const field = document.createElement('input')
    host.attachShadow({ mode: 'open' }).append(field)
    dialog.append(host)
    document.body.append(dialog)
    cleanups.push(() => {
      dialog.remove()
    })
    dialog.setAttribute('open', '')
    field.focus()
    expect(focusInOverlay(globalThis)()).toBe(true)
  })
})
