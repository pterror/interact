/**
 * The proof's widgets in a terminal: `node packages/core/demo/terminal.js` (or `bun`). A menu, a list reordered by
 * dragging with the mouse or by Alt+ArrowUp/Down, and a dialog with a select, composed into one app widget. The
 * collection is a source the host answers from, after a random delay, so answers arrive out of order and the widgets
 * drop the stale ones; a move shows at once and the source confirms it later. Tab moves focus, Ctrl+C quits.
 */

import { compose } from '../src/compose.js'
import { part } from '../src/contract.js'
import { dialog } from '../src/dialog.js'
import { arraySource } from '../src/host.js'
import { menu } from '../src/menu.js'
import { reorderList } from '../src/reorder.js'
import { select } from '../src/select.js'
import { renderTerminal } from '../src/terminal.js'

/** @import { Source } from '../src/host.js' */
/** @import { Key } from '../src/contract.js' */

const kept = arraySource([
  'Apple',
  'Banana',
  'Cherry',
  'Date',
  'Elderberry',
  'Fig',
  'Grape',
  'Honeydew',
  'Kiwi',
  'Lemon',
])

/**
 * A promise of a value, after a random delay
 * @template T
 * @param {() => T} value - Makes the value
 * @returns {Promise<T>} It, later
 */
async function later(value) {
  const { promise, resolve } = Promise.withResolvers()
  setTimeout(resolve, 20 + Math.random() * 150)
  await promise
  return value()
}

/** @type {Source} */
const fruit = {
  move: async (item, target, after) => later(() => kept.move(item, target, after)),
  read: async (question) => later(() => kept.read(question)),
  watch: kept.watch,
}

/**
 * The app's first own state: nothing picked, the dialog closed
 * @returns {Readonly<{ open: boolean, picked: Key | null }>} The state
 */
function nothing() {
  return { open: false, picked: null }
}

const app = compose({
  children: { actions: menu, order: reorderList, picker: dialog(select, ['content', 'trigger']) },
  init: () => [nothing(), []],
  on: {
    actions: {
      activate: (own, effect) => (effect.item === 'pick' ? [{ ...own, open: true }, []] : [own, []]),
    },
    picker: {
      change: (own, effect, from) =>
        from.length === 0 || typeof effect.value === 'boolean'
          ? [{ ...own, open: false }, []]
          : [{ ...own, picked: effect.value }, []],
    },
  },
  props: {
    actions: () => ({
      items: [
        { disabled: false, key: 'pick', text: 'Pick a fruit…' },
        { disabled: false, key: 'shuffle', text: 'Shuffle' },
        { disabled: true, key: 'nothing', text: 'Nothing (disabled)' },
      ],
      label: 'Actions',
    }),
    order: () => ({
      dragDistance: 1,
      focusable: true,
      keyshortcuts: 'Alt+ArrowUp Alt+ArrowDown',
      label: 'Fruit, in order',
      rows: 6,
      shown: true,
      source: 'fruit',
    }),
    picker: (own) => ({
      closeLabel: 'Close',
      content: { label: 'Fruit', placeholder: 'Choose…', rows: 4, source: 'fruit', value: own.picked },
      open: own.open,
      title: 'Pick a fruit',
    }),
  },
  step: (own) => [own, []],
  view: (own) => ({
    picked: part({
      content: own.picked === null ? [{ text: 'Nothing picked' }] : [{ text: 'Picked: ' }, { item: own.picked }],
    }),
    root: part({ content: [{ child: 'actions' }, { part: 'picked' }, { child: 'order' }, { child: 'picker' }] }),
  }),
})

const shown = renderTerminal({
  columns: process.stdout.columns,
  effect: (out) => {
    const { effect } = out
    if (
      typeof effect === 'object' &&
      effect !== null &&
      'type' in effect &&
      effect.type === 'activate' &&
      'item' in effect &&
      effect.item === 'shuffle'
    ) {
      kept.set(kept.keys().toSorted(() => Math.random() - 0.5))
    }
  },
  input: process.stdin,
  props: null,
  sources: { fruit },
  widget: app,
  write: (screen) => {
    process.stdout.write(screen)
  },
})

process.stdin.setRawMode(true)
process.stdin.setEncoding('utf8')
process.stdin.on('data', (/** @type {string} */ chunk) => {
  if (chunk.includes('\u0003')) {
    shown.stop()
    process.stdin.setRawMode(false)
    process.exit(0)
  }
})
