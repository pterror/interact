import { afterEach, describe, expect, test } from 'bun:test'

import { arraySource } from '@pterror/interact-core'
import { drawsAsTheDomRenderer, FRUIT, settled, violations } from '@pterror/interact-core/test-components'
import Ajv from 'ajv'

import { DialogElement, register, SelectElement } from './index.js'

/** @import { Mounting } from '@pterror/interact-core/test-components' */

/** @type {readonly ('select' | 'dialog')[]} */
const KINDS = ['select', 'dialog']
/** @type {readonly ('app' | 'own')[]} */
const MODES = ['app', 'own']
const MANIFEST = new URL('../custom-elements.json', import.meta.url).pathname
const SCHEMA = new URL(import.meta.resolve('custom-elements-manifest/schema.json')).pathname

register()

afterEach(() => {
  document.body.replaceChildren()
})

/**
 * The value a change event carries
 * @param {CustomEvent} event - The event
 * @returns {unknown} Its value
 */
function valueOf(event) {
  /** @type {unknown} */
  const detail = event.detail
  return typeof detail === 'object' && detail !== null && 'value' in detail ? detail.value : undefined
}

/**
 * A select element over the fruit, as the checks mount it
 * @param {Mounting} mounting - What to mount
 * @returns {HTMLElement} The element
 */
function selectFor(mounting) {
  const select = document.createElement('interact-select')
  select.setAttribute('label', 'Fruit')
  select.setAttribute('placeholder', 'Choose a fruit')
  select.setAttribute('rows', '4')
  select.setAttribute('source', 'fruit')
  if (mounting.value !== null) {
    select.setAttribute('value', String(mounting.value))
  }
  Object.assign(select, { naming: mounting.naming, sources: mounting.sources })
  select.addEventListener('change', (event) => {
    if (event instanceof CustomEvent && event.target === select) {
      mounting.changed('select', valueOf(event))
    }
  })
  return select
}

const framework = {
  mount: (/** @type {Mounting} */ mounting) => {
    const select = selectFor(mounting)
    if (mounting.kind === 'select') {
      mounting.container.append(select)
      return () => {
        select.remove()
      }
    }
    const dialog = document.createElement('interact-dialog')
    dialog.setAttribute('title', 'Pick a fruit')
    dialog.setAttribute('close-label', 'Close')
    dialog.setAttribute('initial-focus', 'content trigger')
    dialog.toggleAttribute('open', mounting.open)
    Object.assign(dialog, { naming: mounting.naming, sources: mounting.sources })
    dialog.addEventListener('change', (event) => {
      if (event instanceof CustomEvent && event.target === dialog) {
        mounting.changed('dialog', valueOf(event))
      }
    })
    dialog.append(select)
    mounting.container.append(dialog)
    return () => {
      dialog.remove()
    }
  },
  settle: settled,
  within: (/** @type {HTMLElement} */ container) => {
    const host = container.firstElementChild
    if (host?.shadowRoot === null || host?.shadowRoot === undefined) {
      throw new TypeError('No shadow root')
    }
    return host.shadowRoot
  },
}

describe('the custom elements', () => {
  for (const kind of KINDS) {
    for (const mode of MODES) {
      test(`the ${kind}, its value ${mode === 'app' ? "the app's" : 'its own'}, draws as the DOM renderer does`, async () => {
        await drawsAsTheDomRenderer(framework, kind, mode)
      })
    }
  }

  test('are classes of their tags, name their parts and states, and slot their text', async () => {
    expect([customElements.get('interact-select'), customElements.get('interact-dialog')]).toEqual([
      SelectElement,
      DialogElement,
    ])
    const container = document.createElement('div')
    document.body.append(container)
    const dialog = document.createElement('interact-dialog')
    dialog.setAttribute('title', 'Pick a fruit')
    dialog.setAttribute('close-label', 'Close')
    dialog.setAttribute('initial-focus', 'content trigger')
    dialog.toggleAttribute('open', true)
    Object.assign(dialog, { sources: { fruit: arraySource(FRUIT) } })
    const select = selectFor({
      changed: () => undefined,
      container,
      kind: 'select',
      mode: 'own',
      naming: { id: 'w', keyId: String },
      open: true,
      sources: { fruit: arraySource(FRUIT) },
      value: 'Banana',
    })
    /** @type {unknown[]} */
    const changes = []
    select.addEventListener('change', (event) => {
      if (event instanceof CustomEvent) {
        changes.push(valueOf(event))
      }
    })
    dialog.append(select)
    container.append(dialog)
    await settled()
    const root = dialog.shadowRoot
    const trigger = root?.querySelector('[role=combobox]')
    expect(trigger?.getAttribute('part')).toBe('trigger')
    expect(root?.querySelector('[role=dialog]')?.getAttribute('part')).toBe('root')
    expect(root?.querySelector('slot[name=close]')?.textContent).toBe('Close')
    trigger?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowDown' }))
    await settled()
    expect(trigger?.getAttribute('part')).toBe('trigger expanded')
    expect(root?.querySelector('[data-active]')?.getAttribute('part')).toBe('option selected active')
    expect(await violations(container)).toEqual([])
    trigger?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowDown' }))
    trigger?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }))
    await settled()
    expect([changes, Reflect.get(select, 'value'), trigger?.textContent]).toEqual([['Cherry'], 'Cherry', 'Cherry'])
  })

  test('refuse a change whose event is cancelled', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    const select = selectFor({
      changed: () => undefined,
      container,
      kind: 'select',
      mode: 'own',
      naming: { id: 'w', keyId: String },
      open: true,
      sources: { fruit: arraySource(FRUIT) },
      value: 'Apple',
    })
    select.addEventListener('change', (event) => {
      event.preventDefault()
    })
    container.append(select)
    await settled()
    const trigger = select.shadowRoot?.querySelector('[role=combobox]')
    trigger?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowDown' }))
    await settled()
    trigger?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowDown' }))
    trigger?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }))
    await settled()
    expect([Reflect.get(select, 'value'), trigger?.textContent]).toEqual(['Apple', 'Apple'])
  })

  test('are described by a Custom Elements Manifest valid against its schema', async () => {
    /** @type {unknown} */
    const manifest = await Bun.file(MANIFEST).json()
    /** @type {unknown} */
    const schema = await Bun.file(SCHEMA).json()
    if (typeof schema !== 'object' || schema === null) {
      throw new TypeError('No schema')
    }
    const validate = new Ajv({ allErrors: true, strict: false }).compile(schema)
    expect([validate(manifest), validate.errors ?? []]).toEqual([true, []])
  })
})
