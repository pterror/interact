import { describe, expect, test } from 'bun:test'

import { dialog } from './dialog.js'
import { reorderList } from './reorder.js'
import { select } from './select.js'
import { parseInput, renderTerminal } from './terminal.js'

/** @import { AnyWidget, Out } from './compose.js' */
/** @import { Host } from './host.js' */

const ESC = '\u001B'
const FRUIT = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry', 'Fig']

/**
 * Runs a widget in a terminal that is only a string, answering asks from `FRUIT`
 * @param {AnyWidget} widget - The widget
 * @param {unknown} props - Its props
 * @returns {Readonly<{ feed: (text: string) => void, screen: () => readonly string[], heard: readonly Out[] }>} Input,
 *   the screen, and the app's other effects
 */
function terminal(widget, props) {
  /** @type {Out[]} */
  const heard = []
  /**
   * Answers asks; keeps the rest
   * @param {Out} out - An effect
   * @param {Host} running - The widget
   * @returns {void}
   */
  const effect = (out, running) => {
    const { effect: made } = out
    if (typeof made === 'object' && made !== null && 'type' in made && made.type === 'ask' && 'id' in made) {
      const [from, to] = 'ranks' in made && Array.isArray(made.ranks) ? made.ranks.map(Number) : [0, FRUIT.length]
      running.dispatch(out.from, {
        count: FRUIT.length,
        from,
        id: made.id,
        keys: FRUIT.slice(from, to),
        type: 'answer',
      })
    } else {
      heard.push(out)
    }
  }
  const shown = renderTerminal({
    announce: (message) =>
      `${typeof message['item'] === 'string' ? message['item'] : ''} ${typeof message['what'] === 'string' ? message['what'] : ''}`,
    columns: 60,
    effect,
    input: { off: () => undefined, on: () => undefined },
    item: String,
    props,
    widget,
    write: () => undefined,
  })
  return { feed: shown.feed, heard, screen: shown.screen }
}

/**
 * An SGR mouse report
 * @param {number} button - The button code
 * @param {number} x - The column, from 1
 * @param {number} y - The row, from 1
 * @param {boolean} release - Whether it is a release
 * @returns {string} The report
 */
function mouse(button, x, y, release = false) {
  return `${ESC}[<${String(button)};${String(x)};${String(y)}${release ? 'm' : 'M'}`
}

describe('terminal input', () => {
  test('becomes UI Events key values, modifiers and mouse reports', () => {
    expect(parseInput(`${ESC}[A${ESC}[1;3B\r \tx${ESC}[Z${ESC}${ESC}[6~\u0003`)).toEqual([
      { altKey: false, ctrlKey: false, key: 'ArrowUp', kind: 'key', shiftKey: false },
      { altKey: true, ctrlKey: false, key: 'ArrowDown', kind: 'key', shiftKey: false },
      { altKey: false, ctrlKey: false, key: 'Enter', kind: 'key', shiftKey: false },
      { altKey: false, ctrlKey: false, key: ' ', kind: 'key', shiftKey: false },
      { altKey: false, ctrlKey: false, key: 'Tab', kind: 'key', shiftKey: false },
      { altKey: false, ctrlKey: false, key: 'x', kind: 'key', shiftKey: false },
      { altKey: false, ctrlKey: false, key: 'Tab', kind: 'key', shiftKey: true },
      { altKey: false, ctrlKey: false, key: 'Escape', kind: 'key', shiftKey: false },
      { altKey: false, ctrlKey: false, key: 'PageDown', kind: 'key', shiftKey: false },
      { kind: 'quit' },
    ])
    expect(parseInput(`${mouse(0, 3, 4)}${mouse(32, 3, 6)}${mouse(0, 3, 6, true)}`)).toEqual([
      { button: 0, kind: 'mouse', motion: false, release: false, x: 3, y: 4 },
      { button: 0, kind: 'mouse', motion: true, release: false, x: 3, y: 6 },
      { button: 0, kind: 'mouse', motion: false, release: true, x: 3, y: 6 },
    ])
  })
})

const SELECT = { label: 'Fruit', placeholder: 'Choose', revision: 0, rows: 4 }

describe('the terminal renderer', () => {
  test('draws the select by role, and runs it from the keys, the trigger having focus', () => {
    const shown = terminal(select, SELECT)
    expect(shown.screen()).toEqual(['Fruit: [ Choose ▾ ]'])
    shown.feed(`${ESC}[B${ESC}[B${ESC}[B`)
    expect(shown.screen()).toEqual(['Fruit: [ Choose ▴ ]', '    Apple', '    Banana', '    Cherry', '    Date'])
    shown.feed('\r')
    expect(shown.screen()).toEqual(['Fruit: [ Banana ▾ ]'])
    expect(shown.heard.map((out) => out.effect)).toEqual([{ type: 'change', value: 'Banana' }])
  })

  test('a mouse press on an option keeps focus on the trigger, and its click chooses', () => {
    const shown = terminal(select, SELECT)
    shown.feed(`${mouse(0, 10, 1)}${mouse(0, 10, 1, true)}`)
    expect(shown.screen()).toHaveLength(5)
    shown.feed(`${mouse(0, 6, 4)}${mouse(0, 6, 4, true)}`)
    expect(shown.screen()).toEqual(['Fruit: [ Cherry ▾ ]'])
    shown.feed(`${ESC}[B`)
    expect(shown.screen()[3]).toBe('  ✓ Cherry')
  })

  test('a mouse drag reorders, shown as it goes, and Alt+ArrowDown moves the active option', () => {
    const shown = terminal(reorderList, { focusable: true, label: 'Order', revision: 0, rows: 4, shown: true })
    shown.feed(`${mouse(0, 4, 1)}${mouse(32, 4, 2)}${mouse(32, 4, 3)}`)
    expect(shown.screen()).toEqual(['  ⠿ Apple', '    Banana', '    Cherry', '  ──────', '    Date'])
    shown.feed(mouse(0, 4, 3, true))
    expect(shown.heard.map((out) => out.effect)).toEqual([
      { after: true, item: 'Apple', target: 'Cherry', type: 'move' },
    ])
    const keyed = terminal(reorderList, { focusable: true, label: 'Order', revision: 0, rows: 4, shown: true })
    keyed.feed(`${ESC}[B${ESC}[1;3B`)
    expect(keyed.heard.map((out) => out.effect)).toEqual([
      { after: true, item: 'Apple', target: 'Banana', type: 'move' },
    ])
  })

  test('Tab stays inside a shown dialog, and Escape from a closed select inside reaches the dialog', () => {
    const shown = terminal(dialog(select, ['content', 'trigger']), {
      closeLabel: 'Close',
      content: SELECT,
      open: true,
      title: 'Pick a fruit',
    })
    expect(shown.screen()).toEqual(['┌─ Pick a fruit ─', '│ Fruit: [ Choose ▾ ]', '│ [ Close ]', '└────'])
    shown.feed('\t\r')
    expect(shown.heard.map((out) => out.effect)).toEqual([{ type: 'change', value: false }])
    shown.feed(`\t${ESC}`)
    expect(shown.heard.map((out) => out.effect)).toEqual([
      { type: 'change', value: false },
      { type: 'change', value: false },
    ])
  })
})
