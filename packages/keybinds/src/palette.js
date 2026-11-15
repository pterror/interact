/**
 * A ready-made command palette, wired from small pieces: a field and the commands that apply now, filtered as the
 * person types (list's combobox, case 5). It opens empty with the first command active; Up and Down move the active
 * command (wrapping at the ends), Enter or a click runs it, and the pointer resting on one makes it active. Running a
 * command closes the palette first and gives focus back where it was, so the command runs, and its `when` is asked, where
 * the person was. While
 * open it is a manual popover centred on the viewport, holding focus in its field, so by the overlay rule the page's
 * bindings don't fire; Escape or a press outside closes it. It reads no key to open: the app opens it from a command
 * it binds. Unstyled, in the light DOM: the element is a `role=dialog` holding a `role=combobox` field and a
 * `role=listbox`, whose options each hold the command's label and its bindings as `kbd`s; the active option is
 * `data-active` and `aria-selected=true`. An app that wants one piece otherwise wires the rest itself: list's
 * textValue, filtered, render, flowMount, ids, mark, reveal, activeDescendant, move, wrapStep, hoverIntent, popover,
 * focusWhen and dismiss, with cheatsheetRow(), bindingParts() and focusReturn().
 */

import {
  activeDescendant,
  arrayList,
  arrayStep,
  cell,
  dismiss,
  filtered,
  flowMount,
  focusWhen,
  hoverIntent,
  ids,
  mark,
  move,
  popover,
  render,
  reveal,
  textValue,
  wrapStep,
} from '@pterror/interact-list'

import { bindingParts } from './binding-parts.js'
import { cheatsheetRow } from './cheatsheet-row.js'
import { focusReturn } from './focus-return.js'
import { keybinds } from './keybinds.js'
import { withStrings } from './strings.js'

/** @import { StringsOption } from './strings.js' */

/**
 * A command as keybinds() binds it, with what it is called: what it does (given the press or click that chose it),
 * when it applies, and its bindings, shown beside it
 * @typedef {Readonly<{
 *   id: string,
 *   label: string,
 *   run: (event: Event) => boolean | void,
 *   when?: () => boolean,
 *   keys?: readonly string[],
 *   mouse?: readonly string[],
 *   pad?: readonly string[],
 * }>} Command
 */

/**
 * @typedef {Readonly<{
 *   element: HTMLElement,
 *   commands: () => readonly Command[],
 *   matches?: (command: Command, query: string) => boolean,
 *   strings?: StringsOption,
 *   layout?: Readonly<{ get: () => ReadonlyMap<string, string> | undefined }>,
 *   rest?: number,
 * }>} PaletteOptions
 */

/** @type {readonly string[]} */
const NONE = []

let made = 0

/**
 * Whether a command applies now
 * @param {Command} command - The command
 * @returns {boolean} Whether its `when` holds, or it has none
 */
function applies(command) {
  return command.when?.() ?? true
}

/**
 * Whether every word of the query is in the command's label, ignoring case **(P)**
 * @param {Command} command - The command
 * @param {string} query - What was typed
 * @returns {boolean} Whether it matches
 */
function labelHasWords(command, query) {
  const label = command.label.toLocaleLowerCase()
  return query
    .toLocaleLowerCase()
    .split(/\s+/u)
    .every((word) => label.includes(word))
}

/**
 * Builds a command palette in an element
 * @param {PaletteOptions} options - Its element; its commands (those that apply are read each time it opens); whether
 *   a command matches what is typed (default: every word is in its label); the words to show in place of English
 *   (`commands` labels the dialog, `typeCommand` is the field's placeholder); the person's keyboard layout (layout()), for how bindings are shown; and how long the pointer rests on
 *   a command to make it active, as for hoverIntent()
 * @returns {Readonly<{ open: Readonly<{ get: () => boolean, set: (open: boolean) => void,
 *   watch: (listener: () => void) => () => void }>, stop: () => void }>} Whether it is open, and opening and closing
 *   it; and stopping
 * @example
 * const commands = [{ id: 'save', keys: ['$mod+s'], label: 'Save', run: save }]
 * const shown = palette({ commands: () => commands, element })
 * keybinds([...commands, { keys: ['$mod+k'], run: () => shown.open.set(true) }])
 */
