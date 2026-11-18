/**
 * The core's components in a page, for the browser tests: the select, the dialog around a select and the menu, as the
 * generated widgets the frameworks run, drawn by the DOM renderer the frameworks' parts are checked against; and the
 * custom elements, in a form with a label.
 */

import { arraySource, renderDom } from '@pterror/interact-core'
import { dialog } from '@pterror/interact-core/generated/dialog'
import { menu } from '@pterror/interact-core/generated/menu'
import { select } from '@pterror/interact-core/generated/select'
import { register } from '@pterror/interact-elements'

const FRUIT = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry', 'Fig']
const SELECT = { disabled: false, label: 'Fruit', placeholder: 'Choose a fruit', rows: 4, source: 'fruit', value: null }

/**
 * A box as plain numbers
 * @typedef {Readonly<{ left: number, top: number, right: number, bottom: number }>} Box
 */

/**
 * An element's box
 * @param {Element | null} element - The element
 * @returns {Box | null} Its edges, rounded, or none
 */
function boxOf(element) {
  if (element === null) {
    return null
  }
  const rect = element.getBoundingClientRect()
  return {
    bottom: Math.round(rect.bottom),
    left: Math.round(rect.left),
    right: Math.round(rect.right),
    top: Math.round(rect.top),
  }
}

/**
 * A container placed in the window
 * @param {number} top - Its top, in CSS pixels, from the top of the page
 * @returns {HTMLElement} It
 */
function containerAt(top) {
  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.top = `${String(top)}px`
  container.style.left = '40px'
  document.body.append(container)
  return container
}

/**
 * The changes the app was told, by widget path
 * @type {string[]}
 */
const told = []

/**
 * Draws the select, its value the app's, which takes every change
 * @param {number} top - Where it is in the page
 * @returns {void}
 */
function drawSelect(top) {
  /** @type {Readonly<{ [field: string]: unknown }>} */
  let props = SELECT
  const drawn = renderDom({
    container: containerAt(top),
    effect: (/** @type {import('@pterror/interact-core').Out} */ out) => {
      const { effect } = out
      if (typeof effect === 'object' && effect !== null && 'type' in effect && effect.type === 'change') {
        const value = 'value' in effect ? effect.value : null
        told.push(`select ${JSON.stringify(value)}`)
        props = { ...props, value: { value: typeof value === 'string' ? value : null } }
        queueMicrotask(() => {
          drawn.host.setProps(props)
        })
      }
    },
    naming: { id: 's', keyId: String },
    props,
    sources: { fruit: arraySource(FRUIT) },
    widget: select,
  })
}

/**
 * Draws a button that opens the dialog around a select, its `open` the app's
 * @returns {void}
 */
function drawDialog() {
  const opener = document.createElement('button')
  opener.textContent = 'Pick'
  opener.id = 'opener'
  document.body.append(opener)
  const page = document.createElement('p')
  page.id = 'page'
  page.textContent = 'The page behind'
  page.style.height = '3000px'
  document.body.append(page)
  /** @type {Readonly<{ [field: string]: unknown }>} */
  let props = {
    closeLabel: 'Close',
    content: SELECT,
    ignoreOutside: false,
    open: false,
    title: 'Pick a fruit',
  }
  const drawn = renderDom({
    container: containerAt(0),
    effect: (/** @type {import('@pterror/interact-core').Out} */ out) => {
      const { effect, from } = out
      if (typeof effect === 'object' && effect !== null && 'type' in effect && effect.type === 'change') {
        const value = 'value' in effect ? effect.value : null
        told.push(`${from.length === 0 ? 'dialog' : 'select'} ${JSON.stringify(value)}`)
        props = from.length === 0 ? { ...props, open: value } : { ...props, content: { ...SELECT, value: { value } } }
        const next = props
        queueMicrotask(() => {
          drawn.host.setProps(next)
        })
      }
    },
    naming: { id: 'd', keyId: String },
    props,
    sources: { fruit: arraySource(FRUIT) },
    widget: dialog(select, ['content', 'trigger']),
  })
  opener.addEventListener('click', () => {
    props = { ...props, open: true }
    drawn.host.setProps(props)
  })
}

/**
 * Draws the menu over a source of actions
 * @returns {void}
 */
