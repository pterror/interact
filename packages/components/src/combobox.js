/**
 * @import { KeyInput } from '@interact/core/inputs'
 * @import { Attributes, ListPipeline, RenderRow } from '@interact/core/list-pipeline'
 * @import { ItemSource } from '@interact/core/source'
 * @import { Builder, Effect, EffectType, Extension, Field, State, Transaction } from '@interact/core/state'
 * @import { Handled } from '@interact/core/store'
 * @import { TemplateResult } from '@interact/dom/template'
 * @import { ActiveItem } from './active-item.js'
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
  startsWithTyped,
} from '@interact/core'
import { html, ownElement, releaseOverlay, syncOverlay, viewContent, viewPlugin } from '@interact/dom'

import { active, readNow } from './active-item.js'
import { comboboxInput, hearField } from './combobox-field.js'
import { Latest } from './latest.js'

/**
 * The options for what is typed, at once or later: the app's (or its server's) to find, `undefined` for none.
 * @template T
 * @typedef {(text: string) => ItemSource<T> | undefined | Promise<ItemSource<T> | undefined>} Suggest
 */

/**
 * What a combobox is made of besides its core, given that core.
 * @template T
 * @typedef {(combobox: ComboboxCore<T>) => Extension} ComboboxExtensions
 */

/**
 * What every combobox has: its id (unique in the page for light DOM), its accessible name, what a select-only one
 * shows with nothing chosen, what an option is called, the option chosen to start with, and what it is made of besides
 * its core.
 * @template T
 * @typedef {Readonly<{
 *   id?: string,
 *   label?: string,
 *   placeholder?: string,
 *   text?: (item: T) => string,
 *   value?: T,
 *   extensions?: ComboboxExtensions<T>,
 * }>} ComboboxBasics
 */

/**
 * How a combobox starts. Select-only: a button-like field and a fixed list of options, found by typing their first
 * letters. Editable without autocomplete: a text field over a fixed list. Editable with `list` autocomplete: the options
 * are what `suggest` finds for the text; with `both`, the active option's text also completes the field inline. List
 * autocomplete makes the first option found active itself (`automatic`) or waits for the arrows (`manual`); `both` is
 * always automatic. `clearOnEscape`: Escape with the list closed empties the field (by default it does).
 * @template T
 * @typedef {(ComboboxBasics<T> & Readonly<{ kind: 'select-only', source?: ItemSource<T> }>)
 *   | (ComboboxBasics<T> & Readonly<{
 *     kind: 'editable', autocomplete?: 'none', source?: ItemSource<T>, clearOnEscape?: boolean,
 *   }>)
 *   | (ComboboxBasics<T> & Readonly<{
 *     kind: 'editable',
 *     autocomplete: 'list' | 'both',
 *     suggest: Suggest<T>,
 *     selection?: 'manual' | 'automatic',
 *     clearOnEscape?: boolean,
 *   }>)} ComboboxOptions
 */

/**
 * What kind of combobox the options make: whether its field is editable, how it autocompletes, whether leaving with
 * its list open chooses the active option (select-only, `automatic`, `both`), whether Escape empties it, and what it
 * suggests from, if it suggests.
 * @template T
 * @typedef {Readonly<{
 *   editable: boolean,
 *   autocomplete: 'none' | 'list' | 'both',
 *   selectsOnLeave: boolean,
 *   clearsOnEscape: boolean,
 *   suggest: Suggest<T> | undefined,
 * }>} ComboboxKind
 */

/**
 * Where the active option goes as a combobox's list opens: nowhere, the option chosen (or nowhere), the option chosen
 * or else the first, the first, or the last.
 * @typedef {'none' | 'value' | 'value-or-first' | 'first' | 'last'} OpenAt
 */

/**
 * What was held with a key: Alt, Shift, and Control or Command.
 * @typedef {Readonly<{ alt: boolean, shift: boolean, toggle: boolean }>} ComboboxModifiers
 */

/**
 * What the field holds: the option chosen, the text in an editable field, and whether the last edit deleted.
 * @template T
 * @typedef {Readonly<{ value: T | undefined, text: string, deleting: boolean }>} Chosen
 */

