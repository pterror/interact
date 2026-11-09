import { describe, expect, test } from 'bun:test'

import { keybinds } from './keybinds.js'
import { kbd } from './test-keys.js'

describe('key pairs', () => {
  test('give a position from -1 to 1, held through Shift, and losing focus lets go of them', () => {
    const target = document.createElement('div')
    const strafe = { axes: ['keys:a/d'] }
    const kb = keybinds([strafe], { target })
    const position = () => kb.axis(strafe).position
    const at = [position()]
    target.dispatchEvent(kbd('keydown', { code: 'KeyD', key: 'd' }))
    at.push(position())
    target.dispatchEvent(kbd('keydown', { code: 'KeyA', key: 'A', shiftKey: true }))
    at.push(position())
    target.dispatchEvent(kbd('keyup', { code: 'KeyD', key: 'd' }))
    at.push(position())
    globalThis.dispatchEvent(new Event('blur'))
    at.push(position())
    kb()
    expect(at).toEqual([0, 1, 0, -1, 0])
  })

  test("follow the layout: a key is held by what it types, and doesn't run the page's bindings twice", () => {
    const target = document.createElement('div')
    const strafe = { axes: ['keys:a/d'] }
    let runs = 0
    const kb = keybinds(
      [
        {
          keys: ['d'],
          run: () => {
            runs += 1
          },
        },
        strafe,
      ],
      { target },
    )
    target.dispatchEvent(kbd('keydown', { code: 'KeyQ', key: 'a' }))
    target.dispatchEvent(kbd('keydown', { code: 'KeyD', key: 'd' }))
    expect([kb.axis(strafe).position, runs]).toEqual([0, 1])
    target.dispatchEvent(kbd('keyup', { code: 'KeyD', key: 'd' }))
    expect(kb.axis(strafe).position).toBe(-1)
    kb()
  })
})
