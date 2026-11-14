import { describe, expect, test } from 'bun:test'

import { currentCompletions, startCompletion } from '@codemirror/autocomplete'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

import { keyHints } from './key-hints.js'
import { keyboardInset } from './keyboard-inset.js'
import { selectionBar } from './selection-bar.js'
import { suggestions } from './suggestions.js'
import { toolbarKeys } from './toolbar-keys.js'
import { toolbar } from './toolbar.js'

/**
 * A value, set and heard
 * @template T
 * @param {T} initial - Its value
 * @returns {Readonly<{ get: () => T, set: (value: T) => void, watch: (listener: () => void) => () => void }>} The value
 */
function held(initial) {
  let value = initial
  /** @type {Set<() => void>} */
  const listeners = new Set()
  return {
    get: () => value,
    set(next) {
      value = next
      for (const listener of listeners) {
        listener()
      }
    },
    watch(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

/**
 * Presses a key where focus is
 * @param {string} key - The key
 */
function press(key) {
  document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }))
}

/**
 * An editor over a text
 * @param {string} doc - The text
 * @param {readonly import('@codemirror/state').Extension[]} [extensions] - Its extensions
 * @returns {EditorView} The editor
 */
function viewOver(doc, extensions = []) {
  return new EditorView({ parent: document.createElement('div'), state: EditorState.create({ doc, extensions }) })
}

/** @type {import('./tool-buttons.js').Tool} */
const upper = {
  id: 'upper',
  label: 'Upper case',
  on: (state) => state.doc.toString() === state.doc.toString().toUpperCase(),
  run(view) {
    view.dispatch({ changes: { from: 0, insert: view.state.doc.toString().toUpperCase(), to: view.state.doc.length } })
    return true
  },
}

/** @type {import('./tool-buttons.js').Tool} */
const never = {
  applies: () => false,
  id: 'never',
  label: 'Never',
  run() {
    throw new Error('ran a tool that doesn’t apply')
  },
}

/**
 * Suggests macros after `{{`
 * @type {import('./suggestions.js').Suggest}
 */
function macros(read, pos) {
  const before = read(Math.max(0, pos - 2), pos)
  return before === '{{'
    ? {
        from: pos,
        options: [
          {
            apply(view, from, to) {
              view.dispatch({ changes: { from, insert: 'user}}', to } })
            },
            label: 'user',
          },
        ],
        to: pos,
      }
    : undefined
}

/**
 * A block-type option in a section, drawn with an icon naming it
 * @param {string} label - Its label
 * @param {string} section - Its section
 * @returns {import('./suggestions.js').Option} The option
 */
function blockOption(label, section) {
  return {
    apply() {
      // Nothing to apply
    },
    icon: () => Object.assign(document.createElement('i'), { className: `icon-${label}` }),
    label,
    section,
  }
}

/**
 * Suggests block types wherever the cursor is, in an order no sort by label gives
 * @type {import('./suggestions.js').Suggest}
 */
function blocks(_read, pos) {
  return {
    from: pos,
    options: [
      blockOption('Text', 'Basic'),
      blockOption('Heading', 'Basic'),
      blockOption('Page', 'Insert'),
      blockOption('Bulleted', 'Basic'),
    ],
    to: pos,
  }
}

