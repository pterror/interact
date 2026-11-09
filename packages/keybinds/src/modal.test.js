import { describe, expect, mock, test } from 'bun:test'

import { anyOverlayOpen, markKind, overlayOpen } from './modal.js'
import { kbd, keybinds } from './test-helpers.js'

/**
 * A page listening for Ctrl+S, with a modal dialog in it
 * @param {() => unknown} execute - What Ctrl+S runs
 * @returns {Readonly<{ dialog: HTMLElement, stop: () => void }>} The dialog, and how to take the page down
 */
function page(execute) {
  const body = document.createElement('div')
  document.body.append(body)
  const dialog = document.createElement('div')
  markKind(dialog, 'dialog', true)
  body.append(dialog)
  const listening = keybinds([{ execute, id: 's', keys: ['ctrl+s'], label: 'S' }], undefined, { target: body })
  return {
    dialog,
    stop: () => {
      listening()
      body.remove()
    },
  }
}

/**
 * Whether a key typed in an element happens inside an element that takes the keyboard, judged while the key goes
 * through the page, as the listeners judge it
 * @param {Element} element - Where it's typed
 * @returns {boolean} Whether it does
 */
function keyInOverlay(element) {
  let inside = false
  /**
   * @param {Event} event - The key, on its way
   * @returns {void}
   */
  function judge(event) {
    inside = overlayOpen(event, document)
  }
  document.addEventListener('keydown', judge, { once: true })
  element.dispatchEvent(kbd('keydown', { code: 'KeyS', composed: true, key: 's' }))
  return inside
}

/**
 * A field in a dialog inside a shadow root, in the page
 * @returns {Readonly<{ field: HTMLInputElement, host: HTMLElement, shadowDialog: HTMLDialogElement }>} The field, the
 *   shadow root's host, and the dialog (closed)
 */
function shadowField() {
  const host = document.createElement('div')
  document.body.append(host)
  const shadowDialog = document.createElement('dialog')
  const field = document.createElement('input')
  shadowDialog.append(field)
  host.attachShadow({ mode: 'open' }).append(shadowDialog)
  return { field, host, shadowDialog }
}

describe('modal elements', () => {
  test('keep keys typed inside them from firing bindings while they are open', () => {
    const execute = mock(() => undefined)
    const { dialog, stop } = page(execute)
    dialog.setAttribute('open', '')
    dialog.dispatchEvent(kbd('keydown', { code: 'KeyS', ctrlKey: true, key: 's' }))
    expect(execute).not.toHaveBeenCalled()
    dialog.removeAttribute('open')
    dialog.dispatchEvent(kbd('keydown', { code: 'KeyS', ctrlKey: true, key: 's' }))
    expect(execute).toHaveBeenCalled()
    stop()
  })

  test('leave keys typed inside them to bindings listening on them or inside them', () => {
    const execute = mock(() => undefined)
    const outer = mock(() => undefined)
    const { dialog, stop } = page(outer)
    dialog.setAttribute('open', '')
    const inner = document.createElement('div')
    dialog.append(inner)
    const own = keybinds([{ execute, id: 'down', keys: ['ArrowDown'], label: 'Down' }], undefined, { target: dialog })
    const deeper = keybinds([{ execute, id: 'up', keys: ['ArrowUp'], label: 'Up' }], undefined, { target: inner })
    inner.dispatchEvent(kbd('keydown', { code: 'ArrowDown', key: 'ArrowDown' }))
    inner.dispatchEvent(kbd('keydown', { code: 'ArrowUp', key: 'ArrowUp' }))
    inner.dispatchEvent(kbd('keydown', { code: 'KeyS', ctrlKey: true, key: 's' }))
    expect([execute.mock.calls.length, outer.mock.calls.length]).toEqual([2, 0])
    own()
    deeper()
    stop()
  })

  test('are known by their kind and the mark, whatever their tag', () => {
    const dialog = document.createElement('my-dialog')
    markKind(dialog, 'dialog', true)
    document.body.append(dialog)
    const closed = [keyInOverlay(dialog), anyOverlayOpen()]
    dialog.setAttribute('open', '')
    const open = [keyInOverlay(dialog), anyOverlayOpen()]
    dialog.remove()
    expect([dialog.dataset['keybinds'], closed, open]).toEqual(['dialog', [false, false], [true, true]])
  })

  test('include an open dialog inside a shadow root, for keys typed in it and for focus in it', () => {
    const { field, host, shadowDialog } = shadowField()
    const closed = [keyInOverlay(field), anyOverlayOpen()]
    shadowDialog.setAttribute('open', '')
    field.focus()
    const open = [keyInOverlay(field), anyOverlayOpen()]
    host.remove()
    expect([closed, open]).toEqual([
      [false, false],
      [true, true],
    ])
  })
})
