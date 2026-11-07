/**
 * @import { Attributes, ListPipeline, RenderRow } from '@interact/core/list-pipeline'
 * @import { ItemSource } from '@interact/core/source'
 * @import { Builder, Effect, EffectType, Extension, Field, State } from '@interact/core/state'
 * @import { TemplateResult } from '@interact/dom/template'
 * @import { ActiveItem } from './active-item.js'
 * @import { CommandBridge } from './command-bridge.js'
 * @import { FoundCommand } from './command-match.js'
 */

import {
  Layer,
  MemorySource,
  Store,
  defineEffect,
  defineField,
  definePlugin,
  inputHandler,
  keyInput,
  listPipeline,
  precedence,
} from '@interact/core'
import {
  attributes,
  html,
  ownElement,
  releaseOverlay,
  repeat,
  syncOverlay,
  viewContent,
  viewPlugin,
} from '@interact/dom'

import { active, readNow } from './active-item.js'
import { comboboxInput, hearField } from './combobox-field.js'
import { Latest } from './latest.js'

/**
 * What a palette is made of besides its core, given that core.
 * @template C
 * @typedef {(palette: PaletteCore<C>) => Extension} PaletteExtensions
 */

/**
 * How a palette starts: the bridge to its command system, the context its commands are found and run in (read as it
 * opens), its id (unique in the page for light DOM), its name and its search field's, text shown in the field while it
 * is empty (none unless given), whether commands that can't run now are shown (greyed out, passed over) or left out,
 * and what it is made of besides its core.
 * @template C
 * @typedef {Readonly<{
 *   bridge: CommandBridge<C>,
 *   context: () => C,
 *   id?: string,
 *   label?: string,
 *   searchLabel?: string,
 *   placeholder?: string,
 *   inactive?: 'show' | 'hide',
 *   extensions?: PaletteExtensions<C>,
 * }>} PaletteOptions
 */

/**
 * What the palette is doing: what is typed, the context it opened in (held in an object, since the context itself may
 * be undefined), and whether a search has answered since.
 * @template C
 * @typedef {Readonly<{ query: string, at: Readonly<{ context: C }> | undefined, answered: boolean }>} Searching
 */

/**
 * A run of a label's text: where it starts, what it is, and whether the query matched it.
 * @typedef {Readonly<{ start: number, text: string, matched: boolean }>} Run
 */

/** Keys the results take from the search field; every other key edits the query. */
const LIST_KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp'])

/**
 * Whether a command can't run now, so focus passes over it.
 * @param {FoundCommand} command - The command
 * @returns {boolean} Whether it can't
 */
function cannotRun(command) {
  return !command.enabled
}

/**
 * What a found command is called.
 * @param {FoundCommand} command - The command
 * @returns {string} Its label
 */
function labelOf(command) {
  return command.label
}

/**
 * Its key in the results.
 * @param {FoundCommand} command - The command
 * @returns {string} Its id
 */
function idOf(command) {
  return command.id
}

/**
 * Commands as results.
 * @param {readonly FoundCommand[]} commands - The commands
 * @returns {MemorySource<FoundCommand>} The results
 */
function resultsOf(commands) {
  return new MemorySource(commands, idOf, labelOf)
}

/**
 * A label in runs, matched and not, by where a search said it matched.
 * @param {string} label - The label
 * @param {readonly number[]} positions - Where it matched
 * @returns {Run[]} The runs, in order
 */
function runsOf(label, positions) {
  const matched = new Set(positions)
  /** @type {Run[]} */
  const runs = []
  let start = 0
  for (let index = 1; index <= label.length; index += 1) {
    if (index === label.length || matched.has(index) !== matched.has(start)) {
      runs.push({ matched: matched.has(start), start, text: label.slice(start, index) })
      start = index
    }
  }
  return runs
}

/**
 * A command's label, with what the query matched marked.
 * @param {FoundCommand} command - The command
 * @returns {TemplateResult} The label
 */
function labelView(command) {
  return html`<span part="label"
    >${repeat(
      runsOf(command.label, command.positions ?? []),
      (run) => `${String(run.start)}${run.matched ? '*' : ''}`,
      (run) => (run.matched ? html`<mark part="match">${run.text}</mark>` : html`<span>${run.text}</span>`),
    )}</span
  >`
}

