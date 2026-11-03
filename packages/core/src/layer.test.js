/** @import { DismissReason } from './layer.js' */

import { describe, expect, test } from 'bun:test'

import { Layer } from './layer.js'

/** @type {readonly DismissReason[]} */
const REASONS = ['escape', 'outside', 'focus-outside', 'beneath']

describe('Layer', () => {
  test('starts closed, not modal, closing every way out', () => {
    const layer = new Layer()
    expect([layer.open.get(), layer.modal]).toEqual([false, false])
    expect(REASONS.map((reason) => layer.closes(reason))).toEqual([true, true, true, true])
  })

  test('closes only the ways out it is given, and always when a layer beneath it closes', () => {
    const layer = new Layer({ closesOn: { escape: false, focusOutside: false } })
    expect(REASONS.map((reason) => layer.closes(reason))).toEqual([false, true, false, true])
  })

  test('a dismissal is heard with its reason, then closes it', () => {
    const layer = new Layer({ open: true })
    /** @type {string[]} */
    const heard = []
    layer.onDismiss((reason) => {
      heard.push(`dismissed ${reason}`)
    })
    layer.open.onRequest((open) => {
      heard.push(`asked ${String(open)}`)
    })
    layer.dismiss('escape')
    expect(heard).toEqual(['dismissed escape', 'asked false'])
    expect(layer.open.get()).toBe(false)
  })

  test('owned by the app, a dismissal is only a request, which it can refuse', () => {
    const layer = new Layer({ controlled: true, open: true })
    layer.dismiss('outside')
    expect(layer.open.get()).toBe(true)
  })
})
