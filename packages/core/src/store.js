/**
 * @import { Builder, Effect, Extension, Facet, Transaction, TransactionSpec } from './state.js'
 */

import { Listeners } from './listeners.js'
import { State, listFacet } from './state.js'

/**
 * Something done to a component that some extension may take: a key, a press. It is an effect, so its type says what
 * its value is; it goes to the input handlers in order until one takes it.
 * @typedef {(input: Effect<unknown>, store: Store) => boolean} InputHandler
 */

/**
 * A running plugin: told of every transaction once its state is the store's, and stopped with the store.
 * @typedef {Readonly<{ update?: (transaction: Transaction) => void, destroy?: () => void }>} PluginInstance
 */

/**
 * What the store runs of a plugin, whatever its instance's type.
 * @typedef {Readonly<{
 *   start: (store: Store) => void,
 *   update: (store: Store, transaction: Transaction) => void,
 *   stop: (store: Store) => void,
 * }>} Running
 */

/**
 * The input handlers, in order: the first to say it took an input is the last to see it.
 * @type {Facet<InputHandler, readonly InputHandler[]>}
 */
const inputHandler = listFacet()

/** @type {Facet<Running, readonly Running[]>} */
const plugins = listFacet()

/**
 * A plugin: something with a life beside the state, made when a store is, that may keep its own resources (a timer, a
 * subscription to a source) and dispatch transactions of its own. It is an extension.
 * @template {PluginInstance} P
 */
class Plugin {
  /**
   * @readonly
   * @type {(store: Store) => P}
   */
  #create
  /**
   * @readonly
   * @type {WeakMap<Store, P>}
   */
  #instances = new WeakMap()

  /** @param {(store: Store) => P} create - Makes its instance for a store */
  constructor(create) {
    this.#create = create
  }

  /**
   * Puts the plugin in a configuration.
   * @param {Builder} into - The configuration being built
   * @param {number} level - Its level
   * @returns {void}
   */
  install(into, level) {
    plugins.of(this).install(into, level)
  }

  /**
   * Makes its instance for a store.
   * @param {Store} store - The store
   * @returns {void}
   */
  start(store) {
    this.#instances.set(store, this.#create(store))
  }

  /**
   * Tells its instance in a store of a transaction.
   * @param {Store} store - The store
   * @param {Transaction} transaction - The transaction
   * @returns {void}
   */
  update(store, transaction) {
    this.#instances.get(store)?.update?.(transaction)
  }

  /**
   * Stops its instance in a store.
   * @param {Store} store - The store
   * @returns {void}
   */
  stop(store) {
    this.#instances.get(store)?.destroy?.()
    this.#instances.delete(store)
  }

  /**
   * Its instance in a store.
   * @param {Store} store - The store
   * @returns {P | undefined} The instance, while the store runs it
   */
  instanceIn(store) {
    return this.#instances.get(store)
  }
}

/**
 * A component's live state: the state now, the transactions that change it, the inputs extensions take, and the
 * plugins running beside it. It delivers; it decides nothing. A transaction dispatched while another applies (by a
 * plugin, or a source reporting a change) applies right after it, in order.
 */
class Store {
  /** @type {State} */
  #state
  /**
   * @readonly
   * @type {TransactionSpec[]}
   */
  #queue = []
  #applying = false
  #destroyed = false
  /**
   * @readonly
   * @type {Listeners<Transaction>}
   */
  #listeners = new Listeners()

  /** @param {Extension} extensions - What the component is made of */
  constructor(extensions) {
    this.#state = State.create(extensions)
    for (const plugin of this.#state.facet(plugins)) {
      plugin.start(this)
    }
  }

  /**
   * The state now.
   * @returns {State} The state
   */
  get state() {
    return this.#state
  }

  /**
   * Applies a transaction: it makes the new state, then the plugins and then the listeners hear it.
   * @param {TransactionSpec} spec - What it is asked for
   * @returns {void}
   */
  dispatch(spec) {
    if (this.#destroyed) {
      throw new Error('This store has been destroyed')
    }
    this.#queue.push(spec)
    if (this.#applying) {
      return
    }
    this.#applying = true
    try {
      for (let next = this.#queue.shift(); next !== undefined; next = this.#queue.shift()) {
        const transaction = this.#state.update(next)
        this.#state = transaction.state
        for (const plugin of this.#state.facet(plugins)) {
          plugin.update(this, transaction)
        }
        this.#listeners.emit(transaction)
      }
    } finally {
      this.#applying = false
      this.#queue.length = 0
    }
  }

  /**
   * Offers an input to the input handlers, in order, until one takes it.
   * @param {Effect<unknown>} input - The input
   * @returns {boolean} Whether one took it, so whatever it would do by default shouldn't happen
   */
  handle(input) {
    return this.#state.facet(inputHandler).some((handler) => handler(input, this))
  }

  /**
   * Calls `listener` with every transaction applied, after the plugins.
   * @param {(transaction: Transaction) => void} listener - What to call
   * @returns {() => void} Stops calling it
   */
  subscribe(listener) {
    return this.#listeners.add(listener)
  }

  /**
   * A plugin's instance here.
   * @template {PluginInstance} P
   * @param {Plugin<P>} plugin - The plugin
   * @returns {P | undefined} Its instance, if the store runs it
   */
  plugin(plugin) {
    return plugin.instanceIn(this)
  }

  /**
   * Stops every plugin; nothing more can be dispatched.
   * @returns {void}
   */
  destroy() {
    if (this.#destroyed) {
      return
    }
    this.#destroyed = true
    for (const plugin of this.#state.facet(plugins)) {
      plugin.stop(this)
    }
  }
}

/**
 * A plugin.
 * @template {PluginInstance} P
 * @param {(store: Store) => P} create - Makes its instance for a store
 * @returns {Plugin<P>} The plugin
 */
function definePlugin(create) {
  return new Plugin(create)
}

export { Plugin, Store, definePlugin, inputHandler }
