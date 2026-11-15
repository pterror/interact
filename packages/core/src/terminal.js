/**
 * Draws any widget's view in a terminal, generically, by role: a button or combobox is one line in brackets, a
 * listbox or menu a line per option or item, a dialog a box, a heading bold; the focused part and the option a focused
 * part names by `aria-activedescendant` are drawn inverted, a selected option with a tick, a disabled one dim. Raw-mode
 * key presses become `keydown` with UI Events key values, and xterm's SGR mouse reports become pointer events and
 * clicks on the part under the pointer, at 8 by 16 CSS pixels a cell.
 *
 * What a browser does that a terminal doesn't, this does: focus (Tab through the parts with `tabindex` 0, kept inside
 * a shown `aria-modal` part, given back when it closes), a click on a button for Enter and Space, focus on a press,
 * and an event heard by the innermost part listening for it.
 */

import { host as run } from './host.js'
import { identity } from './web.js'

/** @import { AnyWidget, Node as Part, Out, Target } from './compose.js' */
/** @import { Data, Key } from './contract.js' */
/** @import { Host } from './host.js' */

/**
 * The terminal's input: text from a stream in raw mode
 * @typedef {Readonly<{
 *   on: (event: 'data', listener: (chunk: string) => void) => unknown,
 *   off: (event: 'data', listener: (chunk: string) => void) => unknown,
 * }>} TerminalInput
 */

/**
 * @typedef {Readonly<{
 *   widget: AnyWidget,
 *   props: unknown,
 *   item: (key: Key) => string,
 *   announce: (message: Readonly<{ [field: string]: Data }>) => string,
 *   effect: (out: Out, host: Host) => void,
 *   input: TerminalInput,
 *   write: (text: string) => void,
 *   columns: number,
 * }>} TerminalOptions
 */

/**
 * A key pressed, or the mouse pressed, moved or released (`x`, `y`: the cell, from 1)
 * @typedef {Readonly<{ kind: 'key', key: string, altKey: boolean, ctrlKey: boolean, shiftKey: boolean }>
 *   | Readonly<{ kind: 'mouse', button: number, x: number, y: number, motion: boolean, release: boolean }>
 *   | Readonly<{ kind: 'quit' }>} TerminalEvent
 */

/** CSS pixels a cell stands for, across and down: the contract's pointer coordinates are CSS pixels */
const CELL = { x: 8, y: 16 }
const ESC = '\u001B'
const CSI_KEYS = new Map([
  ['A', 'ArrowUp'],
  ['B', 'ArrowDown'],
  ['C', 'ArrowRight'],
  ['D', 'ArrowLeft'],
  ['H', 'Home'],
  ['F', 'End'],
  ['1~', 'Home'],
  ['4~', 'End'],
  ['3~', 'Delete'],
  ['5~', 'PageUp'],
  ['6~', 'PageDown'],
])
const PLAIN_KEYS = new Map([
  ['\r', 'Enter'],
  ['\n', 'Enter'],
  ['\t', 'Tab'],
  ['\u007F', 'Backspace'],
])

/**
 * A key with no modifiers but those given
 * @param {string} key - The UI Events key value
 * @param {Readonly<{ altKey?: boolean, ctrlKey?: boolean, shiftKey?: boolean }>} held - The modifiers held
 * @returns {TerminalEvent} The key
 */
function keyEvent(key, held = {}) {
  return { altKey: false, ctrlKey: false, kind: 'key', shiftKey: false, ...held, key }
}

/**
 * One escape sequence (after ESC), as an event, and how many characters it took
 * @param {string} text - The text after ESC
 * @returns {readonly [TerminalEvent | null, number]} The event, or `null` if it means nothing here, and its length
 */
function escape(text) {
  if (text.startsWith('[<')) {
    const end = text.search(/[Mm]/u)
    const [button = 0, x = 0, y = 0] = text.slice(2, end).split(';').map(Number)
    return [
      { button: button & 3, kind: 'mouse', motion: (button & 32) !== 0, release: text[end] === 'm', x, y },
      end + 1,
    ]
  }
  if (text.startsWith('[') || text.startsWith('O')) {
    const end = text.slice(1).search(/[A-Za-z~]/u) + 1
    const body = text.slice(1, end + 1)
    const [first = '', modifier = '1'] = body.slice(0, -1).split(';')
    const final = body.at(-1) ?? ''
    if (final === 'Z') {
      return [keyEvent('Tab', { shiftKey: true }), end + 1]
    }
    const bits = Number(modifier) - 1
    const key = CSI_KEYS.get(final === '~' ? `${first}~` : final)
    const held = { altKey: (bits & 2) !== 0, ctrlKey: (bits & 4) !== 0, shiftKey: (bits & 1) !== 0 }
    return [key === undefined ? null : keyEvent(key, held), end + 1]
  }
  const next = text[0]
  if (next === undefined || next === ESC) {
    return [keyEvent('Escape'), 0]
  }
  return [keyEvent(PLAIN_KEYS.get(next) ?? next, { altKey: true }), 1]
}

