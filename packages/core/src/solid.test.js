import { afterEach, describe, expect, test } from 'bun:test'

import axe from 'axe-core'
import { createComponent, createRenderEffect, createRoot, createSignal } from 'solid-js'
import { insert } from 'solid-js/web'

import { select } from './select.js'
import { Interact } from './solid.js'

/** @import { Out } from './compose.js' */
/** @import { Host } from './host.js' */
/** @import { SelectProps } from './select.js' */

const FRUIT = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry', 'Fig']

/**
 * Answers asks from `FRUIT` at once, and keeps every other effect for the test
 * @param {(out: Out) => void} keep - Where the other effects go
 * @returns {(out: Out, host: Host) => void} The app's effect handler
 */
function answering(keep) {
  return (out, running) => {
    const { effect } = out
    if (typeof effect === 'object' && effect !== null && 'type' in effect && effect.type === 'ask' && 'id' in effect) {
      const [from, to] = 'ranks' in effect && Array.isArray(effect.ranks) ? effect.ranks.map(Number) : [0, FRUIT.length]
      running.dispatch(out.from, {
        count: FRUIT.length,
        from,
        id: effect.id,
        keys: FRUIT.slice(from, to),
        type: 'answer',
      })
    } else {
      keep(out)
    }
  }
}

/** @type {(() => void)[]} */
const cleanup = []
afterEach(() => {
  for (const stop of cleanup.splice(0)) {
    stop()
  }
  document.body.replaceChildren()
})

/**
 * Presses a key on an element
 * @param {Element | null} element - The element
 * @param {string} key - The key value
 * @returns {void}
 */
function press(element, key) {
  element?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }))
}

describe('the Solid renderer', () => {
  test('draws the select from its view, follows props, and draws an option the app made itself', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    /** @type {Out[]} */
    const heard = []
    let made = 0
    /** @type {SelectProps} */
    const first = { label: 'Fruit', placeholder: 'Choose', revision: 0, rows: 4, value: null }
    const [props, setProps] = createSignal(first)
    cleanup.push(
      createRoot((dispose) => {
        insert(
          container,
          createComponent(Interact, {
            announce: () => '',
            effect: answering((out) => {
              heard.push(out)
              if (typeof out.effect === 'object' && out.effect !== null && 'value' in out.effect) {
                const { value } = out.effect
                setProps((last) => ({ ...last, value: typeof value === 'string' ? value : null }))
              }
            }),
            item: String,
            naming: { id: 's', keyId: String },
            parts: {
              'list.option': (node) => {
                made += 1
                const element = document.createElement('div')
                const mark = document.createElement('span')
                const slot = document.createElement('span')
                createRenderEffect(() => {
                  mark.textContent = node().aria['selected'] === true ? '✓ ' : ''
                })
                element.append(mark, slot)
                return { element, slot }
              },
            },
            get props() {
              return props()
            },
            widget: select,
          }),
        )
        return dispose
      }),
    )
    const trigger = container.querySelector('[role=combobox]')
    expect(trigger?.textContent).toBe('Choose')
    press(trigger, 'ArrowDown')
    press(trigger, 'ArrowDown')
    press(trigger, 'ArrowDown')
    const options = [...container.querySelectorAll('[role=option]')]
    expect(options.map((option) => option.textContent)).toEqual(['Apple', 'Banana', 'Cherry', 'Date'])
    expect(made).toBe(4)
    expect(trigger?.getAttribute('aria-activedescendant')).toBe('s-list-option-Banana')
    press(trigger, 'Enter')
    expect(heard.map((out) => out.effect)).toEqual([{ type: 'change', value: 'Banana' }])
    expect(trigger?.textContent).toBe('Banana')
    expect(container.querySelector('[role=listbox]')?.hasAttribute('hidden')).toBe(true)
    press(trigger, 'ArrowDown')
    expect(container.querySelector('#s-list-option-Banana')?.textContent).toBe('✓ Banana')
    expect([[...container.querySelectorAll('[role=option]')], made]).toEqual([options, 4])
    setProps({ label: 'Fruit', placeholder: 'Choose', revision: 0, rows: 4, value: 'Fig' })
    expect(trigger?.textContent).toBe('Fig')
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })
    expect(result.violations.map((one) => one.id)).toEqual([])
  })
})