function palette({ commands, element, layout, matches = labelHasWords, rest, strings }) {
  const words = withStrings(strings)
  const label = words.commands
  made += 1
  const prefix = `keybinds-palette-${String(made)}`
  const open = cell(false)
  /** @type {Map<string, Command>} */
  const byId = new Map()
  const available = arrayList(NONE)
  const field = document.createElement('input')
  field.type = 'text'
  field.setAttribute('role', 'combobox')
  field.setAttribute('aria-expanded', 'true')
  field.setAttribute('aria-autocomplete', 'list')
  field.setAttribute('aria-controls', `${prefix}-list`)
  field.setAttribute('aria-label', label)
  field.placeholder = words.typeCommand
  field.autocomplete = 'off'
  field.spellcheck = false
  const options = document.createElement('div')
  options.id = `${prefix}-list`
  options.setAttribute('role', 'listbox')
  options.setAttribute('aria-label', label)
  element.setAttribute('role', 'dialog')
  element.setAttribute('aria-label', label)
  element.append(field, options)

  const query = textValue({ field })
  const shown = filtered({
    list: available,
    matches: (/** @type {string} */ id, /** @type {string} */ typed) => {
      const command = byId.get(id)
      return command !== undefined && matches(command, typed)
    },
    query,
  })
  const active = shown.hold(undefined, 'next')
  const moves = move({ from: active.get, step: wrapStep(arrayStep(shown.keys)), to: active.set })
  /** @type {Map<string, number>} */
  const numbers = new Map()
  /** @type {(id: string) => string} */
  const idOf = (id) => {
    const number = numbers.get(id) ?? numbers.size
    numbers.set(id, number)
    return `${prefix}-${String(number)}`
  }
  const rendered = render({
    create() {
      const option = document.createElement('div')
      option.setAttribute('role', 'option')
      return option
    },
    drawn: shown,
    facets: [
      ids(idOf),
      cheatsheetRow({
        entryOf: (id) => byId.get(id),
        parts: (command) => bindingParts(command, layout?.get(), strings),
        watch: () => () => undefined,
      }),
      activeDescendant({ active, element: field, idOf }),
      mark({ attribute: 'data-active', on: '', test: active }),
      mark({ attribute: 'aria-selected', off: 'false', on: 'true', test: active }),
      reveal(active),
    ],
    mount: flowMount(options),
  })

  /**
   * Closes the palette, giving focus back, and runs a command if it applies there
   * @param {string | undefined} id - The command
   * @param {Event} event - What chose it
   * @returns {void}
   */
  const choose = (id, event) => {
    const command = id === undefined ? undefined : byId.get(id)
    if (command === undefined) {
      return
    }
    open.set(false)
    if (applies(command)) {
      command.run(event)
    }
  }
  /**
   * @param {Event} event - A click
   * @returns {void}
   */
  const clicked = (event) => {
    const item = rendered.itemOf(event.target)
    if (item !== undefined) {
      choose(item.key, event)
    }
  }
  options.addEventListener('click', clicked)
  const first = () => {
    void moves.edge(1)
  }
  const viewport = {
    getBoundingClientRect() {
      const view = element.ownerDocument.defaultView
      return { bottom: view?.innerHeight ?? 0, left: 0, right: view?.innerWidth ?? 0, top: 0 }
    },
  }
  const stops = [
    rendered.stop,
    shown.stop,
    query.watch(first),
    open.watch(() => {
      byId.clear()
      if (open.get()) {
        for (const command of commands()) {
          if (applies(command)) {
            byId.set(command.id, command)
          }
        }
      }
      field.value = ''
      available.set([...byId.keys()])
      first()
    }),
    focusReturn({ element, open }),
    popover({ anchor: viewport, element, open, side: 'center' }),
    focusWhen({ element: field, when: open }),
    dismiss({ elements: [element], to: open.set }),
    hoverIntent({ element: options, itemOf: rendered.itemOf, to: active.set, ...(rest === undefined ? {} : { rest }) }),
    keybinds(
      [
        {
          keys: ['ArrowDown'],
          run() {
            void moves.by(1)
          },
          typing: true,
        },
        {
          keys: ['ArrowUp'],
          run() {
            void moves.by(-1)
          },
          typing: true,
        },
        {
          keys: ['Enter'],
          run(event) {
            choose(active.get(), event)
          },
          typing: true,
        },
      ],
      { target: field },
    ),
  ]
  return {
    open,
    stop() {
      open.set(false)
      options.removeEventListener('click', clicked)
      for (const stop of stops) {
        stop()
      }
      field.remove()
      options.remove()
    },
  }
}

export { palette }