/**
 * What makes a palette, as the WAI-ARIA Authoring Practices combobox and modal dialog patterns have it, and no more: a
 * modal dialog holding a search field that is an editable combobox (list autocomplete, automatic selection) over a
 * listbox of the commands found. Focus stays in the field, which names the active command as its active descendant;
 * the active command is the one selected. Opening finds every command in the context it opens in, the first that can
 * run active; what is typed is searched for by the command system (or the bridge, by label), and only the answer for
 * the query typed last is shown, what shows staying until it comes; focus passes over commands that can't run (or they
 * are left out). Enter, or a press, runs the active command once the palette has gone and focus is back where it was;
 * the arrows and page keys are the results', and every other key the field's. A result shows its label with what
 * matched marked, what it does, its group and its shortcut, and a status says when nothing was found. Keyboard
 * navigation, the pointer, windowing and a rendering are extensions given beside it.
 * @template C
 */
class PaletteCore {
  /** @readonly */
  layer = new Layer({ modal: true })
  /**
   * What is typed in the search field.
   * @readonly
   * @type {EffectType<string>}
   */
  typed = defineEffect()
  /**
   * The palette opened in a context.
   * @readonly
   * @type {EffectType<Readonly<{ context: C }>>}
   */
  opened = defineEffect()
  /**
   * The palette's layer opened or closed.
   * @readonly
   * @type {EffectType<boolean>}
   */
  layerChanged = defineEffect()
  /**
   * A search answered.
   * @readonly
   * @type {EffectType<undefined>}
   */
  answered = defineEffect()
  /**
   * @readonly
   * @type {Field<Searching<C>>}
   */
  field = defineField({
    /** @returns {Searching<C>} Nothing typed, closed */
    create: () => ({ answered: false, at: undefined, query: '' }),
    update: (value, transaction) => transaction.effects.reduce((next, effect) => this.#after(next, effect), value),
  })
  /**
   * @readonly
   * @type {ListPipeline<FoundCommand, TemplateResult, ItemSource<FoundCommand>>}
   */
  list
  /**
   * @readonly
   * @type {ActiveItem<FoundCommand, TemplateResult, ItemSource<FoundCommand>>}
   */
  current
  /**
   * @readonly
   * @type {PaletteOptions<C>}
   */
  #options

  /** @param {PaletteOptions<C>} options - How it starts */
  constructor(options) {
    this.#options = options
    /** @readonly */
    this.id = options.id ?? 'palette'
    /** @readonly */
    this.label = options.label ?? 'Commands'
    /** @readonly */
    this.searchLabel = options.searchLabel ?? 'Search commands'
    /** @readonly */
    this.placeholder = options.placeholder
    /** @type {ItemSource<FoundCommand>} */
    const none = resultsOf([])
    /** @type {ListPipeline<FoundCommand, TemplateResult, ItemSource<FoundCommand>>} */
    const list = listPipeline(none)
    this.list = list
    this.current = active(list)
  }

  /** @returns {string} The id of its results */
  get resultsId() {
    return `${this.id}-results`
  }

  /**
   * Puts the palette's core in a configuration.
   * @param {Builder} into - The configuration being built
   * @param {number} level - Its level
   * @returns {void}
   */
  install(into, level) {
    const { current, list } = this
    /** @type {Extension} */
    const parts = [
      current,
      this.field,
      current.skip.of(cannotRun),
      list.text.of(labelOf),
      list.attributes.of((row, state) => this.#rowAttributes(row, state)),
      list.containerAttributes.of(() => ({
        'aria-label': this.label,
        id: this.resultsId,
        part: 'viewport',
        role: 'listbox',
        tabindex: -1,
      })),
      precedence(
        'high',
        list.containerAttributes.of(() => ({ 'aria-activedescendant': false })),
      ),
      list.item.of((row, next, state) => (row.kind === 'item' ? this.#row(row, state) : next(row))),
      precedence(
        'highest',
        inputHandler.of((input, store) => {
          if (input.is(list.press)) {
            this.run(store, input.value.position)
            return true
          }
          if (!input.is(keyInput)) {
            return false
          }
          if (input.value.key === 'Enter') {
            const at = current.positionIn(store.state)
            if (at !== undefined) {
              this.run(store, at)
            }
            return true
          }
          return LIST_KEYS.has(input.value.key) ? false : 'keep-default'
        }),
      ),
      this.#searching(),
      viewContent.of((state) => this.#view(state)),
      this.#page(),
    ]
    into.add(parts, level)
  }

  /**
   * Opens the palette with nothing typed, finding every command in the context it opens in.
   * @param {Store} store - The palette's store
   * @returns {void}
   */
  open(store) {
    store.dispatch({ effects: this.opened.of({ context: this.#options.context() }) })
    this.layer.open.request(true)
  }

  /**
   * Runs the command found at a position, if it can run: the palette closes, and once it has gone and focus is back
   * where it was, the command runs in the context the palette opened in.
   * @param {Store} store - The palette's store
   * @param {number} position - Where it is among the results
   * @returns {boolean} Whether there was a command there that can run
   */
  run(store, position) {
    const command = readNow(this.list.listOf(store.state), position)?.item
    const { at } = store.state.field(this.field)
    if (command === undefined || !command.enabled || at === undefined) {
      return false
    }
    this.layer.open.request(false)
    this.layer.afterHidden(() => {
      this.#options.bridge.run(command.id, at.context)
    })
    return true
  }

  /**
   * What the palette is doing after one effect.
   * @param {Searching<C>} value - What it was doing
   * @param {Effect<unknown>} effect - The effect
   * @returns {Searching<C>} What it is doing
   */
  #after(value, effect) {
    if (effect.is(this.typed)) {
      return { ...value, query: effect.value }
    }
    if (effect.is(this.opened)) {
      return { answered: false, at: effect.value, query: '' }
    }
    if (effect.is(this.layerChanged) && !effect.value) {
      return { ...value, answered: false, at: undefined }
    }
    return effect.is(this.answered) ? { ...value, answered: true } : value
  }

  /**
   * A result's attributes: its id, role, state and parts.
   * @param {RenderRow<FoundCommand>} row - Its row
   * @param {State} state - The state
   * @returns {Attributes} The attributes
   */
  #rowAttributes(row, state) {
    if (row.kind !== 'item') {
      return {}
    }
    const isActive = this.current.positionIn(state) === row.position
    const off = row.item !== undefined && !row.item.enabled
    return {
      'aria-disabled': off ? 'true' : undefined,
      'aria-selected': isActive ? 'true' : 'false',
      id: `${this.id}-result-${String(row.position)}`,
      part: `result${isActive ? ' result-active' : ''}${off ? ' result-disabled' : ''}`,
      role: 'option',
    }
  }

  /**
   * A result's row: its label, what it does, its group and its shortcut.
   * @param {RenderRow<FoundCommand>} row - Its row
   * @param {State} state - The state
   * @returns {TemplateResult} The row
   */
  #row(row, state) {
    const command = row.kind === 'item' ? row.item : undefined
    return html`<div ${attributes(this.list.attributesOf(row, state))}
      >${command === undefined ? '' : labelView(command)}<span part="description">${command?.description ?? ''}</span
      ><span part="category">${command?.category ?? ''}</span
      ><span part="shortcut">${command?.shortcut ?? ''}</span></div
    >`
  }

  /**
   * The palette: a modal dialog with its search field, the commands found, and a status region over them.
   * @param {State} state - The state
   * @returns {TemplateResult} The view
   */
  #view(state) {
    const { answered, query } = state.field(this.field)
    const nothing = answered && this.list.listOf(state).count() === 0
    return html`<dialog part="overlay dialog" closedby="none" aria-label=${this.label}
      >${comboboxInput({
        active: this.current.descendantIn(state),
        autocomplete: 'list',
        controls: this.resultsId,
        expanded: true,
        label: this.searchLabel,
        part: 'search',
        placeholder: this.placeholder,
        value: query,
      })}<div part="results"
        >${this.list.render(state)}<div part="status" role="status">${nothing ? 'No matching commands' : ''}</div></div
      ></dialog
    >`
  }

  /**
   * What finds the commands: a search as the palette opens, as what is typed changes, and as the command system says
   * its commands changed while it is open, of which only the latest answer is shown, the first command that can run
   * active; closing drops every answer still to come and what was found.
   * @returns {Extension} The plugin
   */
  #searching() {
    const { bridge, inactive } = this.#options
    return definePlugin((store) => {
      const searches = new Latest()
      /** @returns {Promise<void>} When what was found is shown, or dropped */
      const search = async () => {
        const { at, query } = store.state.field(this.field)
        if (at === undefined) {
          return
        }
        const found = await searches.ask(async () => bridge.search(query, at.context))
        if (found === undefined || !this.layer.open.get()) {
          return
        }
        const shown = inactive === 'hide' ? found.answer.filter((command) => command.enabled) : found.answer
        const first = shown.findIndex((command) => command.enabled)
        store.dispatch({
          effects: [
            this.list.setSource.of(resultsOf(shown)),
            this.answered.of(undefined),
            ...(first === -1 ? [] : this.current.go(first)),
          ],
        })
      }
      const stops = [
        bridge.subscribe(() => {
          if (this.layer.open.get()) {
            void search()
          }
        }),
        this.layer.open.subscribe((open) => {
          if (!open) {
            searches.drop()
          }
          const forget = open ? [] : [this.list.setSource.of(resultsOf([]))]
          store.dispatch({ effects: [this.layerChanged.of(open), ...forget] })
        }),
      ]
      return {
        destroy: () => {
          for (const stop of stops) {
            stop()
          }
        },
        update: (transaction) => {
          if (transaction.effectsOf(this.typed).length > 0 || transaction.effectsOf(this.opened).length > 0) {
            void search()
          }
        },
      }
    })
  }

  /**
   * What the palette does in the page: its dialog shown modally while it is open, focus in its search field, and the
   * field's typing and keys heard.
   * @returns {Extension} The view plugin
   */
  #page() {
    return viewPlugin((store, root) => {
      const stop = hearField(root, '[part~="search"]', {
        input: (text) => {
          store.dispatch({ effects: this.typed.of(text) })
        },
        key: (event) =>
          store.handle(
            keyInput.of({
              alt: event.altKey,
              key: event.key,
              shift: event.shiftKey,
              toggle: event.ctrlKey || event.metaKey,
            }),
          ),
      })
      /** @returns {HTMLElement | undefined} The dialog */
      const dialog = () => ownElement(root, '[part~="dialog"]')
      return {
        destroy: () => {
          stop()
          const element = dialog()
          if (element !== undefined) {
            releaseOverlay(element)
          }
        },
        rendered: () => {
          const element = dialog()
          if (element !== undefined) {
            syncOverlay(element, this.layer, {
              focus: 'move',
              initialFocus: () => ownElement(element, '[part~="search"]'),
            })
          }
        },
      }
    })
  }
}

/**
 * A command palette: its core and the extensions it is made of, as a store, with what an app and a view do to it.
 * @template C
 */
class Palette extends Store {
  /** @param {PaletteOptions<C>} options - How it starts */
  constructor(options) {
    /** @type {PaletteCore<C>} */
    const core = new PaletteCore(options)
    super([core, options.extensions?.(core) ?? []])
    /** @readonly */
    this.core = core
  }

  /** @returns {Layer} The modal layer it opens in */
  get layer() {
    return this.core.layer
  }

  /** @returns {string} What is typed in its search field */
  get query() {
    return this.state.field(this.core.field).query
  }

  /** @returns {number | undefined} The position of the active command, if any */
  get active() {
    return this.core.current.positionIn(this.state)
  }

  /** @returns {number} How many commands were found */
  get count() {
    return this.core.list.listOf(this.state).count()
  }

  /**
   * The command found at a position.
   * @param {number} position - Where it is
   * @returns {FoundCommand | undefined} The command
   */
  result(position) {
    return readNow(this.core.list.listOf(this.state), position)?.item
  }

  /**
   * Opens the palette with nothing typed, finding every command in the context it opens in.
   * @returns {void}
   */
  open() {
    this.core.open(this)
  }

  /**
   * Asks to close the palette, running nothing.
   * @returns {void}
   */
  close() {
    this.core.layer.open.request(false)
  }

  /**
   * What typing in the search field does.
   * @param {string} text - What is typed now
   * @returns {void}
   */
  type(text) {
    this.dispatch({ effects: this.core.typed.of(text) })
  }

  /**
   * A key typed in the search field, if it is the results' or the palette's.
   * @param {string} key - The key, as `KeyboardEvent.key` names it
   * @returns {boolean} Whether it was taken, so its default should be prevented
   */
  key(key) {
    return this.handle(keyInput.of({ alt: false, key, shift: false, toggle: false }))
  }

  /**
   * Runs the command found at a position, if it can run, once the palette has gone.
   * @param {number} position - Where it is among the results
   * @returns {boolean} Whether there was a command there that can run
   */
  run(position) {
    return this.core.run(this, position)
  }
}

export { Palette, PaletteCore }
