import { afterEach, describe, expect, spyOn, test } from 'bun:test'

import axe from 'axe-core'

import { isRecord } from './compose.js'
import { dialog } from './dialog.js'
import { renderDom } from './dom.js'
import { menu } from './menu.js'
import { reorderList } from './reorder.js'
import { select } from './select.js'
import { idOf } from './web.js'

/** @import { AnyWidget, Node as Part, Out } from './compose.js' */
/** @import { Host } from './host.js' */

const FRUIT = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry', 'Fig']
const NAMING = { id: 'w', keyId: String }

/**
 * Answers every ask at once from a collection in memory; everything else the app hears is kept
 * @param {readonly string[]} all - The collection
 * @param {(out: Out) => void} keep - Where the app's other effects go
 * @returns {(out: Out, host: Host) => void} The app's effect handler
 */
function answerFrom(all, keep) {
  return (out, running) => {
    const { effect } = out
    if (typeof effect === 'object' && effect !== null && 'type' in effect && effect.type === 'ask' && 'id' in effect) {
      const [from, to] = 'ranks' in effect && Array.isArray(effect.ranks) ? effect.ranks.map(Number) : [0, all.length]
      const keys = all.slice(from, to)
      running.dispatch(out.from, { count: all.length, from, id: effect.id, keys, type: 'answer' })
    } else {
      keep(out)
    }
  }
}

/**
 * Draws a widget into a fresh container in the document
 * @param {AnyWidget} widget - The widget
 * @param {unknown} props - Its props
 * @returns {Readonly<{ container: HTMLElement, host: Host, stop: () => void, heard: readonly Out[] }>} The container,
 *   the running widget, and the effects the app heard
 */
function draw(widget, props) {
  /** @type {Out[]} */
  const heard = []
  const container = document.createElement('div')
  document.body.append(container)
  const rendered = renderDom({
    announce: (message) => `${text(message['item'])} ${text(message['what'])}`,
    container,
    effect: answerFrom(FRUIT, (out) => {
      heard.push(out)
    }),
    item: String,
    naming: NAMING,
    parts: {},
    props,
    widget,
  })
  return { container, heard, ...rendered }
}

/**
 * A message field as text
 * @param {unknown} value - The field
 * @returns {string} Its text
 */
function text(value) {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

/**
 * The element drawn for a part
 * @param {Part['target']} target - The part
 * @returns {Element | null} Its element
 */
function elementOf(target) {
  return document.querySelector(`[id="${idOf(target, NAMING)}"]`)
}

/**
 * Every part in a tree, as drawn
 * @param {Part} node - The root
 * @returns {Part[]} The parts, root first
 */
function partsOf(node) {
  return [node, ...node.content.flatMap((content) => ('target' in content ? partsOf(content) : []))]
}

/**
 * An event of a type, as the browser would make it, doing as little as such an event can
 * @param {string} type - The type
 * @returns {Event} The event
 */
function eventOf(type) {
  if (type === 'keydown') {
    return new KeyboardEvent(type, { bubbles: true, key: 'Unidentified' })
  }
  if (type.startsWith('pointer')) {
    return new PointerEvent(type, { bubbles: true, pointerId: 9 })
  }
  if (type === 'click' || type === 'mousedown' || type === 'dblclick') {
    return new MouseEvent(type, { bubbles: true })
  }
  return new FocusEvent(type)
}

/**
 * Presses a key on an element
 * @param {Element} element - The element
 * @param {string} key - The key value
 * @param {Readonly<KeyboardEventInit>} more - Modifiers
 * @returns {KeyboardEvent} The event, after dispatch
 */
function press(element, key, more = {}) {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key, ...more })
  element.dispatchEvent(event)
  return event
}

/**
 * The accessibility violations axe finds in an element
 * @param {Element} element - The element
 * @returns {Promise<string[]>} Each violation's id and the elements it is on
 */
async function violations(element) {
  const result = await axe.run(element, { rules: { 'color-contrast': { enabled: false } } })
  return result.violations.map((one) => `${one.id}: ${one.nodes.map((node) => node.html).join(', ')}`)
}

/** @type {(() => void)[]} */
const cleanup = []
afterEach(() => {
  for (const stop of cleanup.splice(0)) {
    stop()
  }
  document.body.replaceChildren()
})

const SELECT = { label: 'Fruit', placeholder: 'Choose a fruit', revision: 0, rows: 4 }

