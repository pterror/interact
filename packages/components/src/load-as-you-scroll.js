/**
 * @import { ListPipeline } from '@interact/core/list-pipeline'
 * @import { ItemSource } from '@interact/core/source'
 * @import { Builder, EffectType, Extension, Field, State, Transaction } from '@interact/core/state'
 * @import { Store } from '@interact/core/store'
 * @import { TemplateResult } from '@interact/dom/template'
 */

import { defineEffect, defineField, definePlugin } from '@interact/core'
import { html, ownElement, viewPlugin } from '@interact/dom'

/** How many rows before the end the person reaches before more are asked for, by default. */
const AHEAD = 5

/**
 * Whether the list is loading more: not now (`idle`), now (`loading`), never again since the app said there is no more
 * (`done`), or not since a load failed (`failed`); and how many loads have started, so the answer to one overtaken by
 * a new source is dropped.
 * @typedef {Readonly<{ status: 'idle' | 'loading' | 'done' | 'failed', load: number }>} Loading
 */

/**
 * The answer to a load: which load it was, and whether there may be more.
 * @typedef {Readonly<{ load: number, more: boolean }>} Loaded
 */

/**
 * What the status says while loading and once a load has failed.
 * @typedef {Readonly<{ loading: string, failed: string }>} StatusText
 */

/**
 * Loading items as the person scrolls toward the end of a list: once the row `ahead` rows before the last shows, the
 * app's `load` is asked for more, which it puts at the end of its source (an insertion there, so every position held
 * stays) and answers whether there may be more. In a windowed list, what shows is what windowing says (`visible`);
 * otherwise the page says, by an `IntersectionObserver` on that row. An empty list loads at once. One load at a time;
 * a load answering that there is more without the list having grown counts as the end. A load that fails stops loading
 * until the app dispatches `resume`, which also starts again after the end. A new source starts over, and drops the
 * answer to a load for the old one. A status after the list (`role="status"`, `part="status"`) says when it is loading
 * and when a load failed, and is empty otherwise.
 * @template T
 * @template {ItemSource<T>} S
 */
class LoadAsYouScroll {
  /**
   * A load starts, if none is going on and the list may have more.
   * @readonly
   * @type {EffectType<undefined>}
   */
  started = defineEffect()
  /**
   * A load answered.
   * @readonly
   * @type {EffectType<Loaded>}
   */
  finished = defineEffect()
  /**
   * A load failed, by which load it was.
   * @readonly
   * @type {EffectType<number>}
   */
  failed = defineEffect()
  /**
   * Loading may start again: after a failure, or after the end.
   * @readonly
   * @type {EffectType<undefined>}
   */
  resume = defineEffect()
  /**
   * @readonly
   * @type {Field<Loading>}
   */
  field
  /**
   * @readonly
   * @type {ListPipeline<T, TemplateResult, S>}
   */
  #list
  /**
   * @readonly
   * @type {() => Promise<boolean>}
   */
  #load
  /**
   * @readonly
   * @type {number}
   */
  #ahead
  /**
   * @readonly
   * @type {StatusText}
   */
  #text

  /**
   * @param {ListPipeline<T, TemplateResult, S>} list - The list
   * @param {() => Promise<boolean>} load - Puts more items at the end of the app's source, and says whether there may
   *   be more
   * @param {number} ahead - How many rows before the end the person reaches before more are asked for
   * @param {StatusText} text - What the status says
   */
  constructor(list, load, ahead, text) {
    this.#list = list
    this.#load = load
    this.#ahead = ahead
    this.#text = text
    this.field = defineField({
      /** @returns {Loading} Nothing loading */
      create: () => ({ load: 0, status: 'idle' }),
      update: (value, transaction) => this.#next(value, transaction),
    })
  }

  /**
   * Puts loading in a configuration.
   * @param {Builder} into - The configuration being built
   * @param {number} level - Its level
   * @returns {void}
   */
  install(into, level) {
    const list = this.#list
    /** @type {Extension} */
    const parts = [
      list.extension,
      this.field,
      this.#loader(),
      this.#page(),
      list.container.of((children, next, state) => {
        const { status } = state.field(this.field)
        const said = status === 'loading' ? this.#text.loading : status === 'failed' ? this.#text.failed : ''
        return html`${next(children)}<div role="status" part="status">${said}</div>`
      }),
    ]
    into.add(parts, level)
  }

  /**
   * Whether the list is loading in a state.
   * @param {State} state - The state
   * @returns {Loading['status']} Its status
   */
  statusIn(state) {
    return state.field(this.field).status
  }

  /**
   * Asks for more now, unless a load is going on, the list has ended, or a load failed.
   * @param {Store} store - The store
   * @returns {void}
   */
  request(store) {
    if (this.statusIn(store.state) === 'idle') {
      store.dispatch({ effects: this.started.of(undefined) })
    }
  }