function drawMenu() {
  renderDom({
    container: containerAt(40),
    effect: (/** @type {import('@pterror/interact-core').Out} */ out) => {
      const { effect } = out
      if (typeof effect === 'object' && effect !== null && 'type' in effect && effect.type === 'activate') {
        told.push(`activate ${JSON.stringify('item' in effect ? effect.item : null)}`)
      }
    },
    naming: { id: 'm', keyId: String },
    props: { disabled: ['copy'], label: 'Edit', source: 'edit' },
    sources: {
      edit: arraySource(
        ['cut', 'copy', 'paste', 'pin'],
        (key) => `${String(key).charAt(0).toUpperCase()}${String(key).slice(1)}`,
      ),
    },
    widget: menu,
  })
}

/**
 * Draws the custom select in a form, with a `<label>` for it, styling its parts and states from outside its shadow root
 * @returns {void}
 */
function drawElements() {
  register()
  const style = document.createElement('style')
  style.textContent = [
    'interact-select::part(trigger) { outline-color: rgb(1, 2, 3) }',
    'interact-select:state(expanded)::part(trigger) { color: rgb(4, 5, 6) }',
  ].join('\n')
  document.head.append(style)
  const form = document.createElement('form')
  form.id = 'form'
  const label = document.createElement('label')
  label.htmlFor = 'fruit'
  label.textContent = 'Favourite fruit'
  label.id = 'label'
  const element = document.createElement('interact-select')
  element.id = 'fruit'
  element.setAttribute('label', 'Fruit')
  element.setAttribute('placeholder', 'Choose a fruit')
  element.setAttribute('rows', '4')
  element.setAttribute('name', 'fruit')
  element.items = FRUIT.map((text) => ({ key: text.toLowerCase(), text }))
  form.append(label, element)
  document.body.append(form)
}

/**
 * What the page shows now
 * @returns {Readonly<{
 *   told: readonly string[],
 *   focused: string | null,
 *   open: readonly string[],
 *   boxes: Readonly<{ [id: string]: Box | null }>,
 *   inert: readonly string[],
 *   overflow: string,
 * }>} The changes told, the focused part (inside shadow roots), the popovers shown, a few parts' boxes, the elements
 *   made inert, and whether the document scrolls
 */
function seen() {
  let focused = document.activeElement
  while (focused?.shadowRoot?.activeElement !== null && focused?.shadowRoot?.activeElement !== undefined) {
    focused = focused.shadowRoot.activeElement
  }
  /** @type {(Document | ShadowRoot)[]} */
  const roots = [document]
  for (const one of document.querySelectorAll('interact-select')) {
    if (one.shadowRoot !== null) {
      roots.push(one.shadowRoot)
    }
  }
  const parts = roots.flatMap((root) => [...root.querySelectorAll('[id]')])
  return {
    boxes: Object.fromEntries(parts.map((part) => [part.id, boxOf(part)])),
    focused: focused?.id ?? null,
    inert: [...document.querySelectorAll('[inert]')].map((element) => element.id || element.localName),
    open: parts.filter((part) => part.matches(':popover-open')).map((part) => part.id),
    overflow: document.documentElement.style.overflow,
    told: [...told],
  }
}

/**
 * The custom select's state as its form, label, parts and custom states show it
 * @returns {Readonly<{ data: string | null, name: string, outline: string, color: string, expanded: boolean, labelled: readonly string[] }>}
 *   Its value in the form's data, the trigger's accessible name source (the elements it is labelled by), its part's
 *   styles, and its expanded state
 */
function elementSeen() {
  const element = document.querySelector('interact-select')
  const form = document.querySelector('form')
  const trigger = element?.shadowRoot?.querySelector('[role=combobox]') ?? null
  const style = trigger === null ? null : getComputedStyle(trigger)
  const labelledBy = trigger === null ? [] : (trigger.ariaLabelledByElements ?? [])
  const data = form === null ? null : new FormData(form).get('fruit')
  return {
    color: style?.color ?? '',
    data: typeof data === 'string' ? data : null,
    expanded: element?.matches(':state(expanded)') ?? false,
    labelled: labelledBy.map((one) => one.textContent),
    name: trigger?.getAttribute('aria-labelledby') ?? '',
    outline: style?.outlineColor ?? '',
  }
}

/**
 * Resets the custom select's form
 * @returns {void}
 */
function resetForm() {
  document.querySelector('form')?.reset()
}

export { drawDialog, drawElements, drawMenu, drawSelect, elementSeen, resetForm, seen }
