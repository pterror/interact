import { afterEach, describe, expect, test } from 'bun:test'

import { arraySource } from '@pterror/interact-core'
import { drawsAsTheDomRenderer, FRUIT, settled, violations } from '@pterror/interact-core/test-components'
import { createComponent, createRoot, createSignal, mergeProps, splitProps } from 'solid-js'
import { Dynamic, hydrate, insert } from 'solid-js/web'

import { dialog, Select } from './index.js'

/** @import { Mounting } from '@pterror/interact-core/test-components' */
/** @import { JSX } from 'solid-js' */

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
 * Draws a Solid tree into a container
 * @param {HTMLElement} container - The container
 * @param {() => JSX.Element} code - What to draw
 * @returns {() => void} Taking it down
 */
function drawIn(container, code) {
  return createRoot((dispose) => {
    insert(container, code())
    return dispose
  })
}

/**
 * The app around a component, as the checks mount it
 * @param {Mounting} mounting - What to mount
 * @returns {JSX.Element} The component
 */
function app(mounting) {
  const [value, setValue] = createSignal(mounting.value)
  const [open, setOpen] = createSignal(mounting.open)
  const { mode, naming, sources } = mounting
  const select = mergeProps(
    SELECT,
    mode === 'app'
      ? {
          get value() {
            return value()
          },
        }
      : { defaultValue: mounting.value },
    {
      onChange: (/** @type {unknown} */ next) => {
        mounting.changed('select', next)
        setValue(typeof next === 'string' ? next : null)
      },
    },
  )
  if (mounting.kind === 'select') {
    return createComponent(Select, mergeProps(select, { naming, sources }))
  }
  return createComponent(
    PickDialog,
    mergeProps(
      {
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
      },
      mode === 'app'
        ? {
            get open() {
              return open()
            },
          }
        : { defaultOpen: mounting.open },
    ),
  )
}

const solid = {
  mount: (/** @type {Mounting} */ mounting) => drawIn(mounting.container, () => app(mounting)),
  settle: settled,
}

describe('the Solid components', () => {
  for (const kind of KINDS) {
    for (const mode of MODES) {
      test(`the ${kind}, its value ${mode === 'app' ? "the app's" : 'its own'}, draws as the DOM renderer does`, async () => {
        await drawsAsTheDomRenderer(solid, kind, mode)
      })
    }
  }

  test('hydrate what a server rendered, with ids from createUniqueId, to the same DOM, which then runs', async () => {
    const server = Bun.spawn(
      [process.execPath, '--conditions', 'node', new URL('test-server.js', import.meta.url).pathname],
      {
        stderr: 'inherit',
        stdout: 'pipe',
      },
    )
    const html = await new Response(server.stdout).text()
    await server.exited
    expect(html).toContain('role="dialog"')
    expect(html).toContain('>Banana</div>')
    const container = containerIn()
    container.innerHTML = html
    const trigger = container.querySelector('[role=combobox]')
    const id = trigger?.id ?? ''
    Object.assign(globalThis, { _$HY: { completed: new WeakSet(), events: [], fe: () => undefined, r: {} } })
    const stop = hydrate(
      () =>
        createComponent(PickDialog, {
          closeLabel: 'Close',
          ignoreOutside: false,
          content: { ...SELECT, defaultValue: 'Banana' },
          defaultOpen: true,
          sources: { fruit: arraySource(FRUIT) },
          title: 'Pick a fruit',
        }),
      container,
    )
    await settled()
    expect(container.querySelector('[role=combobox]')).toBe(trigger)
    expect(container.querySelectorAll('[role=combobox]').length).toBe(1)
    expect(document.activeElement?.id).toBe(id)
    press(trigger, 'ArrowDown')
    await settled()
    expect(trigger?.getAttribute('aria-activedescendant')).toBe(id.replace(/trigger$/u, 'list-option-Banana'))
    expect(await violations(container)).toEqual([])
    stop()
  })

  test('draw a part the app replaces with the attributes and contents it is given, and run it', async () => {
    const container = containerIn()
    /** @type {unknown[]} */
    const heard = []
    const stop = drawIn(container, () =>
      createComponent(Select, {
        ...SELECT,
        item: (key) => {
          const bold = document.createElement('b')
          bold.textContent = String(key)
          return bold
        },
        onChange: (value) => {
          heard.push(value)
        },
        parts: {
          list: (part) => createComponent(Dynamic, mergeProps(splitProps(part, ['part'])[1], { component: 'ul' })),
          option: (part) => {
            const [own, rest] = splitProps(part, ['part'])
            return createComponent(Dynamic, mergeProps(rest, { component: 'li', 'data-key': own.part.item }))
          },
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
    stop()
  })

  test.each([true, false])('undo a change the app refuses, the value its own: %p', async (own) => {
    const container = containerIn()
    const stop = drawIn(container, () =>
      createComponent(Select, {
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
    stop()
  })
})
