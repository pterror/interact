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

  test('are known by their kind and the mark, whatever their tag', () => {
    const dialog = document.createElement('my-dialog')
    markKind(dialog, 'dialog', true)
    document.body.append(dialog)
    expect(dialog.dataset['keybinds']).toBe('dialog')
    expect([overlayOpen(dialog), anyOverlayOpen()]).toEqual([false, false])
    dialog.setAttribute('open', '')
    expect([overlayOpen(dialog), anyOverlayOpen()]).toEqual([true, true])
    dialog.remove()
  })
})
