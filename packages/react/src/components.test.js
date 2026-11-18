import { afterEach, describe, expect, test } from 'bun:test'

import { arraySource } from '@pterror/interact-core'
import {
  collectionOf,
  drawsAsTheDomRenderer,
  FRUIT,
  settled,
  takesItemsInAForm,
  violations,
} from '@pterror/interact-core/test-components'
import { createElement, StrictMode, useState } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'

import { dialog, Select } from './index.js'

/** @import { Mounting } from '@pterror/interact-core/test-components' */

const PickDialog = dialog(Select, ['content', 'trigger'])
/** @type {readonly ('select' | 'dialog')[]} */
const KINDS = ['select', 'dialog']
/** @type {readonly ('app' | 'own')[]} */
const MODES = ['app', 'own']
const SELECT = { disabled: false, label: 'Fruit', placeholder: 'Choose a fruit', rows: 4, source: 'fruit' }

afterEach(() => {
  document.body.replaceChildren()
})

/**
 * The app around a component, as the checks mount it
 * @param {Readonly<{ mounting: Mounting }>} props - What to mount
 * @returns {import('react').ReactElement} The component
 */
function App({ mounting }) {
  const [value, setValue] = useState(mounting.value)
  const [open, setOpen] = useState(mounting.open)
  const { mode, naming, sources } = mounting
  const select = {
    ...SELECT,
    ...(mode === 'app' ? { value } : { defaultValue: mounting.value }),
    onChange: (/** @type {unknown} */ next) => {
      mounting.changed('select', next)
      setValue(typeof next === 'string' ? next : null)
    },
  }
  if (mounting.kind === 'select') {
    return createElement(Select, { ...select, naming, ...collectionOf(mounting) })
  }
  return createElement(PickDialog, {
    closeLabel: 'Close',
    ignoreOutside: false,
    content: select,
    naming,
    onOpenChange: (/** @type {boolean} */ next) => {
      mounting.changed('dialog', next)
      setOpen(next)
    },
    sources,
    title: 'Pick a fruit',
    ...(mode === 'app' ? { open } : { defaultOpen: mounting.open }),
  })
}

const react = {
  mount: (/** @type {Mounting} */ mounting) => {
    const root = createRoot(mounting.container)
    root.render(createElement(StrictMode, null, createElement(App, { mounting })))
    return () => {
      root.unmount()
    }
  },
  settle: settled,
}

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
 * A container in the document
 * @returns {HTMLElement} It
 */
function containerIn() {
  const container = document.createElement('div')
  document.body.append(container)
  return container
}

describe('the React components', () => {
  for (const kind of KINDS) {
    for (const mode of MODES) {
      test(`the ${kind}, its value the ${mode === 'app' ? "app's" : 'own'}, draws as the DOM renderer does`, async () => {
        await drawsAsTheDomRenderer(react, kind, mode)
      })
    }
  }

  test('the select takes its items in place of a source, and is a field of its form', async () => {
    await takesItemsInAForm(react, true)
  })

  test('render on a server with ids from useId, and hydrate to the same DOM, which then runs', async () => {
    const sources = { fruit: arraySource(FRUIT) }
    const element = createElement(PickDialog, {
      closeLabel: 'Close',
      ignoreOutside: false,
      content: { ...SELECT, defaultValue: 'Banana' },
      defaultOpen: true,
      outside: { label: 'fruit-label' },
      sources,
      title: 'Pick a fruit',
    })
    const html = renderToString(element)
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-labelledby="fruit-label"')
    expect(html).toContain('>Banana</div>')
    const container = containerIn()
    container.innerHTML = html
    const trigger = container.querySelector('[role=combobox]')
    const id = trigger?.id ?? ''
    expect(trigger?.getAttribute('aria-controls')).toBe(container.querySelector('[role=listbox]')?.id)
    /** @type {unknown[]} */
    const errors = []
    const root = hydrateRoot(container, element, {
      onRecoverableError: (error) => {
        errors.push(error)
      },
    })
    await Bun.sleep(50)
    expect(errors).toEqual([])
    expect(container.querySelector('[role=combobox]')).toBe(trigger)
    expect(document.activeElement?.id).toBe(id)
    press(trigger, 'ArrowDown')
    await settled()
    expect(trigger?.getAttribute('aria-activedescendant')).toBe(
      [...container.querySelectorAll('[role=option]')].find((option) => option.textContent === 'Banana')?.id,
    )
    expect(await violations(container)).toEqual([])
    root.unmount()
  })

  test('draw a part the app replaces with the attributes and contents it is given, and run it', async () => {
    const container = containerIn()
    /** @type {unknown[]} */
    const heard = []
    const root = createRoot(container)
    root.render(
      createElement(Select, {
        ...SELECT,
        item: (key) => createElement('b', null, String(key)),
        onChange: (value) => {
          heard.push(value)
        },
        parts: {
          list: (props) => createElement('ul', props),
          option: ({ part, ...props }) => createElement('li', { ...props, 'data-key': part.item }),
        },
        sources: { fruit: arraySource(FRUIT) },
      }),
    )
    await settled()
    const trigger = container.querySelector('[role=combobox]')
    press(trigger, 'ArrowDown')
    await settled()
    const options = [...container.querySelectorAll('ul[role=listbox] > li[role=option]')].filter(
      (option) => option instanceof HTMLElement,
    )
    expect(options.map((option) => [option.dataset['key'], option.innerHTML])).toEqual([
      ['Apple', '<b>Apple</b>'],
      ['Banana', '<b>Banana</b>'],
      ['Cherry', '<b>Cherry</b>'],
      ['Date', '<b>Date</b>'],
    ])
    expect(await violations(container)).toEqual([])
    options[2]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await settled()
    expect([heard, trigger?.textContent]).toEqual([['Cherry'], 'Cherry'])
    root.unmount()
  })

  test.each([true, false])('undo a change the app refuses, the value its own: %p', async (own) => {
    {
      const container = containerIn()
      const root = createRoot(container)
      root.render(
        createElement(Select, {
          ...SELECT,
          ...(own ? {} : { value: 'Apple' }),
          onChange: (_value, change) => {
            setTimeout(change.refuse, 20)
          },
          sources: { fruit: arraySource(FRUIT) },
        }),
      )
      await settled()
      const trigger = container.querySelector('[role=combobox]')
      press(trigger, 'ArrowDown')
      await settled()
      press(trigger, 'ArrowDown')
      press(trigger, 'ArrowDown')
      press(trigger, 'Enter')
      await settled()
      expect(trigger?.textContent).toBe('Cherry')
      await Bun.sleep(40)
      expect(trigger?.textContent).toBe(own ? 'Choose a fruit' : 'Apple')
      root.unmount()
    }
  })
})
