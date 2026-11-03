/**
 * A combobox inside a layer, for a browser test's page: a button that opens a modal dialog holding an editable fruit
 * combobox, and what the page shows.
 * @import { DomMode } from '@interact/dom/css'
 * @import { View } from '@interact/dom/component'
 */

import { Layer } from '@interact/core'
import {
  component,
  css,
  deepActiveElement,
  html,
  joinStyles,
  overlayStyles,
  register,
  releaseOverlay,
  syncOverlay,
} from '@interact/dom'

import { comboboxElement } from './combobox-element.js'
import { fruitSearch } from './test-comboboxes.js'

/** A dialog's state: its modal layer. */
class Finder {
  /** @readonly */
  layer = new Layer({ modal: true })

  /**
   * Calls `listener` when it opens or closes.
   * @param {() => void} listener - What to call
   * @returns {() => void} Stops calling it
   */
  subscribe(listener) {
    return this.layer.open.subscribe(listener)
  }
}

const finderStyles = css`
  @layer interact.structure, interact.theme;

  @layer interact.structure {
    :where([part~='overlay']) {
      padding: 8px;
      border: 1px solid CanvasText;
      background: Canvas;
      color: CanvasText;
    }
  }
`

/**
 * The dialog's parts.
 * @param {HTMLElement} root - Where its view is
 * @returns {Readonly<{ trigger: HTMLElement, overlay: HTMLElement }>} Its button and its dialog
 */
function partsOf(root) {
  const trigger = root.querySelector(':scope > [part~="trigger"]')
  const overlay = root.querySelector(':scope > [part~="overlay"]')
  if (!(trigger instanceof HTMLElement) || !(overlay instanceof HTMLElement)) {
    throw new TypeError('The finder has no trigger or dialog')
  }
  return { overlay, trigger }
}

/** @type {View<Finder>} */
const finderView = {
  disconnected: (_finder, root) => {
    releaseOverlay(partsOf(root).overlay)
  },
  kind: 'finder',
  render: (finder) =>
    html`<button
        part="trigger"
        aria-haspopup="dialog"
        @click=${() => {
          finder.layer.open.request(true)
        }}
        >Find</button
      ><dialog part="overlay" closedby="none" aria-label="Find a fruit"><l-combobox></l-combobox></dialog>`,
  rendered: (finder, root) => {
    syncOverlay(partsOf(root).overlay, finder.layer)
  },
  styles: joinStyles(overlayStyles, finderStyles),
}

/**
 * Where the combobox's view is: inside the dialog's view, in the DOM mode both were registered with.
 * @returns {HTMLElement | ShadowRoot} The combobox's root
 */
function comboboxRoot() {
  const box = finderRoot().querySelector('l-combobox')
  if (!(box instanceof HTMLElement)) {
    throw new TypeError('There is no combobox in the dialog')
  }
  return box.shadowRoot ?? box
}

/**
 * An element in the dialog's view, or in its combobox's.
 * @param {HTMLElement | ShadowRoot} root - Where to look
 * @param {string} name - The part
 * @returns {HTMLElement} The element
 */
function part(root, name) {
  const found = root.querySelector(`[part~="${name}"]`)
  if (!(found instanceof HTMLElement)) {
    throw new TypeError(`There is no ${name}`)
  }
  return found
}

/**
 * The dialog's view.
 * @returns {HTMLElement | ShadowRoot} Where it is
 */
function finderRoot() {
  const finder = document.querySelector('l-finder')
  if (!(finder instanceof HTMLElement)) {
    throw new TypeError('There is no finder')
  }
  return finder.shadowRoot ?? finder
}

/**
 * Puts the dialog's button in the page's main landmark, both registered in a DOM mode, and opens the dialog from the
 * button with its combobox's field focused.
 * @param {DomMode} mode - Where they live
 * @returns {Promise<void>} When the field has focus
 */
async function putFinder(mode) {
  register([comboboxElement(() => fruitSearch('list')), component(finderView, () => new Finder())], {
    mode,
    prefix: 'l',
  })
  const main = document.createElement('main')
  main.append(document.createElement('l-finder'))
  document.body.append(main)
  await settle()
  const trigger = part(finderRoot(), 'trigger')
  trigger.focus()
  trigger.click()
  await settle()
  part(comboboxRoot(), 'field').focus()
}

/**
 * Waits for the next frame to be drawn.
 * @returns {Promise<void>} When it has been
 */
async function frame() {
  /** @type {PromiseWithResolvers<void>} */
  const drawn = Promise.withResolvers()
  requestAnimationFrame(() => {
    drawn.resolve()
  })
  await drawn.promise
}

/**
 * Waits for two frames to be drawn, so renders and what is found have passed.
 * @returns {Promise<void>} When they have
 */
async function settle() {
  await frame()
  await frame()
}

/**
 * What the page shows: whether the dialog and the combobox's list are open, what the field holds, and where focus is.
 * @returns {Promise<Readonly<{ dialog: boolean, list: boolean, text: string, focus: string }>>} What shows
 */
async function seenFinder() {
  await settle()
  const dialog = finderRoot().querySelector('dialog')
  const root = comboboxRoot()
  const field = root.querySelector('[part~="field"]')
  const active = deepActiveElement(document)
  return {
    dialog: dialog?.open ?? false,
    focus: active === field ? 'field' : (active?.getAttribute('part') ?? 'page'),
    list: root.querySelector('[part~="popup"]')?.matches(':popover-open') ?? false,
    text: field instanceof HTMLInputElement ? field.value : '',
  }
}

export { putFinder, seenFinder }
