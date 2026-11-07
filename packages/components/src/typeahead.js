/**
 * @import { KeyInput } from '@interact/core/inputs'
 * @import { ItemSource } from '@interact/core/source'
 * @import { Builder, Effect, EffectType, Extension, Field, State } from '@interact/core/state'
 * @import { Store } from '@interact/core/store'
 * @import { ActiveItem } from './active-item.js'
 */

import {
  defineEffect,
  defineField,
  findPrefix,
  inputHandler,
  keyInput,
  precedence,
  startsWithTyped,
} from '@interact/core'

import { readNow } from './active-item.js'

/** What was typed is forgotten after this long without a key, in milliseconds: the APG example's wait. */
const WAIT = 500

/**
 * What has been typed in quick succession, when the last of it was, and how many searches have started, so an answer
 * to one that a later one has overtaken is dropped.
 * @typedef {Readonly<{ typed: string, at: number, searches: number }>} Typed
 */

/**
 * A character typed, and when.
 * @typedef {Readonly<{ character: string, at: number }>} Keystroke
 */

/** @type {Intl.Segmenter | undefined} */
let segmenter = undefined

/**
 * A text's characters as a person sees them: an emoji or a letter with its accents is one.
 * @param {string} text - The text
 * @returns {string[]} Its characters
 */
function graphemes(text) {
  segmenter ??= new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  /** @type {string[]} */
  const found = []
  for (const { segment } of segmenter.segment(text)) {
    found.push(segment)
  }
  return found
}

/**
 * What has been typed after one more character.
 * @param {Typed} typed - What had been
 * @param {Keystroke} keystroke - The character, and when
 * @returns {Typed} What has been now
 */
function typedAfter(typed, { at, character }) {
  return { at, searches: typed.searches + 1, typed: `${at - typed.at < WAIT ? typed.typed : ''}${character}` }
}

/**
 * A value at once or later, then what `after` makes of it, at once when it could be.
 * @template A, B
 * @param {A | Promise<A>} value - The value
 * @param {(value: A) => B | Promise<B>} after - What to make of it
 * @returns {B | Promise<B>} What it made
 */
function then(value, after) {
  if (value instanceof Promise) {
    const later = value
    return (async () => after(await later))()
  }
  return after(value)
}

/**
 * Typing to move to an item, as the WAI-ARIA Authoring Practices listbox pattern describes: a character moves to the
 * next item whose text starts with it, and characters typed in quick succession (within `WAIT`) to the next whose
 * text starts with all of them, going round to the start. The whole of what was typed is looked for first, so "aa"
 * reaches "Aaron"; only when nothing starts with it, and it is one character typed again and again, does it move on
 * to the next item starting with that character. A space continues what is being typed, so it is taken before a
 * selection's Space. It asks the list the `findPrefix` query, since only a source knows every item; a list that
 * doesn't answer is searched among the rows it renders. An answer that comes later moves the active item then, unless
 * more was typed meanwhile.
 * @template T, R
 * @template {ItemSource<T>} S
 */
class Typeahead {
  /**
   * A character typed.
   * @readonly
   * @type {EffectType<Keystroke>}
   */
  typed = defineEffect()
  /**
   * What has been typed.
   * @readonly
   * @type {Field<Typed>}
   */
  field = defineField({
    /** @returns {Typed} Nothing typed yet */
    create: () => ({ at: Number.NEGATIVE_INFINITY, searches: 0, typed: '' }),
    update: (value, transaction) =>
      transaction.effectsOf(this.typed).reduce((typed, keystroke) => typedAfter(typed, keystroke), value),
  })
  /**
   * @readonly
   * @type {ActiveItem<T, R, S>}
   */
  #current
  /**
   * @readonly
   * @type {() => number}
   */
  #now

  /**
   * @param {ActiveItem<T, R, S>} current - The list's active item
   * @param {() => number} now - What time it is, in milliseconds
   */
  constructor(current, now) {
    this.#current = current
    this.#now = now
  }

