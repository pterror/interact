/**
 * An editor inside a small box that clips what overflows it and is transformed, with suggestions after `{{`, a hover
 * tooltip on every word, and a tooltip of the page's own through `showTooltip`, for the browser test of
 * `topLayerTooltips`. What each tooltip shows is in `seenTooltips`.
 */

import { startCompletion } from '@codemirror/autocomplete'
import { StateEffect, StateField } from '@codemirror/state'
import { hoverTooltip, showTooltip } from '@codemirror/view'
import { suggestions, textEditor } from '@pterror/interact-editor'

/**
 * Where a tooltip is against what it is shown for, and whether anything hides it
 * @typedef {Readonly<{
 *   kind: string,
 *   open: boolean,
 *   inEditor: boolean,
 *   below: number,
 *   across: number,
 *   onTop: boolean,
 * }>} TooltipSeen
 */

/** @type {import('@codemirror/state').StateEffectType<number | undefined>} */
const pin = StateEffect.define()

/** A tooltip of the page's own at a position, or none */
const pinned = StateField.define({
  create: () => undefined,
  provide: (field) =>
    showTooltip.from(field, (pos) =>
      pos === undefined
        ? // oxlint-disable-next-line unicorn/no-null -- showTooltip takes null for no tooltip
          null
        : {
            above: false,
            create() {
              const dom = document.createElement('div')
              dom.dataset['kind'] = 'pinned'
              dom.textContent = 'pinned'
              return { dom }
            },
            pos,
          },
    ),
  /**
   * @param {number | undefined} value - The position
   * @param {import('@codemirror/state').Transaction} transaction - The transaction
   * @returns {number | undefined} The next
   */
  update(value, transaction) {
    let next = value
    for (const effect of transaction.effects) {
      if (effect.is(pin)) {
        next = effect.value
      }
    }
    return next
  },
})

const hover = hoverTooltip((_view, pos) => ({
  create() {
    const dom = document.createElement('div')
    dom.dataset['kind'] = 'hover'
    dom.textContent = 'hover'
    return { dom }
  },
  pos,
}))

/** @type {import('@pterror/interact-editor/suggestions').Suggest} */
const macros = (read, pos) =>
  read(pos - 2, pos) === '{{' ? { from: pos, options: [{ apply: () => undefined, label: 'user' }], to: pos } : undefined

/** @type {ReturnType<typeof textEditor> | undefined} */
let made = undefined

/**
 * Puts the editor in the page, its cursor at the end
 * @returns {void}
 */
function putEditor() {
  const box = document.createElement('div')
  box.style.cssText = 'position: absolute; top: 40px; left: 40px; width: 300px; height: 30px; overflow: hidden;'
  box.style.transform = 'translateX(10px)'
  const cover = document.createElement('div')
  cover.style.cssText = 'position: absolute; top: 70px; left: 0; width: 600px; height: 400px; z-index: 10;'
  cover.style.background = 'white'
  document.body.append(box, cover)
  const text = 'hello {{'
  made = textEditor({
    edit: () => undefined,
    extensions: [suggestions([macros]), hover, pinned],
    parent: box,
    text: { get: () => ({ includes: undefined, text }), watch: () => () => undefined },
  })
  made.view.focus()
  made.view.dispatch({ selection: { anchor: text.length } })
}

/**
 * The view
 * @returns {import('@codemirror/view').EditorView} It
 * @throws {Error} Before putEditor
 */
function view() {
  if (made === undefined) {
    throw new Error('putEditor first')
  }
  return made.view
}

/**
 * Asks for suggestions at the cursor
 * @returns {void}
 */
function suggest() {
  startCompletion(view())
}

/**
 * Shows the page's own tooltip at the start of the text, or hides it
 * @param {boolean} on - Whether it shows
 * @returns {void}
 */
function pinAtStart(on) {
  view().dispatch({ effects: pin.of(on ? 0 : undefined) })
}

/**
 * The middle of the first word, where hovering shows the hover tooltip
 * @returns {Readonly<{ x: number, y: number }>} The point, in the window
 */
function firstWord() {
  const at = view().coordsAtPos(2)
  if (at === null) {
    throw new Error('the first word is not drawn')
  }
  return { x: at.left, y: (at.top + at.bottom) / 2 }
}

/**
 * Every tooltip shown, and where it is against the position it is shown for
 * @returns {TooltipSeen[]} Each
 */
function seenTooltips() {
  const shown = view()
  return [...document.querySelectorAll('.cm-tooltip')].map((dom) => {
    const marked = dom.querySelector('[data-kind]') ?? dom
    const kind =
      (marked instanceof HTMLElement ? marked.dataset['kind'] : undefined) ??
      (dom.classList.contains('cm-tooltip-autocomplete') ? 'suggestions' : 'other')
    const pos = kind === 'suggestions' ? shown.state.doc.length : kind === 'pinned' ? 0 : 2
    const at = shown.coordsAtPos(pos)
    const box = dom.getBoundingClientRect()
    const middle = document.elementFromPoint((box.left + box.right) / 2, (box.top + box.bottom) / 2)
    return {
      across: at === null ? Number.NaN : box.left - at.left,
      below: at === null ? Number.NaN : box.top - at.bottom,
      inEditor: shown.dom.contains(dom),
      kind,
      onTop: middle !== null && dom.contains(middle),
      open: dom.parentElement?.closest(':popover-open') !== null,
    }
  })
}

export { firstWord, pinAtStart, putEditor, seenTooltips, suggest }
