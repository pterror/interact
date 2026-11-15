/**
 * The proof's widgets in a terminal: `node packages/core/demo/terminal.js` (or `bun`). A menu, a list reordered by
 * dragging with the mouse or by Alt+ArrowUp/Down, and a dialog with a select, composed into one app widget. The
 * collection is held here, as a server would hold it, and answers asks after a random delay, so answers arrive out of
 * order and the widgets drop the stale ones. Tab moves focus, Ctrl+C quits.
 */

import { compose } from '../src/compose.js'
import { part } from '../src/contract.js'
import { dialog } from '../src/dialog.js'
import { menu } from '../src/menu.js'
import { reorderList } from '../src/reorder.js'
import { select } from '../src/select.js'
import { renderTerminal } from '../src/terminal.js'

/** @import { CompositeSpec } from '../src/compose.js' */
/** @import { Key, PropsInput } from '../src/contract.js' */

const fruit = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry', 'Fig', 'Grape', 'Honeydew', 'Kiwi', 'Lemon', 'Mango']
let revision = 0

const picker = dialog(select, ['content', 'trigger'])
const children = { actions: menu, order: reorderList, picker }

/**
 * @typedef {Readonly<{ open: boolean, fruit: Key | null, revision: number }>} AppOwn
 * @typedef {Readonly<{ revision: number }>} AppProps
 */

/** @type {CompositeSpec<AppProps, AppOwn, PropsInput<AppProps>, Readonly<{ type: 'activate', item: Key }>, typeof children>} */
const spec = {
  children,
  init: (props) => ({ fruit: null, open: false, revision: props.revision }),
  on: {
    actions: {
      activate: (state, effect) => (effect.item === 'pick' ? [{ ...state, open: true }, []] : [state, [effect]]),
    },
    picker: {
      change: (state, effect, from) =>
        from.length === 0 || typeof effect.value === 'boolean'
          ? [{ ...state, open: false }, []]
          : [{ ...state, fruit: effect.value }, []],
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
    order: (state) => ({ focusable: true, label: 'Fruit, in order', revision: state.revision, rows: 6, shown: true }),
    picker: (state) => ({
      closeLabel: 'Close',
      content: { label: 'Fruit', placeholder: 'Choose…', revision: state.revision, rows: 4, value: state.fruit },
      open: state.open,
      title: 'Pick a fruit',
    }),
  },
  step: (state, input) => [{ ...state, revision: input.props.revision }, []],
  view: (state) => ({
    picked: part({
      content: state.fruit === null ? [{ text: 'Nothing picked' }] : [{ text: 'Picked: ' }, { item: state.fruit }],
    }),
    root: part({ content: [{ child: 'actions' }, { part: 'picked' }, { child: 'order' }, { child: 'picker' }] }),
  }),
}
const app = compose(spec)

/**
 * A field of an effect
 * @param {unknown} effect - The effect
 * @param {string} name - The field
 * @returns {unknown} Its value
 */
function field(effect, name) {
  return typeof effect === 'object' && effect !== null && name in effect
    ? Object.getOwnPropertyDescriptor(effect, name)?.value
    : null
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
 * Tells every list the collection changed
 * @returns {void}
 */
function changed() {
  revision += 1
  shown.host.setProps({ revision })
}

const shown = renderTerminal({
  announce: (message) =>
    message['what'] === 'moved'
      ? `${text(message['item'])} moved to position ${text(message['position'])} of ${text(message['count'])}`
      : `${text(message['item'])}: move cancelled`,
  columns: process.stdout.columns,
  effect: (out, running) => {
    const { effect } = out
    switch (field(effect, 'type')) {
      case 'ask': {
        const id = field(effect, 'id')
        const ranks = field(effect, 'ranks')
        const located = fruit.indexOf(String(field(effect, 'locate')))
        const rows = Number(field(effect, 'rows'))
        const [from, to] = Array.isArray(ranks)
          ? ranks.map(Number)
          : [Math.max(0, located - Math.floor(rows / 2)), Math.max(0, located - Math.floor(rows / 2)) + rows]
        const keys = fruit.slice(from, to)
        setTimeout(
          () => {
            running.dispatch(out.from, { count: fruit.length, from, id, keys, type: 'answer' })
          },
          20 + Math.random() * 150,
        )
        break
      }
      case 'move': {
        const item = String(field(effect, 'item'))
        fruit.splice(fruit.indexOf(item), 1)
        const at = fruit.indexOf(String(field(effect, 'target')))
        fruit.splice(field(effect, 'after') === true ? at + 1 : at, 0, item)
        setTimeout(changed, 60)
        break
      }
      case 'activate': {
        if (field(effect, 'item') === 'shuffle') {
          fruit.sort(() => Math.random() - 0.5)
          changed()
        }
        break
      }
      default: {
        break
      }
    }
  },
  input: process.stdin,
  item: String,
  props: { revision },
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
