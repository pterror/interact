import { describe, expect, test } from 'bun:test'

import { isRecord, resolve } from './compose.js'
import { part, ref } from './contract.js'
import { dialog } from './dialog.js'
import { arraySource } from './host.js'
import { reorderList } from './reorder.js'
import { select } from './select.js'
import { layout, parseInput, renderTerminal } from './terminal.js'

/** @import { AnyWidget, Out } from './compose.js' */
/** @import { DrawPart } from './terminal.js' */

const ESC = '\u001B'
const FRUIT = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry', 'Fig']

/**
 * Runs a widget in a terminal that is only a string, its lists over `FRUIT` as the host's source `fruit`
 * @param {AnyWidget} widget - The widget
 * @param {unknown} props - Its props
 * @param {Readonly<{ [name: string]: DrawPart }>} parts - Parts the app draws itself
 * @returns {Readonly<{ feed: (text: string) => Promise<void>, screen: () => readonly string[], heard: () => readonly unknown[] }>}
 *   Input (resolving once the source's answers came), the screen, and the app's effects but `active`
 */
function terminal(widget, props, parts = {}) {
  /** @type {Out[]} */
  const heard = []
  const shown = renderTerminal({
    columns: 60,
    effect: (out) => {
      heard.push(out)
    },
    input: { off: () => undefined, on: () => undefined },
    parts,
    props,
    sources: { fruit: arraySource(FRUIT) },
    widget,
    write: () => undefined,
  })
  return {
    feed: async (text) => {
      shown.feed(text)
      await Bun.sleep(0)
    },
    heard: () => heard.map((out) => out.effect).filter((effect) => isRecord(effect) && effect['type'] !== 'active'),
    screen: shown.screen,
  }
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

const SELECT = { disabled: false, label: 'Fruit', placeholder: 'Choose', rows: 4, source: 'fruit', value: null }
const ORDER = {
  dragDistance: 1,
  focusable: true,
  hover: false,
  keyshortcuts: 'Alt+ArrowUp Alt+ArrowDown',
  label: 'Order',
  rows: 4,
  selected: null,
  shown: true,
  source: 'fruit',
}

describe('the terminal renderer', () => {
  test('draws the select by role, and runs it from the keys, the trigger having focus', async () => {
    const shown = terminal(select, SELECT)
    expect(shown.screen()).toEqual(['Fruit: [ Choose ▾ ]'])
    await shown.feed(`${ESC}[B`)
    await shown.feed(`${ESC}[B`)
    expect(shown.screen()).toEqual([
      'Fruit: [ Choose ▴ ]',
      '           Apple',
      '           Banana',
      '           Cherry',
      '           Date',
    ])
    await shown.feed('\r')
    expect(shown.screen()).toEqual(['Fruit: [ Banana ▾ ]'])
    expect(shown.heard()).toEqual([{ id: 1, type: 'change', value: 'Banana' }])
  })

  test('a mouse press on an option keeps focus on the trigger, and its click chooses', async () => {
    const shown = terminal(select, SELECT)
    await shown.feed(`${mouse(0, 10, 1)}${mouse(0, 10, 1, true)}`)
    expect(shown.screen()).toHaveLength(5)
    await shown.feed(`${mouse(0, 14, 4)}${mouse(0, 14, 4, true)}`)
    expect(shown.screen()).toEqual(['Fruit: [ Cherry ▾ ]'])
    await shown.feed(`${ESC}[B`)
    expect(shown.screen()[3]).toBe('         ✓ Cherry')
  })

  test('draws a part the way the app says, still lit when active', async () => {
    const shown = terminal(select, SELECT, {
      option: (_node, look) => `${look.lit ? '>' : ' '} ${look.text.toUpperCase()}`,
    })
    await shown.feed(`${ESC}[B`)
    expect(shown.screen().slice(1, 3)).toEqual(['         > APPLE', '           BANANA'])
  })

  test('a mouse drag a cell far reorders, shown as it goes and at once on release, and Alt+ArrowDown goes on from it', async () => {
    const shown = terminal(reorderList, ORDER)
    await shown.feed('')
    await shown.feed(`${mouse(0, 4, 1)}${mouse(32, 4, 2)}${mouse(32, 4, 3)}`)
    expect(shown.screen()).toEqual(['  ⠿ Apple', '    Banana', '    Cherry', '  ──────', '    Date'])
    const releasing = shown.feed(mouse(0, 4, 3, true))
    expect(shown.screen()).toEqual(['    Banana', '    Cherry', '    Apple', '    Date'])
    await releasing
    await shown.feed(`${ESC}[1;3B`)
    expect(shown.screen()).toEqual(['    Banana', '    Cherry', '    Date', '    Apple'])
    await shown.feed('')
    expect(shown.screen()).toEqual(['    Banana', '    Cherry', '    Date', '    Apple'])
    expect(shown.heard()).toEqual([])
  })

  test("draws a popup over what is below its anchor, or above it when it doesn't fit below the screen", () => {
    const lines = ['one', 'two', 'three', 'four']
    /** @type {AnyWidget} */
    const page = {
      init: () => [null, []],
      step: (state) => [state, []],
      view: () => ({
        button: part({ content: [{ text: 'Menu' }], role: 'button' }),
        line: (key) => part({ content: [{ text: String(key) }] }),
        list: part({
          content: [{ each: 'line', keys: ['a', 'b'] }],
          popup: { anchor: ref(['button'], null) },
          role: 'menu',
        }),
        root: part({
          content: [
            { each: 'line', keys: lines },
            { part: 'button' },
            { part: 'list' },
            { each: 'line', keys: ['end'] },
          ],
        }),
      }),
    }
    const tree = resolve(page, null, null)
    /**
     * The screen at a height
     * @param {number} height - The screen's height
     * @returns {string[]} Its rows
     */
    const screen = (height) =>
      layout(tree, { focused: null, height, item: (content) => String(content.item), parts: {} }).rows.map((row) =>
        row.map((piece) => piece.text).join(''),
      )
    expect(screen(10)).toEqual(['one', 'two', 'three', 'four', '[ Menu ]', '  a', '  b'])
    expect(screen(6)).toEqual(['one', 'two', '  a', '  b', '[ Menu ]', 'end'])
  })

  test('Tab stays inside a shown dialog, and Escape from a closed select inside reaches the dialog', async () => {
    const shown = terminal(dialog(select, ['content', 'trigger']), {
      closeLabel: 'Close',
      ignoreOutside: false,
      content: SELECT,
      open: true,
      title: 'Pick a fruit',
    })
    expect(shown.screen()).toEqual(['┌─ Pick a fruit ─', '│ Fruit: [ Choose ▾ ]', '│ [ Close ]', '└────'])
    await shown.feed('\t\r')
    expect(shown.heard()).toEqual([{ id: 1, type: 'change', value: false }])
    expect(shown.screen()).toEqual([])
  })

  test('a press inside a shown dialog leaves it open, and one outside it closes it', async () => {
    const shown = terminal(dialog(select, ['content', 'trigger']), {
      closeLabel: 'Close',
      content: SELECT,
      ignoreOutside: false,
      open: true,
      title: 'Pick a fruit',
    })
    await shown.feed(`${mouse(0, 3, 1)}${mouse(0, 3, 1, true)}`)
    expect(shown.heard()).toEqual([])
    await shown.feed(`${mouse(0, 3, 8)}${mouse(0, 3, 8, true)}`)
    expect(shown.heard()).toEqual([{ id: 1, type: 'change', value: false }])
  })
})