  /**
   * Loading after a transaction.
   * @param {Loading} value - Before it
   * @param {Transaction} transaction - The transaction
   * @returns {Loading} After it
   */
  #next(value, transaction) {
    const list = this.#list
    const replaced = transaction.state.field(list.source) !== transaction.startState.field(list.source)
    let load = replaced ? value.load + 1 : value.load
    /** @type {Loading['status']} */
    let status = replaced ? 'idle' : value.status
    for (const effect of transaction.effects) {
      if (effect.is(this.started) && status === 'idle') {
        load += 1
        status = 'loading'
      } else if (effect.is(this.finished) && effect.value.load === load && status === 'loading') {
        status = effect.value.more ? 'idle' : 'done'
      } else if (effect.is(this.failed) && effect.value === load && status === 'loading') {
        status = 'failed'
      } else if (effect.is(this.resume) && status !== 'loading') {
        status = 'idle'
      }
    }
    return load === value.load && status === value.status ? value : { load, status }
  }

  /**
   * Whether the person is near enough the end, as far as the state knows: always in an empty list, and in a list some
   * extension says the shown positions of, once the row `ahead` before the last shows.
   * @param {State} state - The state
   * @returns {boolean} Whether to load
   */
  #near(state) {
    const count = this.#list.listOf(state).count()
    const shown = state.facet(this.#list.visible)(state)
    return count === 0 || (shown !== undefined && shown.end + this.#ahead >= count)
  }

  /**
   * What loads: as each load starts, the app's `load`, answered while the store lives; and after every transaction, a
   * load when the state says the person is near the end.
   * @returns {Extension} The plugin
   */
  #loader() {
    return definePlugin((store) => {
      let alive = true
      /**
       * Starts a load if the person is near the end.
       * @returns {void}
       */
      const check = () => {
        if (alive && this.statusIn(store.state) === 'idle' && this.#near(store.state)) {
          this.request(store)
        }
      }
      /**
       * Runs the app's load, and dispatches its answer while the store lives.
       * @param {number} load - Which load this is
       * @returns {Promise<void>} When it has answered
       */
      const run = async (load) => {
        const before = this.#list.listOf(store.state).count()
        try {
          const more = await this.#load()
          const grew = this.#list.listOf(store.state).count() > before
          if (alive) {
            store.dispatch({ effects: this.finished.of({ load, more: more && grew }) })
          }
        } catch {
          if (alive) {
            store.dispatch({ effects: this.failed.of(load) })
          }
        }
      }
      queueMicrotask(check)
      return {
        destroy: () => {
          alive = false
        },
        update: (transaction) => {
          const now = transaction.state.field(this.field)
          if (now.status === 'loading' && now.load !== transaction.startState.field(this.field).load) {
            void run(now.load)
          }
          check()
        },
      }
    })
  }

  /**
   * What loading does in the page, for a list no extension says the shown positions of: it watches the row `ahead`
   * before the last, and asks for more when it comes into view, or is in view as loading may start again.
   * @returns {Extension} The view plugin
   */
  #page() {
    return viewPlugin((store, root) => {
      /** @type {IntersectionObserver | undefined} */
      let observer = undefined
      /** @type {Element | undefined} */
      let watched = undefined
      let idle = false
      return {
        destroy: () => {
          observer?.disconnect()
        },
        rendered: () => {
          const { state } = store
          const count = this.#list.listOf(state).count()
          const own = state.facet(this.#list.visible)(state) === undefined && count > 0
          const position = String(Math.max(0, count - 1 - this.#ahead))
          const target = own ? ownElement(root, `[data-position="${position}"]`) : undefined
          const wasIdle = idle
          idle = this.statusIn(state) === 'idle'
          if (target === watched && (wasIdle || !idle)) {
            return
          }
          if (watched !== undefined) {
            observer?.unobserve(watched)
          }
          watched = target
          if (target !== undefined) {
            observer ??= new IntersectionObserver((/** @type {readonly IntersectionObserverEntry[]} */ entries) => {
              if (entries.some((entry) => entry.isIntersecting)) {
                this.request(store)
              }
            })
            observer.observe(target)
          }
        },
      }
    })
  }
}

/**
 * Loading as the person scrolls, for a list.
 * @template T
 * @template {ItemSource<T>} S
 * @param {ListPipeline<T, TemplateResult, S>} list - The list
 * @param {Readonly<{ load: () => Promise<boolean>, ahead?: number | undefined, text?: StatusText | undefined }>} options -
 *   How the app loads more and says whether there may be more; how many rows before the end more are asked for (5 by
 *   default); what the status says
 * @returns {LoadAsYouScroll<T, S>} The extension
 */
function loadAsYouScroll(list, options) {
  const text = options.text ?? { failed: 'Could not load more', loading: 'Loading more…' }
  return new LoadAsYouScroll(list, options.load, options.ahead ?? AHEAD, text)
}

export { LoadAsYouScroll, loadAsYouScroll }