/**
 * What a chunk of raw terminal input says
 * @param {string} text - The input
 * @returns {TerminalEvent[]} The keys and mouse events, in order
 */
function parseInput(text) {
  /** @type {TerminalEvent[]} */
  const events = []
  let at = 0
  while (at < text.length) {
    const character = text[at] ?? ''
    if (character === ESC) {
      const [event, length] = escape(text.slice(at + 1))
      if (event !== null) {
        events.push(event)
      }
      at += 1 + length
    } else {
      const code = character.codePointAt(0) ?? 0
      if (code === 3) {
        events.push({ kind: 'quit' })
      } else if (PLAIN_KEYS.has(character)) {
        events.push(keyEvent(PLAIN_KEYS.get(character) ?? ''))
      } else if (code > 0 && code < 27) {
        events.push(keyEvent(String.fromCodePoint(code + 96), { ctrlKey: true }))
      } else {
        events.push(keyEvent(character))
      }
      at += character.length
    }
  }
  return events
}

/**
 * A run of text on a row, drawn for a part
 * @typedef {Readonly<{ text: string, key: string | null, style: '' | 'inverse' | 'dim' | 'bold' }>} Segment
 */

/**
 * The tree laid out as rows, with which part is where
 * @typedef {Readonly<{ rows: readonly (readonly Segment[])[], nodes: ReadonlyMap<string, Part>, parents: ReadonlyMap<string, string> }>} Layout
 */

/**
 * A segment
 * @param {string} text - Its text
 * @param {string | null} key - The part it is drawn for, or `null`
 * @param {Segment['style']} style - How it is drawn
 * @returns {Segment} The segment
 */
function segment(text, key, style) {
  return { key, style, text }
}

/**
 * The text a part shows inline: its text, its items, and its children's, run together
 * @param {Part} node - The part
 * @param {(key: Key) => string} item - The host's text for an item
 * @returns {string} The text
 */
function textOf(node, item) {
  return node.content
    .map((content) =>
      'target' in content
        ? content.hidden
          ? ''
          : textOf(content, item)
        : 'text' in content
          ? content.text
          : item(content.item),
    )
    .join('')
}

/**
 * Whether a resolved ARIA value names a target
 * @param {unknown} value - The value
 * @returns {value is Target} Whether it does
 */
function isTarget(value) {
  return typeof value === 'object' && value !== null && 'owner' in value && 'part' in value
}

/**
 * Lays a tree out as rows, by role
 * @param {Part} tree - The root
 * @param {Readonly<{ focused: string | null, item: (key: Key) => string }>} options - Which part has focus, and the
 *   host's text for items
 * @returns {Layout} The rows, every part by identity, and each part's parent
 */