describe('the DOM renderer', () => {
  test('gives every part the attributes its view means, and a listener for each input it takes', () => {
    const { container, host, stop } = draw(select, SELECT)
    cleanup.push(stop)
    const trigger = container.querySelector('[role=combobox]')
    if (!(trigger instanceof HTMLElement)) {
      throw new TypeError('No trigger')
    }
    trigger.click()
    press(trigger, 'ArrowDown')
    const parts = partsOf(host.tree())
    expect(parts.length).toBe(7)
    for (const part of parts) {
      const element = elementOf(part.target)
      if (element === null) {
        throw new TypeError(`No element for ${idOf(part.target, NAMING)}`)
      }
      expect(element.getAttribute('role') ?? (element.tagName === 'BUTTON' ? 'button' : null)).toBe(part.role)
      for (const [name, value] of Object.entries(part.aria)) {
        const wanted =
          value === null
            ? null
            : typeof value === 'object'
              ? ('owner' in value ? [value] : value).map((target) => idOf(target, NAMING)).join(' ')
              : String(value)
        expect([name, element.getAttribute(`aria-${name}`)]).toEqual([name, wanted])
      }
      for (const [name, value] of Object.entries(part.data)) {
        expect([name, element.getAttribute(`data-${name}`)]).toEqual([
          name,
          value === true ? '' : typeof value === 'string' ? value : null,
        ])
      }
      expect([element.hasAttribute('hidden'), element.getAttribute('tabindex')]).toEqual([
        part.hidden,
        part.tabindex === null ? null : String(part.tabindex),
      ])
    }
    expect(trigger.getAttribute('aria-activedescendant')).toBe('w-list-option-Apple')
    expect(document.querySelector('#w-list-option-Apple[data-active=""]')).not.toBeNull()
    expect(trigger.getAttribute('aria-controls')).toBe('w-list-root')
    const dispatched = spyOn(host, 'dispatch')
    for (const part of parts) {
      const element = elementOf(part.target)
      for (const type of [...part.listens, 'dblclick']) {
        dispatched.mockClear()
        element?.dispatchEvent(eventOf(type))
        /** @type {unknown[]} */
        const calls = []
        for (const [owner, input] of dispatched.mock.calls) {
          calls.push([owner, isRecord(input) ? [input['part'], input['item']] : null])
        }
        expect([type, calls]).toEqual([
          type,
          part.listens.includes(type) ? [[part.target.owner, [part.target.part, part.target.item]]] : [],
        ])
      }
    }
  })

  test('runs the select: keys on the trigger, a click on an option, and change to the app', () => {
    const { container, heard, stop } = draw(select, SELECT)
    cleanup.push(stop)
    const trigger = container.querySelector('[role=combobox]')
    if (!(trigger instanceof HTMLElement)) {
      throw new TypeError('No trigger')
    }
    expect(press(trigger, 'ArrowDown').defaultPrevented).toBe(true)
    expect(container.querySelector('[role=listbox]')?.hasAttribute('hidden')).toBe(false)
    expect(container.querySelectorAll('[role=option]').length).toBe(4)
    const cherry = container.querySelector('#w-list-option-Cherry')
    if (!(cherry instanceof HTMLElement)) {
      throw new TypeError('No Cherry')
    }
    const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    cherry.dispatchEvent(down)
    expect(down.defaultPrevented).toBe(true)
    cherry.click()
    expect(heard.map((out) => out.effect)).toEqual([{ type: 'change', value: 'Cherry' }])
    expect(trigger.textContent).toBe('Cherry')
    expect(container.querySelector('[role=listbox]')?.hasAttribute('hidden')).toBe(true)
  })

  test('passes axe for the select open and closed, the menu, the reorderable list and the dialog', async () => {
    const picked = draw(select, SELECT)
    cleanup.push(picked.stop)
    expect(await violations(picked.container)).toEqual([])
    const trigger = picked.container.querySelector('[role=combobox]')
    if (trigger !== null) {
      press(trigger, 'ArrowDown')
    }
    expect(await violations(picked.container)).toEqual([])

    const items = FRUIT.slice(0, 3).map((name) => ({ disabled: false, key: name, text: name }))
    const menued = draw(menu, { items, label: 'Actions' })
    cleanup.push(menued.stop)
    menued.container.querySelector('button')?.click()
    expect(await violations(menued.container)).toEqual([])

    const ordered = draw(reorderList, { focusable: true, label: 'Order', revision: 0, rows: 4, shown: true })
    cleanup.push(ordered.stop)
    expect(await violations(ordered.container)).toEqual([])

    const modal = draw(dialog(select, ['content', 'trigger']), {
      closeLabel: 'Close',
      content: SELECT,
      open: true,
      title: 'Pick',
    })
    cleanup.push(modal.stop)
    expect(await violations(modal.container)).toEqual([])
  })

  test('the dialog: focus goes in when it opens, the rest is inert, and focus comes back when it closes', () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()
    const props = { closeLabel: 'Close', content: SELECT, open: false, title: 'Pick a fruit' }
    const modal = draw(dialog(select, ['content', 'trigger']), props)
    cleanup.push(modal.stop)
    modal.host.setProps({ ...props, open: true })
    expect(document.activeElement?.getAttribute('role')).toBe('combobox')
    expect(opener.hasAttribute('inert')).toBe(true)
    press(document.activeElement ?? opener, 'Escape')
    expect(modal.heard.map((out) => out.effect)).toEqual([{ type: 'change', value: false }])
    modal.host.setProps(props)
    expect([opener.hasAttribute('inert'), document.activeElement]).toEqual([false, opener])
  })

  test('the reorderable list: a pointer drag over options marks the drop and emits move; Alt+ArrowDown too', () => {
    const ordered = draw(reorderList, { focusable: true, label: 'Order', revision: 0, rows: 4, shown: true })
    cleanup.push(ordered.stop)
    const banana = document.querySelector('#w-option-Banana')
    const date = document.querySelector('#w-option-Date')
    if (banana === null || date === null) {
      throw new TypeError('No options')
    }
    banana.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 0, clientY: 20, pointerId: 1 }),
    )
    banana.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 0, clientY: 30, pointerId: 1 }))
    date.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 0, clientY: 60, pointerId: 1 }))
    expect(document.querySelector('[data-dragged]')).toBe(banana)
    expect(document.querySelector('[data-drop=after]')).toBe(date)
    date.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 0, clientY: 60, pointerId: 1 }))
    expect(ordered.heard.map((out) => out.effect)).toEqual([
      { after: true, item: 'Banana', target: 'Date', type: 'move' },
    ])
    expect(document.querySelector('[role=status]')?.textContent).toBe('Banana moved')
    const root = document.querySelector('[role=listbox]')
    if (root === null) {
      throw new TypeError('No list')
    }
    expect(press(root, 'ArrowDown', { altKey: true }).defaultPrevented).toBe(true)
    expect(ordered.heard.at(-1)?.effect).toEqual({ after: true, item: 'Banana', target: 'Elderberry', type: 'move' })
  })
})
