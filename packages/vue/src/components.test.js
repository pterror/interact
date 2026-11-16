import { afterEach, describe, expect, test } from 'bun:test'

import { arraySource } from '@pterror/interact-core'
import { drawsAsTheDomRenderer, FRUIT, settled, violations } from '@pterror/interact-core/test-components'
import { createApp, createSSRApp, h, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'

import { dialog, Select } from './index.js'

/** @import { Mounting } from '@pterror/interact-core/test-components' */

const PickDialog = dialog(Select, ['content', 'trigger'])
const SELECT = { label: 'Fruit', placeholder: 'Choose a fruit', rows: 4, source: 'fruit' }
/** @type {readonly ('select' | 'dialog')[]} */
const KINDS = ['select', 'dialog']
/** @type {readonly ('app' | 'own')[]} */
const MODES = ['app', 'own']

afterEach(() => {
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
 * A container in the document
 * @returns {HTMLElement} It
 */
function containerIn() {
  const container = document.createElement('div')
  document.body.append(container)
  return container
}

/**
 * The app around a component, as the checks mount it
 * @param {Mounting} mounting - What to mount
 * @returns {import('vue').Component} The app's root component
 */
function appFor(mounting) {
  return {
    setup: () => {
      const value = ref(mounting.value)
      const open = ref(mounting.open)
      const { mode, naming, sources } = mounting
      return () => {
        const select = {
          ...SELECT,
          ...(mode === 'app' ? { modelValue: value.value } : { defaultValue: mounting.value }),
          'onUpdate:modelValue': (/** @type {unknown} */ next) => {
            mounting.changed('select', next)
            value.value = typeof next === 'string' ? next : null
          },
        }
        if (mounting.kind === 'select') {
          return h(Select, { ...select, naming, sources })
        }
        return h(PickDialog, {
          closeLabel: 'Close',
          ignoreOutside: false,
          content: select,
          naming,
          'onUpdate:open': (/** @type {boolean} */ next) => {
            mounting.changed('dialog', next)
            open.value = next
          },
          sources,
          title: 'Pick a fruit',
          ...(mode === 'app' ? { open: open.value } : { defaultOpen: mounting.open }),
        })
      }
    },
  }
}

const framework = {
  mount: (/** @type {Mounting} */ mounting) => {
    const app = createApp(appFor(mounting))
    app.mount(mounting.container)
    return () => {
      app.unmount()
    }
  },
  settle: settled,
}

describe('the Vue components', () => {
  for (const kind of KINDS) {
    for (const mode of MODES) {
      test(`the ${kind}, its value ${mode === 'app' ? "the app's" : 'its own'}, draws as the DOM renderer does`, async () => {
        await drawsAsTheDomRenderer(framework, kind, mode)
      })
    }
  }

  test('render on a server, and hydrate to the same DOM, which then runs', async () => {
    const sources = { fruit: arraySource(FRUIT) }
    const root = {
      render: () =>
        h(PickDialog, {
          closeLabel: 'Close',
          ignoreOutside: false,
          content: { ...SELECT, defaultValue: 'Banana' },
          defaultOpen: true,
          sources,
          title: 'Pick a fruit',
        }),
    }
    const html = await renderToString(createSSRApp(root))
    expect(html).toContain('role="dialog"')
    expect(html).toContain('>Banana</div>')
    const container = containerIn()
    container.innerHTML = html
    const trigger = container.querySelector('[role=combobox]')
    const id = trigger?.id ?? ''
    /** @type {unknown[]} */
    const warned = []
    const original = console.warn
    console.warn = (/** @type {readonly unknown[]} */ ...args) => {
      warned.push(args)
    }
    const app = createSSRApp(root)
    app.mount(container)
    console.warn = original
    await settled()
    expect(warned).toEqual([])
    expect(container.querySelector('[role=combobox]')).toBe(trigger)
    expect(document.activeElement?.id).toBe(id)
    press(trigger, 'ArrowDown')
    await settled()
    expect(trigger?.getAttribute('aria-activedescendant')).toBe(id.replace(/trigger$/u, 'list-option-Banana'))
    expect(await violations(container)).toEqual([])
    app.unmount()
  })

  test('draw the item by the default slot and a part the app replaces by its slot, and run it', async () => {
    const container = containerIn()
    /** @type {unknown[]} */
    const heard = []
    const app = createApp({
      render: () =>
        h(
          Select,
          {
            ...SELECT,
            'onUpdate:modelValue': (/** @type {unknown} */ value) => {
              heard.push(value)
            },
            sources: { fruit: arraySource(FRUIT) },
          },
          {
            default: (/** @type {Readonly<{ item: string }>} */ { item }) => h('b', item),
            list: (/** @type {import('./interact.js').PartSlot} */ { attrs, content }) => h('ul', attrs, h(content)),
            option: (/** @type {import('./interact.js').PartSlot} */ { attrs, content, part }) =>
              h('li', { ...attrs, 'data-key': part.item }, h(content)),
          },
        ),
    })
    app.mount(container)
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
    app.unmount()
  })

  test.each([true, false])('undo a change the app refuses, the value its own: %p', async (own) => {
    const container = containerIn()
    const app = createApp({
      render: () =>
        h(Select, {
          ...SELECT,
          ...(own ? {} : { modelValue: 'Apple' }),
          'onUpdate:modelValue': (
            /** @type {unknown} */ _value,
            /** @type {import('./interact.js').Change} */ change,
          ) => {
            setTimeout(change.refuse, 20)
          },
          sources: { fruit: arraySource(FRUIT) },
        }),
    })
    app.mount(container)
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
    app.unmount()
  })
})
