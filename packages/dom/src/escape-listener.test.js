import { describe, expect, test } from 'bun:test'

import { Layer, LayerStack } from '@interact/core'

import { EscapeListener } from './escape-listener.js'

/**
 * A stack with one layer open in it.
 * @returns {Readonly<{ layer: Layer, stack: LayerStack }>} The layer and its stack
 */
function openLayer() {
  const stack = new LayerStack()
  const layer = new Layer()
  stack.track(layer)
  layer.open.set(true)
  return { layer, stack }
}

/**
 * An open layer in a stack heard by an Escape listener on a root, with a field inside the root that may take Escape
 * first, and what one Escape pressed in the field did.
 * @param {Readonly<{ fieldTakes: boolean, composing: boolean }>} how - Whether the field takes Escape, and whether an
 *   input method is composing
 * @returns {Readonly<{ open: boolean, prevented: boolean }>} Whether the layer is still open, and whether Escape's
 *   default was prevented
 */
function escapeIn({ composing, fieldTakes }) {
  const { layer, stack } = openLayer()
  const root = document.createElement('div')
  const field = document.createElement('input')
  root.append(field)
  root.addEventListener('keydown', new EscapeListener(stack))
  if (fieldTakes) {
    field.addEventListener('keydown', (event) => {
      event.preventDefault()
    })
  }
  const escape = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    isComposing: composing,
    key: 'Escape',
  })
  field.dispatchEvent(escape)
  return { open: layer.open.get(), prevented: escape.defaultPrevented }
}

describe('Escape heard after the page', () => {
  test('dismisses the top layer when nothing inside took it, and is then the layer’s', () => {
    expect(escapeIn({ composing: false, fieldTakes: false })).toEqual({ open: false, prevented: true })
  })

  test('leaves the layer open when a control inside took it first', () => {
    expect(escapeIn({ composing: false, fieldTakes: true })).toEqual({ open: true, prevented: true })
  })

  test('leaves the layer open while an input method composes', () => {
    expect(escapeIn({ composing: true, fieldTakes: false })).toEqual({ open: true, prevented: false })
  })
})
