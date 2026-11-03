import { describe, expect, test } from 'bun:test'

import { CommandButtons } from './hub-buttons.js'

const ONCE = 1

/**
 * Buttons for one command, "save", that applies while `applies()` says so and notes each run
 * @param {() => boolean} applies - Whether it applies now
 * @returns {Readonly<{ buttons: CommandButtons, ran: readonly string[] }>} The buttons, and what ran
 */
function saving(applies) {
  /** @type {string[]} */
  const ran = []
  const buttons = new CommandButtons({
    applies,
    run: (id) => {
      ran.push(id)
      return true
    },
  })
  return { buttons, ran }
}

/**
 * A root holding one button for a command, and one plain element for it
 * @param {string} id - The command
 * @returns {Readonly<{ button: HTMLButtonElement, other: HTMLElement, root: HTMLElement }>} The root and its parts
 */
function rootFor(id) {
  const root = document.createElement('div')
  const button = document.createElement('button')
  const other = document.createElement('span')
  button.dataset['command'] = id
  other.dataset['command'] = id
  root.append(button, other)
  return { button, other, root }
}

describe('command buttons', () => {
  test('run their command when clicked', () => {
    const { buttons, ran } = saving(() => true)
    const { button, root } = rootFor('save')
    const stop = buttons.bind(root)
    button.click()
    stop()
    button.click()
    expect(ran).toEqual(['save'])
    expect(ran).toHaveLength(ONCE)
  })

  test('are disabled while their command does not apply, or aria-disabled if they cannot be', () => {
    let applies = false
    const { buttons } = saving(() => applies)
    const { button, other, root } = rootFor('save')
    buttons.bind(root)
    expect([button.disabled, other.hasAttribute('aria-disabled')]).toEqual([true, true])
    applies = true
    buttons.paint()
    expect([button.disabled, other.hasAttribute('aria-disabled')]).toEqual([false, false])
    buttons.stop()
  })
})
