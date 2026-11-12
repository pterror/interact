import { describe, expect, test } from 'bun:test'

import { currentCompletions, startCompletion } from '@codemirror/autocomplete'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

import { keyboardInset } from './keyboard-inset.js'
import { selectionBar } from './selection-bar.js'
import { suggestions } from './suggestions.js'
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

  test('names each key in its tooltip, and shows them all while a modifier is held', () => {
    const view = viewOver('abc')
    const showing = held(false)
    const bar = toolbar({
      held: showing,
      keyOf: (id) => (id === 'upper' ? ['Ctrl', 'U'] : undefined),
      tools: held([upper, never]),
      view,
    })
    const [button, other] = bar.element.querySelectorAll('button')
    expect(button?.title).toBe('Upper case (Ctrl U)')
    expect(button?.dataset['keys']).toBeUndefined()
    showing.set(true)
    expect(button?.dataset['keys']).toBe('Ctrl U')
    expect(other?.dataset['keys']).toBeUndefined()
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
