import { describe, expect, test } from 'bun:test'

import { keybinds } from './keybinds.js'

const LOOK_RIGHT = 5
const LOOK_RIGHT_MORE = 3
const LOOK_DOWN = 2
const LOOK_DOWN_MORE = 1

describe('mouse movement', () => {
  test('is a delta since each axis was last read', () => {
    const target = document.createElement('div')
    const look = { axes: ['mouse:x'] }
    const pitch = { axes: ['-mouse:y'] }
    const kb = keybinds([look, pitch], { target })
    target.dispatchEvent(new MouseEvent('mousemove', { movementX: LOOK_RIGHT, movementY: LOOK_DOWN }))
    target.dispatchEvent(new MouseEvent('mousemove', { movementX: LOOK_RIGHT_MORE, movementY: LOOK_DOWN_MORE }))
    expect([kb.axis(look), kb.axis(look).delta, kb.axis(pitch).delta]).toEqual([{ delta: 8, position: 0 }, 0, -3])
    kb()
  })

  test("isn't kept for an axis whose when is false, nor read while an overlay holds focus", () => {
    const target = document.createElement('div')
    let on = false
    const look = { axes: ['mouse:x'], when: () => on }
    const kb = keybinds([look], { target })
    target.dispatchEvent(new MouseEvent('mousemove', { movementX: LOOK_RIGHT }))
    const off = kb.axis(look).delta
    on = true
    const kept = kb.axis(look).delta
    const dialog = document.createElement('dialog')
    const field = document.createElement('input')
    dialog.append(field)
    document.body.append(dialog)
    dialog.setAttribute('open', '')
    field.focus()
    target.dispatchEvent(new MouseEvent('mousemove', { movementX: LOOK_RIGHT }))
    const overlaid = kb.axis(look).delta
    dialog.remove()
    kb()
    expect([off, kept, overlaid]).toEqual([0, 0, 0])
  })

  test('reads only an axis given to keybinds()', () => {
    const kb = keybinds([])
    expect(() => kb.axis({ axes: ['mouse:x'] })).toThrow('Not an axis given to this keybinds(): mouse:x')
  })
})
