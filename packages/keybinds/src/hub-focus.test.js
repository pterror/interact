import { afterEach, describe, expect, test } from 'bun:test'

import { FocusReturn } from './hub-focus.js'

const FIRST = 0

/** @type {Element[]} */
const placed = []

afterEach(() => {
  for (const element of placed.splice(FIRST)) {
    element.remove()
  }
})

/**
 * An element in the page until the test ends
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tag - Which element
 * @returns {HTMLElementTagNameMap[K]} The element
 */
function placedElement(tag) {
  const element = document.createElement(tag)
  document.body.append(element)
  placed.push(element)
  return element
}

/**
 * An overlay that takes focus into a field of its own, marked as a component
 * @returns {Readonly<{ field: HTMLInputElement, overlay: HTMLElement }>} The overlay, and its field
 */
function overlayWithField() {
  const overlay = placedElement('div')
  overlay.dataset['keybinds'] = 'settings'
  const field = document.createElement('input')
  overlay.append(field)
  return { field, overlay }
}

describe('giving focus back', () => {
  test('returns focus to where it was when an overlay holding it closes', () => {
    const editor = placedElement('textarea')
    const { field, overlay } = overlayWithField()
    const focus = new FocusReturn([overlay])
    editor.focus()
    field.focus()
    overlay.dispatchEvent(new Event('close'))
    expect(document.activeElement).toBe(editor)
    focus.stop()
  })

  test('leaves focus be when it already went somewhere else', () => {
    const editor = placedElement('textarea')
    const elsewhere = placedElement('input')
    const { overlay } = overlayWithField()
    const focus = new FocusReturn([overlay])
    editor.focus()
    elsewhere.focus()
    overlay.dispatchEvent(new Event('close'))
    expect(document.activeElement).toBe(elsewhere)
    focus.stop()
  })
})