/** A key that types one character: `KeyboardEvent.key` names every other key with a word. */
const ONE_CHARACTER = /^.$/su
const MOVES = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp'])
/** @type {ComboboxModifiers} */
const PLAIN = { alt: false, shift: false, toggle: false }
/** Keys that put the cursor back in an editable field's text, keeping what completed it, so no option is active. */
const TO_FIELD = new Set(['Home', 'End', 'ArrowLeft', 'ArrowRight'])

/**
 * What kind of combobox options make.
 * @template T
 * @param {ComboboxOptions<T>} options - The options
 * @returns {ComboboxKind<T>} The kind
 */
function kindOf(options) {
  if (options.kind === 'select-only') {
    return { autocomplete: 'none', clearsOnEscape: false, editable: false, selectsOnLeave: true, suggest: undefined }
  }
  const clearsOnEscape = options.clearOnEscape ?? true
  if (!('suggest' in options)) {
    return { autocomplete: 'none', clearsOnEscape, editable: true, selectsOnLeave: false, suggest: undefined }
  }
  const automatic = options.autocomplete === 'both' || options.selection === 'automatic'
  return {
    autocomplete: options.autocomplete,
    clearsOnEscape,
    editable: true,
    selectsOnLeave: automatic,
    suggest: options.suggest,
  }
}

/**
 * A list of no options.
 * @template T
 * @returns {ItemSource<T>} The list
 */
function noOptions() {
  /** @type {T[]} */
  const none = []
  return new MemorySource(none, () => '')
}

/**
 * Whether a key is a character typed, with nothing but Shift held.
 * @param {KeyInput} key - The key
 * @returns {boolean} Whether it is
 */
function printable({ alt, key, toggle }) {
  return ONE_CHARACTER.test(key) && !alt && !toggle
}

/**
 * What makes a combobox, as the WAI-ARIA Authoring Practices combobox pattern has it, and no more: a field (focusable,
 * or a text input) controlling a listbox of options in a popup layer of its own, and the option chosen, its `value`.
 * Focus stays in the field, which names the active option as its active descendant; that option is the one selected.
 * Its keys are the APG's for its kind, with the list closed or open; opening lands on the option chosen through the
 * source's `positionOf`, else the first; one that suggests shows only what is found for the text typed last, and closes
 * when nothing is; leaving with the list open (Tab, a press elsewhere) chooses its active option when it selects by
 * itself; Escape never does, and with the list closed empties an editable field. An app owns the option chosen with
 * `controlled(combobox.chosen, ...)`. Keyboard navigation, typeahead, the pointer, windowing and a rendering are
 * extensions given beside it.
 * @template T
 */
class ComboboxCore {
  /** @readonly */
  layer = new Layer()
  /**
   * Chooses an option, or none.
   * @readonly
   * @type {EffectType<T | undefined>}
   */
  chosen = defineEffect()
  /**
   * Text typed in an editable field, and whether it was deleting.
   * @readonly
   * @type {EffectType<Readonly<{ text: string, deleting: boolean }>>}
   */
  typed = defineEffect()
  /**
   * The combobox's layer opened or closed.
   * @readonly
   * @type {EffectType<boolean>}
   */
  layerChanged = defineEffect()
  /**
   * @readonly
   * @type {Field<Chosen<T>>}
   */
  field
  /**
   * @readonly
   * @type {ListPipeline<T, TemplateResult, ItemSource<T>>}
   */
  list
  /**
   * @readonly
   * @type {ActiveItem<T, TemplateResult, ItemSource<T>>}
   */
  current
  /**
   * @readonly
   * @type {ComboboxKind<T>}
   */
  kind
  /**
   * The landings asked for as the list opens, of which only the latest counts.
   * @readonly
   */
  #landings = new Latest()
  /**
   * The suggestions asked for as the text changes, of which only the latest counts.
   * @readonly
   */
  #suggestions = new Latest()
  /**
   * @readonly
   * @type {((item: T) => string) | undefined}
   */
  #text

