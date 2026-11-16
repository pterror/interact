/**
 * The checks every framework's generated components take, for tests: the select, and the dialog around a select, drawn
 * by the framework and by the generic DOM renderer, given the same input sequences, must draw the same DOM, keep focus
 * on the same part, prevent the same defaults and tell the app the same changes. The app confirms every change, so a
 * component whose value is its own and one whose value is the app's both draw what the DOM renderer does for an app
 * giving the value.
 */

import { expect } from 'bun:test'

import axe from 'axe-core'

import { isRecord } from './compose.js'
import { dialog } from './dialog.js'
import { renderDom } from './dom.js'
import { arraySource } from './host.js'
import { select } from './select.js'

/** @import { AnyWidget, Out } from './compose.js' */
/** @import { Key } from './contract.js' */
/** @import { Source } from './host.js' */

const FRUIT = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry', 'Fig']
const NAMING = { id: 'w', keyId: String }
const SELECT = { label: 'Fruit', placeholder: 'Choose a fruit', rows: 4, source: 'fruit' }
const DIALOG = { closeLabel: 'Close', ignoreOutside: false, title: 'Pick a fruit' }

/**
 * Which component, whose value is whose: `own` starts from a default, `app` is given by the app, which takes every
 * change
 * @typedef {'own' | 'app'} Mode
 */

/**
 * What a test mounts: the select, or the dialog around a select (open at first), each over the source `fruit`, with
 * the given starting values, and its parts named `w`
 * @typedef {Readonly<{
 *   kind: 'select' | 'dialog',
 *   mode: Mode,
 *   value: Key | null,
 *   open: boolean,
 *   sources: Readonly<{ fruit: Source }>,
 *   naming: Readonly<{ id: string, keyId: (key: Key) => string }>,
 *   container: HTMLElement,
 *   changed: (component: 'select' | 'dialog', value: unknown) => void,
 * }>} Mounting
 */

/**
 * A framework, as these checks drive it: mounting a component, waiting until it has drawn what it was told, taking it
 * down, and, for one drawing into a shadow root, where in the container its parts are
 * @typedef {Readonly<{
 *   mount: (mounting: Mounting) => Promise<() => void> | (() => void),
 *   settle: () => Promise<void>,
 *   within?: (container: HTMLElement) => Element | ShadowRoot,
 * }>} Framework
 */

/**
 * One step of an input sequence, on a part named by its id: a key pressed, a click, or a mouse button pressed
 * @typedef {Readonly<{ press: string, key: string }> | Readonly<{ click: string }> | Readonly<{ mousedown: string }>} Step
 */

/**
 * What a sequence leaves after each step: the DOM, the focused part, whether the step's default was prevented, and the
 * changes told so far
 * @typedef {Readonly<{ dom: string, focused: string | null, prevented: boolean | null, changes: readonly string[] }>} Snapshot
 */

/**
 * A node as text: elements with their attributes sorted, text as it is, comments left out, so two renderers' DOM
 * compares by what it means. What only styles a part from outside a shadow root is left out too: the `part`
 * attribute, and a slot, whose fallback text is what it shows
 * @param {Node} node - The node
 * @returns {string} The text
 */
function serialize(node) {
  if (node instanceof Text) {
    return node.data
  }
  if (!(node instanceof Element)) {
    return ''
  }
  if (node.localName === 'slot') {
    return node.textContent
  }
  const attributes = node
    .getAttributeNames()
    .filter((name) => name !== 'part')
    .map((name) => `${name}="${node.getAttribute(name) ?? ''}"`)
    .toSorted()
    .join(' ')
  const inner = [...node.childNodes].map((child) => serialize(child)).join('')
  return `<${node.localName}${attributes === '' ? '' : ` ${attributes}`}>${inner}</${node.localName}>`
}

/**
 * The element focus is in, inside any shadow roots
 * @returns {Element | null} The element
 */
function focusedNow() {
  let focused = document.activeElement
  while (focused?.shadowRoot?.activeElement !== null && focused?.shadowRoot?.activeElement !== undefined) {
    focused = focused.shadowRoot.activeElement
  }
  return focused
}

/**
 * The element of a part, by its id
 * @param {Element | ShadowRoot} container - Where the widget is drawn
 * @param {string} id - The part's id
 * @returns {HTMLElement} Its element
 */
function partIn(container, id) {
  const found = container.querySelector(`[id="${id}"]`)
  if (!(found instanceof HTMLElement)) {
    throw new TypeError(`No part ${id} in ${serialize(container)}`)
  }
  return found
}

/**
 * Carries out a step on a widget drawn in a container
 * @param {Element | ShadowRoot} container - Where it is drawn
 * @param {Step} step - The step
 * @returns {boolean} Whether the step's default was prevented
 */
function carry(container, step) {
  if ('press' in step) {
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: step.key })
    partIn(container, step.press).dispatchEvent(event)
    return event.defaultPrevented
  }
  if ('mousedown' in step) {
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    partIn(container, step.mousedown).dispatchEvent(event)
    return event.defaultPrevented
  }
  const element = partIn(container, step.click)
  const event = new MouseEvent('click', { bubbles: true, cancelable: true })
  element.dispatchEvent(event)
  return event.defaultPrevented
}

/**
 * What a container shows now
 * @param {Element | ShadowRoot} container - Where the widget is drawn
 * @param {boolean | null} prevented - Whether the last step's default was prevented
 * @param {readonly string[]} changes - The changes told so far
 * @returns {Snapshot} The snapshot
 */
function snapshot(container, prevented, changes) {
  const focused = focusedNow()
  return {
    changes: [...changes],
    dom: [...container.childNodes].map((child) => serialize(child)).join(''),
    focused: focused !== null && container.contains(focused) ? focused.id : null,
    prevented,
  }
}