describe('toolbar', () => {
  test('draws a button per tool, its state following the editor', () => {
    const view = viewOver('abc')
    const bar = toolbar({ tools: held([upper, never]), view })
    const [button, other] = bar.element.querySelectorAll('button')
    expect(bar.element.getAttribute('role')).toBe('toolbar')
    expect(button?.getAttribute('aria-pressed')).toBe('false')
    expect(other?.getAttribute('aria-disabled')).toBe('true')
    button?.click()
    expect(view.state.doc.toString()).toBe('ABC')
    expect(button?.getAttribute('aria-pressed')).toBe('true')
    other?.click()
    bar.stop()
    view.destroy()
  })

  test('key hints name each key in its tooltip, and show them all while a modifier is held', () => {
    const view = viewOver('abc')
    const showing = held(false)
    const bar = toolbar({ tools: held([upper, never]), view })
    const stop = keyHints({
      buttons: bar.buttons,
      held: showing,
      keyOf: (id) => (id === 'upper' ? ['Ctrl', 'U'] : undefined),
    })
    const [button, other] = bar.element.querySelectorAll('button')
    expect(button?.title).toBe('Upper case (Ctrl U)')
    expect(other?.title).toBe('Never')
    expect(button?.dataset['keys']).toBeUndefined()
    showing.set(true)
    expect(button?.dataset['keys']).toBe('Ctrl U')
    expect(other?.dataset['keys']).toBeUndefined()
    stop()
    bar.stop()
    view.destroy()
  })

  test('redraws its buttons when the tools change', () => {
    const view = viewOver('abc')
    const tools = held([upper])
    const bar = toolbar({ tools, view })
    tools.set([never, upper])
    expect(
      [...bar.element.querySelectorAll('[data-tool]')].map((each) =>
        each instanceof HTMLElement ? each.dataset['tool'] : undefined,
      ),
    ).toEqual(['never', 'upper'])
    bar.stop()
    view.destroy()
  })

  test('its keys: one Tab stop, the arrows along it moving and wrapping, Home and End, followed through a redraw', () => {
    const view = viewOver('abc')
    const tools = held([upper, never, { ...upper, id: 'third', label: 'Third' }])
    const bar = toolbar({ tools, view })
    document.body.append(bar.element)
    const stop = toolbarKeys({ buttons: bar.buttons, element: bar.element })
    const buttons = () => [...bar.element.querySelectorAll('button')]
    const stops = () =>
      [...bar.element.querySelectorAll('[data-tool]')].map((each) =>
        each instanceof HTMLElement ? each.tabIndex : undefined,
      )
    expect(bar.element.getAttribute('aria-orientation')).toBe('horizontal')
    expect(stops()).toEqual([0, -1, -1])
    buttons()[0]?.focus()
    press('ArrowRight')
    expect(document.activeElement === buttons()[1]).toBe(true)
    expect(stops()).toEqual([-1, 0, -1])
    press('ArrowLeft')
    press('ArrowLeft')
    expect(document.activeElement === buttons()[2]).toBe(true)
    press('Home')
    expect(document.activeElement === buttons()[0]).toBe(true)
    press('End')
    expect(document.activeElement === buttons()[2]).toBe(true)
    press('ArrowDown')
    expect(document.activeElement === buttons()[2]).toBe(true)
    tools.set([never, upper])
    expect(stops()).toEqual([0, -1])
    stop()
    expect(stops()).toEqual([0, 0])
    bar.stop()
    bar.element.remove()
    view.destroy()
  })
})

describe('selectionBar', () => {
  test('is closed while the editor doesn’t have focus, and goes when stopped', () => {
    const view = viewOver('some text')
    const bar = selectionBar({ tools: [upper], view })
    expect(bar.element.parentElement).toBe(view.dom)
    view.dispatch({ selection: { anchor: 0, head: 4 } })
    expect(bar.open.get()).toBe(false)
    bar.stop()
    expect(bar.element.parentElement).toBeNull()
    view.destroy()
  })
})

describe('suggestions', () => {
  test('shows what a source answers for the text before the cursor', async () => {
    const view = viewOver('hi {{', [suggestions([macros])])
    view.dispatch({ selection: { anchor: 5 } })
    startCompletion(view)
    await Bun.sleep(100)
    expect(currentCompletions(view.state).map((completion) => completion.label)).toEqual(['user'])
    view.destroy()
  })

  test("options keep their answer's order, sections in the order they first come, each with its icon", async () => {
    const view = viewOver('', [suggestions([blocks])])
    startCompletion(view)
    await Bun.sleep(100)
    expect(currentCompletions(view.state).map((completion) => completion.label)).toEqual([
      'Text',
      'Heading',
      'Bulleted',
      'Page',
    ])
    const drawn = [...view.dom.querySelectorAll('.cm-tooltip-autocomplete li')]
    expect(drawn.map((li) => li.querySelector('i')?.className)).toEqual([
      'icon-Text',
      'icon-Heading',
      'icon-Bulleted',
      'icon-Page',
    ])
    expect(
      [...view.dom.querySelectorAll('.cm-tooltip-autocomplete completion-section')].map((h) => h.textContent),
    ).toEqual(['Basic', 'Insert'])
    view.destroy()
  })
})

describe('keyboardInset', () => {
  test('is how much of the window the visual viewport leaves at the bottom', () => {
    const viewport = Object.assign(new EventTarget(), { height: 800, offsetTop: 0 })
    const inset = keyboardInset({ window: { innerHeight: 800, visualViewport: viewport } })
    let heard = 0
    inset.watch(() => {
      heard += 1
    })
    expect(inset.get()).toBe(0)
    viewport.height = 500
    viewport.dispatchEvent(new Event('resize'))
    expect(inset.get()).toBe(300)
    expect(heard).toBe(1)
    inset.stop()
  })

  test('is zero without a visual viewport', () => {
    // oxlint-disable-next-line unicorn/no-null -- a window without a visual viewport has null there
    expect(keyboardInset({ window: { innerHeight: 800, visualViewport: null } }).get()).toBe(0)
  })
})