  /** @param {ComboboxOptions<T>} options - How it starts */
  constructor(options) {
    /** @readonly */
    this.id = options.id ?? 'combobox'
    /** @readonly */
    this.label = options.label ?? ''
    /** @readonly */
    this.placeholder = options.placeholder ?? ''
    this.kind = kindOf(options)
    this.#text = options.text
    const source = 'source' in options ? options.source : undefined
    /** @type {ListPipeline<T, TemplateResult, ItemSource<T>>} */
    const list = listPipeline(source ?? noOptions())
    this.list = list
    this.current = active(list)
    const { value } = options
    const { editable } = this.kind
    this.field = defineField({
      /**
       * @param {State} state - The first state
       * @returns {Chosen<T>} The option to start with, and its text
       */
      create: (state) => ({
        deleting: false,
        text: editable && value !== undefined ? state.facet(list.text)(value) : '',
        value,
      }),
      update: (was, transaction) =>
        transaction.effects.reduce((next, effect) => this.#after(next, effect, transaction), was),
    })
  }

  /** @returns {string} The id of its listbox */
  get listId() {
    return `${this.id}-listbox`
  }

  /**
   * Puts the combobox's core in a configuration.
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
      this.#text === undefined ? [] : list.text.of(this.#text),
      list.attributes.of((row, state) => this.#rowAttributes(row, state)),
      list.containerAttributes.of(() => ({
        'aria-label': this.label,
        id: this.listId,
        part: 'viewport',
        role: 'listbox',
        tabindex: -1,
      })),
      precedence(
        'high',
        list.containerAttributes.of(() => ({ 'aria-activedescendant': false })),
      ),
      precedence(
        'highest',
        inputHandler.of((input, store) => (input.is(keyInput) ? this.#gate(input.value, store) : false)),
      ),
      inputHandler.of((input, store) => {
        if (input.is(list.press)) {
          return this.choose(store, input.value.position)
        }
        return input.is(keyInput) && this.layer.open.get() && this.#openKey(input.value, store)
      }),
      this.#following(),
      viewContent.of((state) => this.#view(state)),
      this.#page(),
    ]
    into.add(parts, level)
  }

  /**
   * What an option is called.
   * @param {State} state - The state
   * @param {T} item - The option
   * @returns {string} Its text
   */
  textOf(state, item) {
    return state.facet(this.list.text)(item)
  }

  /**
   * Opens the list, its active option where `at` says; one that suggests finds its options for the text first, and
   * stays closed if there are none.
   * @param {Store} store - The combobox's store
   * @param {OpenAt} at - Where the active option goes
   * @returns {void}
   */
  open(store, at) {
    if (this.kind.suggest === undefined) {
      this.layer.open.request(true)
      void this.#land(store, at)
    } else {
      void this.#suggest(store, store.state.field(this.field).text, at)
    }
  }

  /**
   * Opens the list if it is closed, closes it if it is open: what a press on the field does.
   * @param {Store} store - The combobox's store
   * @returns {void}
   */
  toggle(store) {
    if (this.layer.open.get()) {
      this.layer.open.request(false)
    } else {
      this.open(store, 'value-or-first')
    }
  }

  /**
   * Chooses the option at a position, if it has been read, and closes the list.
   * @param {Store} store - The combobox's store
   * @param {number} position - Where it is among the options
   * @returns {boolean} Whether there was an option there
   */
  choose(store, position) {
    const item = readNow(this.list.listOf(store.state), position)
    if (item === undefined) {
      return false
    }
    store.dispatch({ effects: this.chosen.of(item.item) })
    this.layer.open.request(false)
    return true
  }

  /**
   * Chooses the active option, if there is one, and closes the list.
   * @param {Store} store - The combobox's store
   * @returns {void}
   */
  chooseActive(store) {
    const at = this.current.positionIn(store.state)
    if (at === undefined || !this.choose(store, at)) {
      this.layer.open.request(false)
    }
  }

  /**
   * Empties an editable field, choosing nothing.
   * @param {Store} store - The combobox's store
   * @returns {void}
   */
  clear(store) {
    this.#suggestions.drop()
    store.dispatch({ effects: [this.typed.of({ deleting: false, text: '' }), this.chosen.of(undefined)] })
  }

  /**
   * New text typed in an editable field: nothing is chosen any more, and one that suggests finds its options for it,
   * opening its list on them, the first active if it selects by itself; empty text closes the list instead.
   * @param {Store} store - The combobox's store
   * @param {string} text - What the field holds now
   * @param {boolean} deleting - Whether it was deleting, so nothing completes it inline
   * @returns {void}
   */
  type(store, text, deleting) {
    const chose = store.state.field(this.field).value === undefined ? [] : [this.chosen.of(undefined)]
    store.dispatch({ effects: [this.typed.of({ deleting, text }), ...chose] })
    if (this.kind.suggest === undefined) {
      return
    }
    if (text === '') {
      this.#suggestions.drop()
      this.layer.open.request(false)
    } else {
      void this.#suggest(store, text, this.kind.selectsOnLeave ? 'first' : 'none')
    }
  }

  /**
   * What the field shows with `both` autocomplete: what was typed, then the rest of the active option's text, while
   * the list is open, the option starts with what was typed, and the last edit was not a deletion.
   * @param {State} state - The state
   * @returns {string | undefined} The text shown, typed part and completion
   */
  completionIn(state) {
    const at = this.current.positionIn(state)
    const item = at === undefined ? undefined : readNow(this.list.listOf(state), at)
    const { deleting, text: typed } = state.field(this.field)
    if (this.kind.autocomplete !== 'both' || deleting || item === undefined || typed === '') {
      return undefined
    }
    const whole = this.textOf(state, item.item)
    return this.layer.open.get() && startsWithTyped(whole, typed) ? `${typed}${whole.slice(typed.length)}` : undefined
  }

  /**
   * Keeps an inline completion as typed text, as moving the cursor into it does.
   * @param {Store} store - The combobox's store
   * @returns {void}
   */
  keepCompletion(store) {
    const shown = this.completionIn(store.state)
    if (shown !== undefined) {
      store.dispatch({ effects: this.typed.of({ deleting: false, text: shown }) })
    }
  }

  /**
   * What the field holds after one effect: what was typed, or the option chosen, whose text an editable field takes.
   * @param {Chosen<T>} value - What it held
   * @param {Effect<unknown>} effect - The effect
   * @param {Transaction} transaction - The transaction it is in
   * @returns {Chosen<T>} What it holds
   */
  #after(value, effect, transaction) {
    if (effect.is(this.typed)) {
      return { deleting: effect.value.deleting, text: effect.value.text, value: value.value }
    }
    if (!effect.is(this.chosen)) {
      return value
    }
    const chosen = effect.value
    const text = this.kind.editable && chosen !== undefined ? this.textOf(transaction.state, chosen) : value.text
    return { deleting: false, text, value: chosen }
  }

