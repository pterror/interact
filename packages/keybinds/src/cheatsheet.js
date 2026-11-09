/**
 * A ready-made cheatsheet, wired from small pieces: every binding in effect, grouped by category under a header row,
 * those whose command doesn't apply now marked `aria-disabled`, shown while a modifier is held or after it is tapped
 * twice, and closed by Escape or a press outside. While open it is a manual popover centred on the viewport, that
 * has focus (given back as it closes), so by the overlay rule the page's bindings don't fire. Unstyled, in the light
 * DOM: each group is a `role=group` labelled by its header; the only inline style is the popover's place. An app that
 * wants one piece otherwise wires the rest itself: cheatsheetKeys() (which ids), bindingParts() (how bindings look),
 * cheatsheetRow() (a row's contents), cheatsheetTrigger() (when it opens), categoryHeaders(), focusReturn(), with list's
 * render, groupMount, mark, popover, focusWhen and dismiss.
 */

import { cell, dismiss, focusWhen, groupMount, mark, popover, render } from '@pterror/interact-list'

import { bindingParts } from './binding-parts.js'
import { bound } from './bound.js'
import { categoryHeaders } from './category-headers.js'
import { cheatsheetKeys } from './cheatsheet-keys.js'
import { cheatsheetRow } from './cheatsheet-row.js'
import { cheatsheetTrigger } from './cheatsheet-trigger.js'
import { focusReturn } from './focus-return.js'

/**
 * @typedef {Readonly<{ label: string, category?: string, hidden?: boolean, keys?: readonly string[],
 *   mouse?: readonly string[], pad?: readonly string[], axes?: readonly string[] }>} Entry
 */

/**
 * @typedef {Readonly<Record<string, Readonly<{ keys?: readonly string[], mouse?: readonly string[],
 *   pad?: readonly string[], axes?: readonly string[] }>>>} Overrides
 */

/**
 * @template T
 * @typedef {Readonly<{ get: () => T, watch: (listener: () => void) => () => void }>} Watched
 */

/**
 * @typedef {Readonly<{
 *   element: HTMLElement,
 *   schema: Readonly<Record<string, Entry>>,
 *   overrides?: Watched<Overrides>,
 *   applies?: (id: string) => boolean,
 *   layout?: Watched<ReadonlyMap<string, string> | undefined>,
 *   modifier?: string,
 *   delay?: number,
 *   target?: EventTarget,
 * }>} CheatsheetOptions
 */

/** @type {Watched<Overrides>} */
const NO_OVERRIDES = { get: () => ({}), watch: () => () => undefined }

let made = 0

/**
 * Builds a cheatsheet in an element
 * @param {CheatsheetOptions} options - Its element; the schema, and a person's overrides (bindingStore()); whether an
 *   id's command applies now (default: all do); the person's keyboard layout (layout()); and its trigger, as for
 *   cheatsheetTrigger()
 * @returns {Readonly<{ open: Readonly<{ get: () => boolean, set: (open: boolean) => void,
 *   watch: (listener: () => void) => () => void }>, stop: () => void }>} Whether it is open, and stopping
 * @example
 * const sheet = cheatsheet({ element, overrides: bindingStore(localStorageBindings('app:keys')), schema })
 */
function cheatsheet({
  applies = () => true,
  delay,
  element,
  layout,
  modifier,
  overrides = NO_OVERRIDES,
  schema,
  target,
}) {
  made += 1
  const prefix = `keybinds-cheatsheet-${String(made)}`
  const open = cell(false)
  /** @type {Readonly<{ from: Overrides, bindings: Readonly<Record<string, Entry>> }> | undefined} */
  let last = undefined
  /** @type {Watched<Readonly<Record<string, Entry>>>} */
  const bindings = {
    get() {
      const from = overrides.get()
      if (last?.from !== from) {
        last = { bindings: bound(schema, from), from }
      }
      return last.bindings
    },
    watch: overrides.watch,
  }
  const keys = cheatsheetKeys({ bindings, open })
  const headers = categoryHeaders({ categoryOf: keys.groupOf, drawn: keys, prefix })
  const rendered = render({
    create: (key) => headers.header(key) ?? document.createElement('div'),
    drawn: headers.drawn,
    facets: [
      cheatsheetRow({
        entryOf: (id) => bindings.get()[id],
        parts: (entry) => bindingParts(entry, layout?.get()),
        watch(listener) {
          const stops = [bindings.watch(listener), ...(layout === undefined ? [] : [layout.watch(listener)])]
          return () => {
            for (const stop of stops) {
              stop()
            }
          }
        },
      }),
      mark({
        attribute: 'aria-disabled',
        on: 'true',
        test: { has: (key) => typeof key === 'string' && !applies(key), watch: () => () => undefined },
      }),
    ],
    mount: groupMount({ container: element, groupOf: headers.groupOf, labelIdOf: headers.labelIdOf }),
  })
  const viewport = {
    getBoundingClientRect() {
      const view = element.ownerDocument.defaultView
      return { bottom: view?.innerHeight ?? 0, left: 0, right: view?.innerWidth ?? 0, top: 0 }
    },
  }
  element.tabIndex = -1
  const stops = [
    rendered.stop,
    focusReturn({ element, open }),
    popover({ anchor: viewport, element, open, side: 'center' }),
    focusWhen({ element, when: open }),
    dismiss({ elements: [element], to: open.set }),
    cheatsheetTrigger({ delay, modifier, open, target, to: open.set }),
  ]
  return {
    open,
    stop() {
      for (const stop of stops) {
        stop()
      }
    },
  }
}

export { cheatsheet }
