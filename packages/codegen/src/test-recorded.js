/**
 * Recorded runs for the equivalence tests: the sessions the core's own tests walk through, as inputs
 */

import { answerFor, click, keydown, pointer } from './test-equivalence.js'

/** @import { CompositeRun, LeafRun } from './test-equivalence.js' */

const HUNDRED = Array.from({ length: 100 }, (_, index) => `k${String(index)}`)
const SIX = ['a', 'b', 'c', 'd', 'e', 'f']
const FRUIT = ['apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape']

/**
 * An answer from a collection
 * @param {number} id - The ask's id
 * @param {readonly (string | number)[]} keys - The collection
 * @param {number} from - The first rank
 * @param {number} to - The rank after the last
 * @returns {Record<string, unknown>} The answer
 */
function answer(id, keys, from, to) {
  return answerFor(keys, { id, ranks: [from, to] })
}

const LIST = { focusable: true, hover: false, label: 'Fruit', rows: 5, selected: null, shown: true, source: 'fruit' }

/** @type {readonly LeafRun[]} */
const LIST_RUNS = [
  {
    inputs: [
      answer(1, HUNDRED, 0, 6),
      ...Array.from({ length: 6 }, () => keydown('root', 'ArrowDown')),
      keydown('root', 'PageDown'),
      answer(3, HUNDRED, 4, 11),
      keydown('root', 'End'),
      keydown('root', 'Home'),
      answer(4, HUNDRED, 94, 100),
      answer(5, HUNDRED, 0, 6),
      click('option', 'k2'),
      { item: 'k0', part: 'option', size: 24, timeStamp: 0, type: 'measured' },
      { item: null, offset: 240, part: 'root', timeStamp: 0, type: 'scroll' },
      answer(6, HUNDRED, 9, 16),
      { type: 'changed' },
      answer(7, ['k1', 'k2', 'k0', ...HUNDRED.slice(3)], 9, 16),
    ],
    props: LIST,
  },
  {
    inputs: [
      answer(1, HUNDRED, 0, 6),
      click('option', 'k2'),
      { props: { ...LIST, selected: { value: 'k2' } }, type: 'props' },
      click('option', 'k3'),
      { id: 2, type: 'refused' },
      keydown('root', ' '),
    ],
    props: { ...LIST, selected: { value: 'k1' } },
  },
  {
    inputs: [
      { props: { ...LIST, selected: { value: 'k50' }, shown: true }, type: 'props' },
      answerFor(HUNDRED, { id: 1, locate: 'k50', rows: 7 }),
      keydown('root', 'ArrowUp'),
      { props: { ...LIST, selected: { value: 'k50' }, shown: false }, type: 'props' },
    ],
    props: { ...LIST, selected: { value: 'k50' }, shown: false },
  },
]

const REORDER = { ...LIST, dragDistance: 4, keyshortcuts: 'Alt+ArrowUp Alt+ArrowDown', rows: 4, source: 'order' }

/** @type {readonly LeafRun[]} */
const REORDER_RUNS = [
  {
    inputs: [
      answer(1, SIX, 0, 5),
      pointer('pointerdown', 'option', 'b', 10, 30),
      pointer('pointermove', 'option', 'b', 10, 32),
      pointer('pointermove', 'option', 'b', 10, 40),
      pointer('pointermove', 'option', 'd', 10, 70),
      pointer('pointerup', 'option', 'd', 10, 70),
      click('option', 'd'),
      pointer('pointerdown', 'option', 'c', 0, 50),
      pointer('pointermove', 'option', 'c', 0, 60),
      pointer('pointermove', 'option', 'a', 0, 10),
      keydown('root', 'Escape'),
    ],
    props: REORDER,
  },
  {
    inputs: [
      answer(1, SIX, 0, 5),
      keydown('root', 'ArrowDown'),
      keydown('root', 'ArrowDown', { altKey: true }),
      keydown('root', 'ArrowDown', { altKey: true }),
      { id: 1, type: 'confirmed' },
      { type: 'changed' },
      answer(2, ['b', 'a', 'c', 'd', 'e', 'f'], 0, 5),
      { id: 2, type: 'refused' },
      pointer('pointerdown', 'option', 'c', 0, 50),
      pointer('pointerup', 'option', 'c', 0, 50),
      click('option', 'c'),
    ],
    props: REORDER,
  },
]

const MENU = { disabled: ['copy'], label: 'Edit', source: 'edit' }
const EDIT = ['cut', 'copy', 'paste', 'pin']

