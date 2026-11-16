import { afterEach, describe, expect, test } from 'bun:test'

import { arraySource, select } from '@pterror/interact-core'
import axe from 'axe-core'
import { createComponent, createRoot, createSignal, mergeProps, splitProps } from 'solid-js'
import { Dynamic, insert } from 'solid-js/web'

import { Interact } from './interact.js'

/** @import { Key, Out } from '@pterror/interact-core' */

const FRUIT = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry', 'Fig']

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

/**
 * The value before anything is chosen
 * @returns {Key | null} No value
 */
function nothingChosen() {
  return null
}

/**
 * Lets the source's answers, which come a microtask later, arrive
 * @returns {Promise<void>} When they have
 */
async function settled() {
  await Bun.sleep(0)
}

describe('Interact', () => {
  test('draws a select from its view, takes its value from a signal, and draws an option the app made itself', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    /** @type {Out[]} */
    const heard = []
    let made = 0
    const [value, setValue] = createSignal(nothingChosen())
    cleanup.push(
      createRoot((dispose) => {
        insert(
          container,
          createComponent(Interact, {
            effect: (out) => {
              heard.push(out)
              const { effect } = out
              if (
                typeof effect === 'object' &&
                effect !== null &&
                'type' in effect &&
                effect.type === 'change' &&
                'value' in effect
              ) {
                setValue(typeof effect.value === 'string' ? effect.value : null)
              }
            },
            parts: {
              option: (part) => {
                made += 1
                const [own, rest] = splitProps(part, ['children', 'part'])
                return createComponent(
                  Dynamic,
                  mergeProps(rest, {
                    get children() {
                      return [rest['aria-selected'] === 'true' ? '✓ ' : '', own.children]
                    },
                    component: 'div',
                  }),
                )
              },
            },
            get props() {
              return { label: 'Fruit', placeholder: 'Choose', rows: 4, source: 'fruit', value: { value: value() } }
            },
            sources: { fruit: arraySource(FRUIT) },
            widget: select,
          }),
        )
        return dispose
      }),
    )
    const trigger = container.querySelector('[role=combobox]')
    expect(trigger?.textContent).toBe('Choose')
    press(trigger, 'ArrowDown')
    await settled()
    press(trigger, 'ArrowDown')
    press(trigger, 'ArrowDown')
    const options = [...container.querySelectorAll('[role=option]')]
    expect(options.map((option) => option.textContent)).toEqual(['Apple', 'Banana', 'Cherry', 'Date'])
    expect(made).toBe(4)
    const id = trigger?.id ?? ''
    expect(trigger?.getAttribute('aria-activedescendant')).toBe(id.replace(/-trigger$/u, '-list-option-Banana'))
    press(trigger, 'Enter')
    expect(heard.map((out) => out.effect)).toEqual([{ id: 1, type: 'change', value: 'Banana' }])
    expect([trigger?.textContent, value()]).toEqual(['Banana', 'Banana'])
    expect(container.querySelector('[role=listbox]')?.hasAttribute('hidden')).toBe(true)
    press(trigger, 'ArrowDown')
    await settled()
    expect(container.querySelector('[aria-selected=true]')?.textContent).toBe('✓ Banana')
    expect([[...container.querySelectorAll('[role=option]')], made]).toEqual([options, 4])
    setValue('Fig')
    expect(trigger?.textContent).toBe('Fig')
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })
    expect(result.violations.map((one) => one.id)).toEqual([])
  })
})
