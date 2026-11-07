import { describe, expect, test } from 'bun:test'

import { measureRow, pixels, zoomOf } from './measure-rows.js'

const PITCH = 27.25
const ZOOM = 2
const ONE = 1
const SNAPPED = 27.2969

describe('pixels', () => {
  test('reads a computed length in pixels, and nothing else', () => {
    expect(pixels(`${String(SNAPPED)}px`)).toBe(SNAPPED)
    expect(pixels('auto')).toBeNaN()
    expect(pixels('2rem')).toBeNaN()
  })
})

describe('zoomOf', () => {
  test('multiplies the zoom of an element and everything outside it, across shadow roots', () => {
    const outer = document.createElement('div')
    outer.style.setProperty('zoom', String(ZOOM))
    const host = document.createElement('div')
    outer.append(host)
    const inner = document.createElement('span')
    host.attachShadow({ mode: 'open' }).append(inner)
    document.body.append(outer)
    expect(zoomOf(inner)).toBe(ZOOM)
    expect(zoomOf(document.body)).toBe(ONE)
    outer.remove()
  })
})

describe('measureRow', () => {
  test('is the row height in its own pixels, and on screen with its zoom', () => {
    const outer = document.createElement('div')
    outer.style.setProperty('zoom', String(ZOOM))
    const row = document.createElement('div')
    row.style.setProperty('height', `${String(PITCH)}px`)
    outer.append(row)
    document.body.append(outer)
    expect(measureRow(row)).toEqual({ pitch: PITCH, screen: PITCH * ZOOM })
    outer.remove()
  })

  test('is nothing for a row with no height in pixels yet', () => {
    const row = document.createElement('div')
    document.body.append(row)
    row.style.setProperty('height', 'auto')
    expect(measureRow(row)).toBeUndefined()
    row.remove()
  })
})
