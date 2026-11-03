/** @import { DismissReason, LayerOptions } from './layer.js' */

import { describe, expect, test } from 'bun:test'

import { LayerStack } from './layer-stack.js'
import { Layer } from './layer.js'

/**
 * A stack, and layers in it opened in order, each noting its dismissals by name.
 * @param {readonly (readonly [string, LayerOptions])[]} specs - Each layer's name and options
 * @returns {Readonly<{ stack: LayerStack, layers: ReadonlyMap<string, Layer>, heard: string[] }>} What was made
 */
function opened(specs) {
  const stack = new LayerStack()
  /** @type {Map<string, Layer>} */
  const layers = new Map()
  /** @type {string[]} */
  const heard = []
  for (const [name, options] of specs) {
    const layer = new Layer(options)
    layer.onDismiss((reason) => {
      heard.push(`${name} ${reason}`)
    })
    stack.track(layer)
    layer.open.set(true)
    layers.set(name, layer)
  }
  return { heard, layers, stack }
}

/**
 * A layer that was made.
 * @param {ReadonlyMap<string, Layer>} layers - The layers
 * @param {string} name - Its name
 * @returns {Layer} It
 */
function named(layers, name) {
  const layer = layers.get(name)
  if (!layer) {
    throw new Error(`No layer ${name}`)
  }
  return layer
}

/**
 * Which of the layers are open, by name.
 * @param {ReadonlyMap<string, Layer>} layers - The layers
 * @returns {string[]} The open ones' names
 */
function stillOpen(layers) {
  /** @type {string[]} */
  const names = []
  for (const [name, layer] of layers) {
    if (layer.open.get()) {
      names.push(name)
    }
  }
  return names
}

/** @type {readonly (readonly [string, LayerOptions])[]} */
const MENUS = [
  ['menu', {}],
  ['submenu', {}],
  ['subsubmenu', {}],
]

describe('LayerStack, keeping order', () => {
  test('keeps the open layers in the order they opened, and drops one that closes', () => {
    const { layers, stack } = opened(MENUS)
    expect(stack.layers()).toEqual([named(layers, 'menu'), named(layers, 'submenu'), named(layers, 'subsubmenu')])
    named(layers, 'subsubmenu').open.request(false)
    expect(stack.top()).toBe(named(layers, 'submenu'))
  })

  test('puts a layer opened again on top', () => {
    const { layers, stack } = opened([
      ['a', {}],
      ['b', {}],
    ])
    named(layers, 'a').open.set(false)
    named(layers, 'a').open.set(true)
    expect(stack.top()).toBe(named(layers, 'a'))
  })
})

describe('LayerStack, pressed outside', () => {
  test('a press inside a layer dismisses the layers above it, from the top down', () => {
    const { heard, layers, stack } = opened(MENUS)
    stack.pressedOutside(named(layers, 'menu'))
    expect(heard).toEqual(['subsubmenu outside', 'submenu outside'])
    expect(stillOpen(layers)).toEqual(['menu'])
  })

  test('a press outside every layer dismisses them all', () => {
    const { layers, stack } = opened(MENUS)
    stack.pressedOutside(undefined)
    expect(stillOpen(layers)).toEqual([])
  })

  test('a press leaves alone a layer that does not close on it, and what it vetoes', () => {
    const { layers, stack } = opened([
      ['pinned', { closesOn: { outside: false } }],
      ['owned', { controlled: true }],
      ['plain', {}],
    ])
    stack.pressedOutside(undefined)
    expect(stillOpen(layers)).toEqual(['pinned', 'owned'])
  })

  test('nothing outside reaches the layers beneath a modal one', () => {
    const { heard, layers, stack } = opened([
      ['page menu', {}],
      ['dialog', { modal: true }],
      ['dialog menu', {}],
    ])
    stack.pressedOutside(undefined)
    expect(heard).toEqual(['dialog menu outside', 'dialog outside'])
    expect(stillOpen(layers)).toEqual(['page menu'])
  })
})

describe('LayerStack, focus and Escape', () => {
  test('focus moving outside dismisses layers above it, but never a modal one', () => {
    const { layers, stack } = opened([
      ['dialog', { modal: true }],
      ['menu', {}],
    ])
    stack.focusedOutside(undefined)
    expect(stillOpen(layers)).toEqual(['dialog'])
  })

  test('Escape dismisses only the top layer, and says whether it did', () => {
    const { heard, layers, stack } = opened(MENUS)
    expect(stack.escape()).toBe(true)
    expect(heard).toEqual(['subsubmenu escape'])
    expect(stillOpen(layers)).toEqual(['menu', 'submenu'])
  })

  test('Escape does nothing to a top layer that does not close on it, nor to the ones beneath', () => {
    const { layers, stack } = opened([
      ['menu', {}],
      ['pinned', { closesOn: { escape: false } }],
    ])
    expect(stack.escape()).toBe(false)
    expect(stillOpen(layers)).toEqual(['menu', 'pinned'])
  })
})

describe('LayerStack, closing and following', () => {
  test('a layer closing dismisses every layer above it', () => {
    const { heard, layers } = opened(MENUS)
    named(layers, 'menu').open.request(false)
    /** @type {DismissReason} */
    const reason = 'beneath'
    expect(heard).toEqual([`subsubmenu ${reason}`, `submenu ${reason}`])
    expect(stillOpen(layers)).toEqual([])
  })

  test('a layer it stops following leaves the stack, and opening it no longer puts it there', () => {
    const stack = new LayerStack()
    const layer = new Layer({ open: true })
    const stop = stack.track(layer)
    expect(stack.layers()).toEqual([layer])
    stop()
    layer.open.set(false)
    layer.open.set(true)
    expect(stack.layers()).toEqual([])
  })

  test('tells its listeners when layers open and close', () => {
    const stack = new LayerStack()
    /** @type {(readonly Layer[])[]} */
    const seen = []
    const layer = new Layer()
    stack.track(layer)
    stack.subscribe(() => {
      seen.push(stack.layers())
    })
    layer.open.request(true)
    layer.open.request(false)
    expect(seen).toEqual([[layer], []])
  })
})