const TRIGGER = 'w-trigger'
const IN_DIALOG = 'w-content-trigger'

/**
 * The input sequence for a component
 * @param {'select' | 'dialog'} kind - Which
 * @returns {readonly Step[]} The steps
 */
function stepsFor(kind) {
  const trigger = kind === 'select' ? TRIGGER : IN_DIALOG
  const option = (/** @type {string} */ key) =>
    kind === 'select' ? `w-list-option-${key}` : `w-content-list-option-${key}`
  /** @type {Step[]} */
  const steps = [
    { key: 'ArrowDown', press: trigger },
    { key: 'ArrowDown', press: trigger },
    { key: 'ArrowDown', press: trigger },
    { key: 'Enter', press: trigger },
    { key: 'ArrowDown', press: trigger },
    { key: 'End', press: trigger },
    { key: 'Escape', press: trigger },
    { click: trigger },
    { mousedown: option('Cherry') },
    { click: option('Cherry') },
    { key: 'ArrowDown', press: trigger },
    { key: 'ArrowUp', press: trigger },
    { key: 'Tab', press: trigger },
  ]
  return kind === 'select'
    ? steps
    : [
        ...steps,
        { mousedown: 'w-dialog' },
        { click: 'w-root' },
        { mousedown: 'w-root' },
        { click: 'w-root' },
        { key: 'Escape', press: trigger },
      ]
}

/**
 * Runs a sequence on a widget the DOM renderer draws, its app giving every value and taking every change
 * @param {'select' | 'dialog'} kind - Which component
 * @param {Key | null} value - The select's first value
 * @returns {Promise<Snapshot[]>} What it shows after each step
 */
async function reference(kind, value) {
  const container = document.createElement('div')
  document.body.append(container)
  /** @type {string[]} */
  const changes = []
  /** @type {Readonly<{ [field: string]: unknown }>} */
  let props =
    kind === 'select'
      ? { ...SELECT, value: { value } }
      : { ...DIALOG, content: { ...SELECT, value: { value } }, open: true }
  /** @type {AnyWidget} */
  const widget = kind === 'select' ? select : dialog(select, ['content', 'trigger'])
  const drawn = renderDom({
    container,
    effect: (/** @type {Out} */ out) => {
      const { effect, from } = out
      if (!isRecord(effect) || effect['type'] !== 'change') {
        return
      }
      if (kind === 'dialog' && from.length === 0) {
        changes.push(`dialog ${JSON.stringify(effect['value'])}`)
        props = { ...props, open: effect['value'] }
      } else if (kind === 'dialog') {
        changes.push(`select ${JSON.stringify(effect['value'])}`)
        props = { ...props, content: { ...SELECT, value: { value: effect['value'] } } }
      } else {
        changes.push(`select ${JSON.stringify(effect['value'])}`)
        props = { ...props, value: { value: effect['value'] } }
      }
      const next = props
      queueMicrotask(() => {
        drawn.host.setProps(next)
      })
    },
    naming: NAMING,
    props,
    sources: { fruit: arraySource(FRUIT) },
    widget,
  })
  await settled()
  const shots = [snapshot(container, null, changes)]
  for (const step of stepsFor(kind)) {
    const prevented = carry(container, step)
    // oxlint-disable-next-line no-await-in-loop -- each step lands before the next is taken
    await settled()
    shots.push(snapshot(container, prevented, changes))
  }
  drawn.stop()
  container.remove()
  return shots
}

/**
 * Lets microtasks and a macrotask run: the source's answers, and the app's changes
 * @returns {Promise<void>} When they have
 */
async function settled() {
  await Bun.sleep(0)
  await Bun.sleep(0)
}

/**
 * Runs a sequence on a framework's component
 * @param {Framework} framework - The framework
 * @param {'select' | 'dialog'} kind - Which component
 * @param {Mode} mode - Whose value it is
 * @param {Key | null} value - The select's first value
 * @returns {Promise<Snapshot[]>} What it shows after each step
 */
async function framed(framework, kind, mode, value) {
  const container = document.createElement('div')
  document.body.append(container)
  /** @type {string[]} */
  const changes = []
  const stop = await framework.mount({
    changed: (component, changedTo) => {
      changes.push(`${component} ${JSON.stringify(changedTo)}`)
    },
    container,
    kind,
    mode,
    naming: NAMING,
    open: true,
    sources: { fruit: arraySource(FRUIT) },
    value,
  })
  await framework.settle()
  await settled()
  const root = framework.within?.(container) ?? container
  const shots = [snapshot(root, null, changes)]
  for (const step of stepsFor(kind)) {
    const prevented = carry(root, step)
    // oxlint-disable-next-line no-await-in-loop -- each step lands before the next is taken
    await Promise.all([framework.settle(), settled()])
    shots.push(snapshot(root, prevented, changes))
  }
  stop()
  await framework.settle()
  container.remove()
  return shots
}

/**
 * Checks that a framework's component draws and behaves as the DOM renderer does, step by step
 * @param {Framework} framework - The framework
 * @param {'select' | 'dialog'} kind - Which component
 * @param {Mode} mode - Whose value it is
 * @returns {Promise<void>} When it has
 */
async function drawsAsTheDomRenderer(framework, kind, mode) {
  const value = mode === 'own' ? 'Date' : null
  const wanted = await reference(kind, value)
  const got = await framed(framework, kind, mode, value)
  const steps = ['start', ...stepsFor(kind).map((step) => JSON.stringify(step))]
  expect(got.map((shot, index) => [steps[index], shot])).toEqual(wanted.map((shot, index) => [steps[index], shot]))
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

export { drawsAsTheDomRenderer, FRUIT, NAMING, partIn, serialize, settled, violations }