  /**
   * Puts typeahead in a configuration.
   * @param {Builder} into - The configuration being built
   * @param {number} level - Its level
   * @returns {void}
   */
  install(into, level) {
    /** @type {Extension} */
    const parts = [
      this.#current,
      this.field,
      precedence(
        'high',
        inputHandler.of((input, store) => input.is(keyInput) && this.#key(input.value, store)),
      ),
    ]
    into.add(parts, level)
  }

  /**
   * Whether something was typed a moment ago, so a space continues it instead of meaning itself.
   * @param {State} state - The state
   * @returns {boolean} Whether typing is going on
   */
  typing(state) {
    const { at, typed } = state.field(this.field)
    return typed !== '' && this.#now() - at < WAIT
  }

  /**
   * Takes a key that types: a character, or a space while typing goes on, with no modifier but Shift.
   * @param {KeyInput} key - The key
   * @param {Store} store - The store
   * @returns {boolean} Whether it typed
   */
  #key({ alt, key, shift, toggle }, store) {
    const { state } = store
    const list = this.#current.list.listOf(state)
    const types = key === ' ' ? !shift && this.typing(state) : graphemes(key).length === 1
    if (alt || toggle || !types || list.count() === 0) {
      return false
    }
    const keystroke = { at: this.#now(), character: key }
    const typed = typedAfter(state.field(this.field), keystroke)
    const found = this.#seek(state, typed, key)
    if (found instanceof Promise) {
      store.dispatch({ effects: this.typed.of(keystroke) })
      const later = found
      void (async () => {
        const position = await later
        if (store.state.field(this.field).searches === typed.searches) {
          this.#land(store, position, [])
        }
      })()
    } else {
      this.#land(store, found, [this.typed.of(keystroke)])
    }
    return true
  }

  /**
   * Makes a position found active and shows it, with the effects that go with it, in one transaction.
   * @param {Store} store - The store
   * @param {number | undefined} found - Where an item was found, if anywhere
   * @param {readonly Effect<unknown>[]} effects - The effects that go with it
   * @returns {void}
   */
  #land(store, found, effects) {
    const landed = found === undefined ? undefined : this.#current.landing(store.state, found, 1)
    const moves = landed === undefined ? [] : this.#current.go(landed)
    if (effects.length > 0 || moves.length > 0) {
      store.dispatch({ effects: [...effects, ...moves] })
    }
  }

  /**
   * Looks for what was typed: the whole of it, from after the active item for a first character and at it for more,
   * then, for one character typed again and again, the next item after the active one starting with it.
   * @param {State} state - The state before the character
   * @param {Typed} typed - What has been typed, the character with it
   * @param {string} character - The character
   * @returns {number | undefined | Promise<number | undefined>} Where an item was found, if anywhere
   */
  #seek(state, typed, character) {
    const characters = graphemes(typed.typed)
    const first = characters.length === 1
    const cycle = !first && characters.every((each) => each === character) ? character : undefined
    const active = this.#current.positionIn(state)
    const top = state.facet(this.#current.list.visible)(state)?.start ?? 0
    const next = active === undefined ? top : active + 1
    const from = active === undefined ? top : active + (first ? 1 : 0)
    return then(this.#findRound(state, typed.typed, from), (whole) =>
      whole === undefined && cycle !== undefined ? this.#findRound(state, cycle, next) : whole,
    )
  }

  /**
   * The first position at or after `from` whose item's text starts with `text`, going round to the start if there is
   * none after it.
   * @param {State} state - The state
   * @param {string} text - What to look for
   * @param {number} from - Where to start
   * @returns {number | undefined | Promise<number | undefined>} The position, if any
   */
  #findRound(state, text, from) {
    const count = this.#current.list.listOf(state).count()
    const start = from < count ? Math.max(from, 0) : 0
    return then(this.#find(state, text, start), (found) =>
      found === undefined && start > 0 ? this.#find(state, text, 0) : found,
    )
  }

  /**
   * The first position at or after `from` whose item's text starts with `text`: asked of the list, or looked for among
   * the rows it renders when it doesn't answer.
   * @param {State} state - The state
   * @param {string} text - What to look for
   * @param {number} from - Where to start
   * @returns {number | undefined | Promise<number | undefined>} The position, if any
   */
  #find(state, text, from) {
    const { list } = this.#current
    const source = list.listOf(state)
    const asked = findPrefix.ask(source, { from, text })
    if (asked !== undefined) {
      return asked.answer
    }
    const textOf = state.facet(list.text)
    const rows = list.rowsIn(state)
    /** @type {number | undefined} */
    let found = undefined
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows.at(index)
      const position = row?.kind === 'item' ? row.position : undefined
      if (position !== undefined && position >= from && (found === undefined || position < found)) {
        const item = readNow(source, position)
        if (item !== undefined && startsWithTyped(textOf(item.item), text)) {
          found = position
        }
      }
    }
    return found
  }
}

/**
 * Typeahead for a list.
 * @template T, R
 * @template {ItemSource<T>} S
 * @param {ActiveItem<T, R, S>} current - The list's active item
 * @param {Readonly<{ now?: (() => number) | undefined }>} [options] - The clock typing is timed by, in milliseconds
 * @returns {Typeahead<T, R, S>} The extension
 */
function typeahead(current, options = {}) {
  return new Typeahead(current, options.now ?? (() => performance.now()))
}

export { Typeahead, WAIT, graphemes, typeahead }