/** @type {readonly LeafRun[]} */
const MENU_RUNS = [
  {
    inputs: [
      click('button'),
      answer(1, EDIT, 0, 64),
      keydown('item', 'ArrowUp', { item: 'cut' }),
      keydown('item', 'Escape', { item: 'pin' }),
      click('button'),
      keydown('item', 'ArrowDown'),
      keydown('item', 'Enter'),
      click('item', 'paste'),
      click('button'),
      keydown('item', 'p', { timeStamp: 1000 }),
      keydown('item', 'i', { timeStamp: 1100 }),
      { id: 1, key: 'paste', type: 'found' },
      { id: 2, key: 'pin', type: 'found' },
      { now: 1600, type: 'time' },
      keydown('item', 'p', { timeStamp: 2000 }),
      keydown('item', 'p', { timeStamp: 2100 }),
    ],
    props: MENU,
  },
]

const SELECT = { disabled: false, label: 'Fruit', placeholder: 'Choose', rows: 4, source: 'fruit', value: null }

/** @type {readonly CompositeRun[]} */
const SELECT_RUNS = [
  {
    deliveries: [
      { input: keydown('trigger', 'ArrowDown'), path: [] },
      { input: answer(1, FRUIT, 0, 5), path: ['list'] },
      { input: keydown('trigger', 'ArrowDown'), path: [] },
      { input: keydown('trigger', 'ArrowDown'), path: [] },
      { input: keydown('trigger', 'Enter'), path: [] },
      { input: click('trigger'), path: [] },
      { input: { button: 0, item: 'cherry', part: 'option', timeStamp: 0, type: 'mousedown' }, path: ['list'] },
      { input: click('option', 'cherry'), path: ['list'] },
      { input: { id: 2, type: 'refused' }, path: [] },
      { input: keydown('trigger', 'End'), path: [] },
      { input: answer(2, FRUIT, 2, 8), path: ['list'] },
      { input: keydown('trigger', 'c', { timeStamp: 3000 }), path: [] },
      { input: { id: 1, key: 'cherry', type: 'found' }, path: ['list'] },
      { input: keydown('trigger', 'h', { timeStamp: 3100 }), path: [] },
      { input: { now: 3700, type: 'time' }, path: ['list'] },
      { input: keydown('trigger', 'Escape'), path: [] },
      { input: pointer('pointerdown', 'trigger', null, 0, 0), path: [] },
      { input: pointer('pointermove', 'option', 'banana', 0, 30), path: ['list'] },
      { input: pointer('pointerup', 'option', 'banana', 0, 30), path: ['list'] },
      { input: click('trigger'), path: [] },
      { input: { item: null, part: 'trigger', timeStamp: 0, type: 'blur' }, path: [] },
    ],
    props: SELECT,
  },
  {
    deliveries: [
      { input: click('trigger'), path: [] },
      { input: answerFor(FRUIT, { id: 1, locate: 'cherry', rows: 6 }), path: ['list'] },
      { input: click('option', 'fig'), path: ['list'] },
      { input: { props: { ...SELECT, value: { value: 'fig' } }, type: 'props' }, path: [] },
    ],
    props: { ...SELECT, value: { value: 'cherry' } },
  },
]

const DIALOG = {
  closeLabel: 'Close',
  ignoreOutside: false,
  content: { ...SELECT, rows: 3 },
  open: true,
  title: 'Pick a fruit',
}

/** @type {readonly CompositeRun[]} */
const DIALOG_RUNS = [
  {
    deliveries: [
      { input: keydown('trigger', 'Escape'), path: ['content'] },
      { input: { id: 1, type: 'refused' }, path: [] },
      { input: click('trigger'), path: ['content'] },
      { input: answer(1, FRUIT.slice(0, 3), 0, 4), path: ['content', 'list'] },
      { input: keydown('trigger', 'Escape'), path: ['content'] },
      { input: click('trigger'), path: ['content'] },
      { input: click('option', 'banana'), path: ['content', 'list'] },
      { input: click('close'), path: [] },
      { input: { props: { ...DIALOG, open: false }, type: 'props' }, path: [] },
      { input: { props: DIALOG, type: 'props' }, path: [] },
    ],
    props: DIALOG,
  },
]

export { DIALOG_RUNS, LIST_RUNS, MENU_RUNS, REORDER_RUNS, SELECT_RUNS }