  /**
   * Whether an option is the one chosen.
   * @param {State} state - The state
   * @param {T} item - The option
   * @returns {boolean} Whether it is
   */
  #isChosen(state, item) {
    const { value } = state.field(this.field)
    const list = this.list.listOf(state)
    return value !== undefined && list.key(value) === list.key(item)
  }

  /**
   * An option's attributes: its id, role, state and parts.
   * @param {RenderRow<T>} row - Its row
   * @param {State} state - The state
   * @returns {Attributes} The attributes
   */
  #rowAttributes(row, state) {
    if (row.kind !== 'item') {
      return {}
    }
    const isActive = this.current.positionIn(state) === row.position
    const chosen = row.item !== undefined && this.#isChosen(state, row.item)
    return {
      'aria-selected': isActive ? 'true' : 'false',
      id: `${this.id}-option-${String(row.position)}`,
      part: `option${isActive ? ' option-active' : ''}${chosen ? ' option-chosen' : ''}`,
      role: 'option',
    }
  }

  /**
   * A key, gated by whether the list is open: with it closed, the keys that open it, and every other key kept from the
   * list; an editable field's own keys, which put the cursor back in its text; Escape.
   * @param {KeyInput} key - The key
   * @param {Store} store - The combobox's store
   * @returns {Handled} What was done with it
   */
  #gate(key, store) {
    const open = this.layer.open.get()
    const { editable } = this.kind
    if (key.key === 'Escape') {
      return this.#escape(store)
    }
    if (!open) {
      return editable ? this.#closedEditable(key, store) : this.#closedSelect(key, store)
    }
    if (editable && TO_FIELD.has(key.key)) {
      if (this.current.positionIn(store.state) !== undefined) {
        this.keepCompletion(store)
        store.dispatch({ effects: this.current.moved.of({ entering: false, shift: false, to: undefined }) })
      }
      return 'keep-default'
    }
    return false
  }

  /**
   * Escape: closes the list, choosing nothing; with it closed, empties an editable field that clears on Escape.
   * @param {Store} store - The combobox's store
   * @returns {Handled} What was done with it
   */
  #escape(store) {
    if (this.layer.open.get()) {
      this.layer.dismiss('escape')
      return true
    }
    if (this.kind.editable && this.kind.clearsOnEscape && store.state.field(this.field).text !== '') {
      this.clear(store)
      return true
    }
    return false
  }

  /**
   * A key with a select-only combobox's list closed: the arrows, Enter, Space, Home and End open it, and a character
   * typed opens it for typing to go to the option it starts.
   * @param {KeyInput} key - The key
   * @param {Store} store - The combobox's store
   * @returns {Handled} What was done with it
   */
  #closedSelect(key, store) {
    if (key.key === 'ArrowDown' && key.alt) {
      this.open(store, 'value')
    } else if (key.key === 'ArrowDown' || key.key === 'Enter' || key.key === ' ') {
      this.open(store, 'value-or-first')
    } else if (key.key === 'ArrowUp' || key.key === 'Home' || key.key === 'End') {
      this.open(store, key.key === 'End' ? 'last' : 'first')
    } else if (printable(key)) {
      this.open(store, 'none')
      return false
    } else {
      return 'keep-default'
    }
    return true
  }

  /**
   * A key with an editable combobox's list closed: Down opens it on the first option, Up on the last, Alt+Down on the
   * option chosen. The rest edit the text.
   * @param {KeyInput} key - The key
   * @param {Store} store - The combobox's store
   * @returns {Handled} What was done with it
   */
  #closedEditable(key, store) {
    if (key.key === 'ArrowDown') {
      this.open(store, key.alt ? 'value' : 'first')
      return true
    }
    if (key.key === 'ArrowUp' && !key.alt) {
      this.open(store, 'last')
      return true
    }
    return 'keep-default'
  }

  /**
   * A key with the list open: Enter and Alt+Up choose the active option, and Space too in a select-only one (unless it
   * continues what is being typed, which typing takes first); from no active option, Down and Page Down go to the
   * first and Up and Page Up to the last, as Home and End do in a select-only one. Other moves are the list's.
   * @param {KeyInput} key - The key
   * @param {Store} store - The combobox's store
   * @returns {boolean} Whether it was taken
   */
  #openKey(key, store) {
    const { editable } = this.kind
    const choosing = key.key === 'Enter' || (key.key === 'ArrowUp' && key.alt) || (!editable && key.key === ' ')
    if (choosing) {
      this.chooseActive(store)
      return true
    }
    const moves = MOVES.has(key.key) || (!editable && (key.key === 'Home' || key.key === 'End'))
    if (!moves || this.current.positionIn(store.state) !== undefined) {
      return false
    }
    const { state } = store
    const down = key.key === 'ArrowDown' || key.key === 'PageDown' || key.key === 'Home'
    const to = down
      ? this.current.landing(state, 0, 1)
      : this.current.landing(state, this.list.listOf(state).count() - 1, -1)
    if (to !== undefined) {
      store.dispatch({ effects: this.current.go(to) })
    }
    return true
  }

  /**
   * Makes an option active as the list opens, where `at` says, never on an option focus passes over: the option chosen
   * is found through the source's `positionOf`, without which it can't be found without reading every option. A later
   * landing, or the list closing, drops this one.
   * @param {Store} store - The combobox's store
   * @param {OpenAt} at - Where
   * @returns {Promise<void>} When it has landed, or not
   */
  async #land(store, at) {
    const { state } = store
    const list = this.list.listOf(state)
    const { value } = state.field(this.field)
    const landed = await this.#landings.ask(async () => {
      if (at === 'none') {
        return undefined
      }
      if (at === 'first' || at === 'last') {
        return at === 'first' ? this.current.landing(state, 0, 1) : this.current.landing(state, list.count() - 1, -1)
      }
      const chosen = value === undefined ? undefined : await list.positionOf?.(list.key(value))
      return chosen ?? (at === 'value-or-first' ? this.current.landing(state, 0, 1) : undefined)
    })
    if (landed?.answer !== undefined && this.layer.open.get()) {
      store.dispatch({ effects: this.current.go(landed.answer) })
    }
  }

  /**
   * Finds the options for some text and, unless something else was asked for meanwhile, shows them, opening the list
   * and making one active where asked; with none, closes the list.
   * @param {Store} store - The combobox's store
   * @param {string} text - The text
   * @param {OpenAt} at - Where the active option goes
   * @returns {Promise<void>} When they are shown and one is active, or they were dropped
   */
  async #suggest(store, text, at) {
    const { suggest } = this.kind
    if (suggest === undefined) {
      return
    }
    const found = await this.#suggestions.ask(async () => suggest(text))
    if (found === undefined) {
      return
    }
    const options = found.answer ?? noOptions()
    store.dispatch({ effects: this.list.setSource.of(options) })
    if (options.count() === 0) {
      this.layer.open.request(false)
      return
    }
    this.layer.open.request(true)
    await this.#land(store, at)
  }

  /**
   * What follows the layer: its opening and closing shown, a landing still to come dropped as it closes and no option
   * left active; and leaving the list (Tab, a press elsewhere) choosing its active option when it selects by itself.
   * @returns {Extension} The plugin
   */
  #following() {
    return definePlugin((store) => {
      const stops = [
        this.layer.onDismiss((reason) => {
          const at = this.current.positionIn(store.state)
          const leaving = reason === 'outside' || reason === 'focus-outside'
          if (this.kind.selectsOnLeave && leaving && at !== undefined) {
            this.choose(store, at)
          }
        }),
        this.layer.open.subscribe((open) => {
          /** @type {Effect<unknown>[]} */
          const forget = []
          if (!open) {
            this.#landings.drop()
            forget.push(this.current.moved.of({ entering: false, shift: false, to: undefined }))
          }
          store.dispatch({ effects: [this.layerChanged.of(open), ...forget] })
        }),
      ]
      return {
        destroy: () => {
          for (const stop of stops) {
            stop()
          }
        },
      }
    })
  }

  /**
   * The combobox: its field, and its listbox of options in a popup.
   * @param {State} state - The state
   * @returns {TemplateResult} The view
   */
  #view(state) {
    return html`<div part="combobox"
      >${this.kind.editable ? this.#editField(state) : this.#selectField(state)}<div
        part="overlay popup"
        popover="manual"
        >${this.list.render(state)}</div
      ></div
    >`
  }

  /**
   * A select-only combobox's field: focusable, showing the option chosen or the placeholder.
   * @param {State} state - The state
   * @returns {TemplateResult} The field
   */
  #selectField(state) {
    const { value } = state.field(this.field)
    return html`<div
      part="field"
      role="combobox"
      tabindex="0"
      aria-label=${this.label}
      aria-haspopup="listbox"
      aria-expanded=${this.layer.open.get() ? 'true' : 'false'}
      aria-controls=${this.listId}
      aria-activedescendant=${this.current.descendantIn(state)}
      ><span part=${value === undefined ? 'value placeholder' : 'value'}
        >${value === undefined ? this.placeholder : this.textOf(state, value)}</span
      ></div
    >`
  }

  /**
   * An editable combobox's field: a text input, focus staying in it as options are suggested.
   * @param {State} state - The state
   * @returns {TemplateResult} The field
   */
  #editField(state) {
    return comboboxInput({
      active: this.current.descendantIn(state),
      autocomplete: this.kind.autocomplete,
      controls: this.listId,
      expanded: this.layer.open.get(),
      label: this.label,
      part: 'field',
      value: state.field(this.field).text,
    })
  }

  /**
   * What the combobox does in the page: its field's typing and keys heard, and a press on a select-only field opening
   * or closing the list; a press in the popup keeping focus in the field; after each render, the popup shown while the
   * list is open, below the field and at least as wide, and an editable field's text with its completion selected after
   * what was typed.
   * @returns {Extension} The view plugin
   */
  #page() {
    return viewPlugin((store, root) => {
      const stop = hearField(root, '[part~="field"]', {
        input: (text, deleting) => {
          this.type(store, text, deleting)
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
      /**
       * A press on a select-only field, or in the popup.
       * @param {Event} event - The press
       * @returns {void}
       */
      const press = (event) => {
        const { target } = event
        if (!(target instanceof Element)) {
          return
        }
        if (event.type === 'mousedown' && target.closest('[part~="popup"]') !== null) {
          event.preventDefault()
        } else if (event.type === 'click' && !this.kind.editable && target.closest('[part~="field"]') !== null) {
          this.toggle(store)
        }
      }
      root.addEventListener('mousedown', press)
      root.addEventListener('click', press)
      return {
        destroy: () => {
          stop()
          root.removeEventListener('mousedown', press)
          root.removeEventListener('click', press)
          const popup = ownElement(root, '[part~="popup"]')
          if (popup !== undefined) {
            releaseOverlay(popup)
          }
        },
        rendered: () => {
          const container = ownElement(root, '[part~="combobox"]')
          const field = ownElement(root, '[part~="field"]')
          const popup = ownElement(root, '[part~="popup"]')
          if (container === undefined || field === undefined || popup === undefined) {
            return
          }
          container.style.setProperty('--_field-width', `${String(field.getBoundingClientRect().width)}px`)
          syncOverlay(popup, this.layer, { anchor: field, focus: 'stay' })
          if (field instanceof HTMLInputElement) {
            const typed = store.state.field(this.field).text
            const shown = this.completionIn(store.state) ?? typed
            if (field.value !== shown) {
              field.value = shown
              if (shown !== typed) {
                field.setSelectionRange(typed.length, shown.length)
              }
            }
          }
        },
      }
    })
  }
}

/**
 * A combobox: its core and the extensions it is made of, as a store, with what an app and a view do to it.
 * @template T
 */
class Combobox extends Store {
  /** @param {ComboboxOptions<T>} options - How it starts */
  constructor(options) {
    /** @type {ComboboxCore<T>} */
    const core = new ComboboxCore(options)
    super([core, options.extensions?.(core) ?? []])
    /** @readonly */
    this.core = core
  }

  /** @returns {Layer} The layer its list opens in */
  get layer() {
    return this.core.layer
  }

  /** @returns {ComboboxKind<T>} What kind it is */
  get kind() {
    return this.core.kind
  }

  /** @returns {T | undefined} The option chosen, if any */
  get value() {
    return this.state.field(this.core.field).value
  }

  /** @returns {string} What an editable field holds */
  get text() {
    return this.state.field(this.core.field).text
  }

  /** @returns {string | undefined} What the field shows with `both` autocomplete, typed part and completion */
  get completion() {
    return this.core.completionIn(this.state)
  }

  /** @returns {number | undefined} The position of the active option, if any */
  get active() {
    return this.core.current.positionIn(this.state)
  }

  /** @returns {number} How many options there are */
  get count() {
    return this.core.list.listOf(this.state).count()
  }

  /**
   * The option at a position, if it has been read.
   * @param {number} position - Where it is
   * @returns {T | undefined} The option
   */
  option(position) {
    return readNow(this.core.list.listOf(this.state), position)?.item
  }

  /**
   * Sets the option chosen, as an app that owns it does once it decides.
   * @param {T | undefined} value - The option, or none
   * @returns {void}
   */
  setValue(value) {
    this.dispatch({ effects: this.core.chosen.of(value), filter: false })
  }

  /**
   * Opens the list, its active option where `at` says.
   * @param {OpenAt} [at] - Where the active option goes
   * @returns {void}
   */
  open(at = 'value') {
    this.core.open(this, at)
  }

  /**
   * Asks to close the list, choosing nothing.
   * @returns {void}
   */
  close() {
    this.core.layer.open.request(false)
  }

  /**
   * Opens the list if it is closed, closes it if it is open.
   * @returns {void}
   */
  toggle() {
    this.core.toggle(this)
  }

  /**
   * Chooses the option at a position, if it has been read, and closes the list.
   * @param {number} position - Where it is
   * @returns {boolean} Whether there was an option there
   */
  choose(position) {
    return this.core.choose(this, position)
  }

  /**
   * Empties an editable field, choosing nothing.
   * @returns {void}
   */
  clear() {
    this.core.clear(this)
  }

  /**
   * New text typed in an editable field.
   * @param {string} text - What the field holds now
   * @param {boolean} [deleting] - Whether it was deleting
   * @returns {void}
   */
  type(text, deleting = false) {
    this.core.type(this, text, deleting)
  }

  /**
   * A key typed in the field.
   * @param {string} key - The key, as `KeyboardEvent.key` names it
   * @param {ComboboxModifiers} [modifiers] - What was held
   * @returns {boolean} Whether it was used, so its default should be prevented
   */
  key(key, modifiers = PLAIN) {
    return this.handle(keyInput.of({ ...modifiers, key }))
  }
}

export { Combobox, ComboboxCore }