function layout(tree, { focused, item }) {
  const naming = { id: '', keyId: String }
  /** @type {Map<string, Part>} */
  const nodes = new Map()
  /** @type {Map<string, string>} */
  const parents = new Map()

  /**
   * Indexes every part, so references can be read
   * @param {Part} node - A part
   * @param {string | null} parent - Its parent's identity
   * @returns {void}
   */
  const index = (node, parent) => {
    const key = identity(node.target, naming)
    nodes.set(key, node)
    if (parent !== null) {
      parents.set(key, parent)
    }
    for (const content of node.content) {
      if ('target' in content) {
        index(content, key)
      }
    }
  }
  index(tree, null)
  const focusedNode = focused === null ? undefined : nodes.get(focused)
  const named = focusedNode?.aria['activedescendant']
  const active = isTarget(named) ? identity(named, naming) : null

  /**
   * One part's rows
   * @param {Part} node - The part
   * @param {string} indent - What each row starts with
   * @returns {Segment[][]} Its rows
   */
  const rows = (node, indent) => {
    if (node.hidden) {
      return []
    }
    const key = identity(node.target, naming)
    const lit = key === focused || key === active
    const text = textOf(node, item)
    /** @type {Segment['style']} */
    const style = lit ? 'inverse' : node.aria['disabled'] === true ? 'dim' : ''
    /**
     * The part as one row
     * @param {string} shown - What it shows
     * @param {Segment['style']} how - How
     * @returns {Segment[][]} The row
     */
    const line = (shown, how) => [[segment(indent, null, ''), segment(shown, key, how)]]
    const children = () => node.content.flatMap((content) => ('target' in content ? rows(content, `${indent}  `) : []))
    switch (node.role ?? '') {
      case 'combobox': {
        const label = typeof node.aria['label'] === 'string' ? `${node.aria['label']}: ` : ''
        return [
          [
            segment(`${indent}${label}`, null, ''),
            segment(`[ ${text} ${node.aria['expanded'] === true ? '▴' : '▾'} ]`, key, style),
          ],
          ...node.content.flatMap((content) =>
            'target' in content ? rows(content, `${indent}${' '.repeat(label.length)}`) : [],
          ),
        ]
      }
      case 'button': {
        return line(`[ ${text}${node.aria['haspopup'] === undefined ? '' : ' ▾'} ]`, style)
      }
      case 'heading': {
        return line(text, lit ? 'inverse' : 'bold')
      }
      case 'option':
      case 'menuitem': {
        const tick = node.aria['selected'] === true ? '✓' : ' '
        const dragged = node.data['dragged'] === true
        const drop = node.data['drop']
        const mark = [[segment(`${indent}──────`, null, 'dim')]]
        return [
          ...(drop === 'before' ? mark : []),
          ...line(`${dragged ? '⠿' : tick} ${text}`, dragged ? 'dim' : style),
          ...(drop === 'after' ? mark : []),
        ]
      }
      case 'listbox':
      case 'menu': {
        const inside = children()
        return inside.length === 0 ? line('(nothing yet)', 'dim') : inside
      }
      case 'dialog': {
        const labelledby = node.aria['labelledby']
        const titleKey = isTarget(labelledby) ? identity(labelledby, naming) : null
        const title = titleKey === null ? undefined : nodes.get(titleKey)
        const inside = node.content.flatMap((content) =>
          'target' in content && identity(content.target, naming) !== titleKey ? rows(content, `${indent}│ `) : [],
        )
        return [
          [segment(`${indent}┌─ ${title === undefined ? '' : textOf(title, item)} ─`, key, 'bold')],
          ...inside,
          [segment(`${indent}└────`, key, '')],
        ]
      }
      default: {
        const inside = children()
        return text !== '' && inside.length === 0
          ? line(text, style)
          : node.content.flatMap((content) => ('target' in content ? rows(content, indent) : []))
      }
    }
  }

  return { nodes, parents, rows: rows(tree, '') }
}

/**
 * Where a walk out through a part's ancestors starts
 * @param {string | null} key - The part
 * @returns {string | undefined} The part, as the parents map gives an ancestor
 */
function ancestor(key) {
  return key ?? undefined
}

/**
 * Rows as terminal text
 * @param {readonly (readonly Segment[])[]} rows - The rows
 * @param {number} columns - The terminal's width
 * @returns {string} The text, each row cut to the width
 */
function paint(rows, columns) {
  const codes = { '': '', bold: `${ESC}[1m`, dim: `${ESC}[2m`, inverse: `${ESC}[7m` }
  return rows
    .map((row) => {
      let left = columns
      return row
        .map((piece) => {
          const text = piece.text.slice(0, Math.max(0, left))
          left -= text.length
          return piece.style === '' ? text : `${codes[piece.style]}${text}${ESC}[0m`
        })
        .join('')
    })
    .join(`${ESC}[K\r\n`)
}

/**
 * Draws a widget in a terminal, and runs it on the terminal's input
 * @param {TerminalOptions} options - The widget, its props, how the host words items and announcements, what carries
 *   out the app's effects, and the terminal
 * @returns {Readonly<{ host: Host, feed: (text: string) => void, screen: () => readonly string[], stop: () => void }>}
 *   The running widget, input fed as the terminal would, the screen's rows as plain text, and stopping
 */
function renderTerminal(options) {
  /** @type {string | null} */
  let focused = null
  let said = ''
  /** @type {Readonly<{ x: number, y: number, key: string | null }> | null} */
  let pressed = null
  /** @type {Map<string, string | null>} */
  const restores = new Map()
  /** @type {Layout} */
  let laid = { nodes: new Map(), parents: new Map(), rows: [] }

  /**
   * Carries out what a terminal can: focus, announcing; the rest is the app's
   * @param {Out} out - The effect
   * @param {Host} running - The running widget
   * @returns {void}
   */
  const effect = (out, running) => {
    const { effect: made } = out
    const type = typeof made === 'object' && made !== null && 'type' in made ? made.type : ''
    if (type === 'preventDefault' || type === 'reveal') {
      return
    }
    if (type === 'focus' && typeof made === 'object' && made !== null && 'part' in made && Array.isArray(made.part)) {
      const path = made.part.map(String)
      const item = 'item' in made && (typeof made.item === 'string' || typeof made.item === 'number') ? made.item : null
      const part = path.at(-1) ?? ''
      setFocus(identity({ item, owner: [...out.from, ...path.slice(0, -1)], part }, { id: '', keyId: String }))
      return
    }
    if (
      type === 'announce' &&
      typeof made === 'object' &&
      made !== null &&
      'message' in made &&
      typeof made.message === 'object' &&
      made.message !== null
    ) {
      said = options.announce(Object.fromEntries(Object.entries(made.message)))
      draw()
      return
    }
    options.effect(out, running)
  }

  const host = run({ effect, props: options.props, widget: options.widget })

  /**
   * Whether a part and every part around it is shown
   * @param {string} key - The part
   * @returns {boolean} Whether it is shown
   */
  const shown = (key) => {
    for (let at = ancestor(key); at !== undefined; at = laid.parents.get(at)) {
      if (laid.nodes.get(at)?.hidden !== false) {
        return false
      }
    }
    return true
  }

  /**
   * The shown modal part focus is kept in, if any
   * @returns {string | null} Its identity
   */
  const trap = () => {
    for (const [key, node] of laid.nodes) {
      if (node.aria['modal'] === true && shown(key)) {
        return key
      }
    }
    return null
  }

  /**
   * Whether a part is inside another (or is it)
   * @param {string} key - The part
   * @param {string} outer - The other
   * @returns {boolean} Whether it is
   */
  const inside = (key, outer) => {
    for (let at = ancestor(key); at !== undefined; at = laid.parents.get(at)) {
      if (at === outer) {
        return true
      }
    }
    return false
  }

  /**
   * Delivers an event to the innermost part from `key` outwards that listens for it
   * @param {string | null} key - Where it happened
   * @param {Readonly<{ [field: string]: Data }> & Readonly<{ type: string }>} event - The event's fields
   * @returns {boolean} Whether its default was prevented
   */
  const fire = (key, event) => {
    for (let at = ancestor(key); at !== undefined; at = laid.parents.get(at)) {
      const node = laid.nodes.get(at)
      if (node?.listens.includes(event.type) === true) {
        const { target } = node
        const outs = host.dispatch(target.owner, {
          ...event,
          item: target.item,
          part: target.part,
          timeStamp: performance.now(),
        })
        return outs.some(
          (out) =>
            typeof out.effect === 'object' &&
            out.effect !== null &&
            'type' in out.effect &&
            out.effect.type === 'preventDefault',
        )
      }
    }
    return false
  }

  /**
   * Moves focus to a part, telling the parts it leaves and reaches
   * @param {string | null} key - The part
   * @returns {void}
   */
  const setFocus = (key) => {
    if (key === focused) {
      return
    }
    const left = focused
    focused = key
    if (left !== null && laid.nodes.get(left)?.listens.includes('blur') === true) {
      fire(left, { type: 'blur' })
    }
    if (key !== null && laid.nodes.get(key)?.listens.includes('focus') === true) {
      fire(key, { type: 'focus' })
    }
    draw()
  }

  /**
   * The parts Tab moves through, in order, inside the modal part if one is shown
   * @returns {string[]} Their identities
   */
  const tabbable = () => {
    const kept = trap()
    /** @type {string[]} */
    const order = []
    for (const [key, node] of laid.nodes) {
      if (node.tabindex !== null && node.tabindex >= 0 && shown(key) && (kept === null || inside(key, kept))) {
        order.push(key)
      }
    }
    return order
  }

  /**
   * Lays the tree out again and paints it; keeps focus on a shown part, and gives it back when a modal part closes
   * @returns {void}
   */
  const draw = () => {
    laid = layout(host.tree(), { focused, item: options.item })
    for (const [key, node] of laid.nodes) {
      if (node.aria['modal'] === true) {
        const open = shown(key)
        if (open && !restores.has(key)) {
          restores.set(key, focused)
        } else if (!open && restores.has(key)) {
          const back = restores.get(key) ?? null
          restores.delete(key)
          if (focused === null || inside(focused, key)) {
            focused = back
          }
        }
      }
    }
    if (focused === null || !laid.nodes.has(focused) || !shown(focused)) {
      focused = tabbable()[0] ?? null
      laid = layout(host.tree(), { focused, item: options.item })
    }
    const status = [segment(said, null, 'dim')]
    options.write(`${ESC}[H${paint([...laid.rows, [], status], options.columns)}${ESC}[J`)
  }

  /**
   * The innermost part drawn at a cell
   * @param {number} x - The column, from 1
   * @param {number} y - The row, from 1
   * @returns {string | null} Its identity
   */
  const partAt = (x, y) => {
    let column = 1
    for (const piece of laid.rows[y - 1] ?? []) {
      if (x >= column && x < column + piece.text.length && piece.key !== null) {
        return piece.key
      }
      column += piece.text.length
    }
    return null
  }

  /**
   * The parts around a part, from it outwards
   * @param {string | null} key - The part
   * @returns {string[]} Their identities
   */
  const outwards = (key) => {
    /** @type {string[]} */
    const found = []
    for (let at = ancestor(key); at !== undefined; at = laid.parents.get(at)) {
      found.push(at)
    }
    return found
  }

  /**
   * Handles one key: to the focused part, then what a browser does by default
   * @param {Extract<TerminalEvent, { kind: 'key' }>} event - The key
   * @returns {void}
   */
  const key = (event) => {
    const prevented = fire(focused, {
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      key: event.key,
      metaKey: false,
      shiftKey: event.shiftKey,
      type: 'keydown',
    })
    if (prevented) {
      return
    }
    if (event.key === 'Tab') {
      const order = tabbable()
      const at = focused === null ? -1 : order.indexOf(focused)
      const next = order[(at + (event.shiftKey ? -1 : 1) + order.length) % order.length] ?? null
      setFocus(next)
    } else if (
      (event.key === 'Enter' || event.key === ' ') &&
      focused !== null &&
      laid.nodes.get(focused)?.role === 'button'
    ) {
      fire(focused, { altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, type: 'click' })
    }
  }

  /**
   * Handles a mouse report as pointer events, a press's focus and a click
   * @param {Extract<TerminalEvent, { kind: 'mouse' }>} event - The report
   * @returns {void}
   */
  const mouse = (event) => {
    if (event.button !== 0 && !event.release) {
      return
    }
    const at = partAt(event.x, event.y)
    const point = { button: 0, clientX: (event.x - 1) * CELL.x, clientY: (event.y - 1) * CELL.y, pointerId: 1 }
    if (event.release) {
      fire(at, { ...point, type: 'pointerup' })
      const from = pressed
      pressed = null
      const shared = outwards(from?.key ?? null).find((one) => outwards(at).includes(one)) ?? null
      if (shared !== null) {
        fire(shared, { altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, type: 'click' })
      }
    } else if (event.motion) {
      if (pressed !== null) {
        fire(at, { ...point, type: 'pointermove' })
      }
    } else {
      pressed = { key: at, x: event.x, y: event.y }
      fire(at, { ...point, type: 'pointerdown' })
      if (!fire(at, { button: 0, type: 'mousedown' })) {
        const focusable = outwards(at).find((one) => laid.nodes.get(one)?.tabindex !== null)
        if (focusable !== undefined) {
          setFocus(focusable)
        }
      }
    }
  }

  /**
   * Takes terminal input
   * @param {string} text - The input
   * @returns {void}
   */
  const feed = (text) => {
    for (const event of parseInput(text)) {
      if (event.kind === 'key') {
        key(event)
      } else if (event.kind === 'mouse') {
        mouse(event)
      } else {
        stop()
      }
    }
  }

  const unwatch = host.watch(draw)
  options.input.on('data', feed)
  options.write(`${ESC}[?1049h${ESC}[?25l${ESC}[?1000h${ESC}[?1002h${ESC}[?1006h`)
  draw()
  host.begin()

  /**
   * Stops: the widget, the input, and the terminal as it was
   * @returns {void}
   */
  function stop() {
    unwatch()
    host.stop()
    options.input.off('data', feed)
    options.write(`${ESC}[?1006l${ESC}[?1002l${ESC}[?1000l${ESC}[?25h${ESC}[?1049l`)
  }

  return {
    feed,
    host,
    screen: () => laid.rows.map((row) => row.map((piece) => piece.text).join('')),
    stop,
  }
}

export { layout, parseInput, renderTerminal }
