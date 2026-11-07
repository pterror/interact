/**
 * @import { Builder, Facet, Transaction } from '@interact/core/state'
 * @import { Store } from '@interact/core/store'
 * @import { View } from './component.js'
 * @import { Stylesheet } from './css.js'
 * @import { TemplateResult } from './template.js'
 */

import { defineFacet, listFacet } from '@interact/core'

/**
 * A running view plugin: told after each render of the transactions applied since the one before, once the page shows
 * them, and stopped when the element leaves the page.
 * @typedef {Readonly<{
 *   rendered?: (transactions: readonly Transaction[]) => void,
 *   destroy?: () => void,
 * }>} ViewPluginInstance
 */

/**
 * What a view runs of a view plugin, whatever its instance's type.
 * @typedef {Readonly<{
 *   start: (store: Store, root: HTMLElement) => void,
 *   rendered: (store: Store, transactions: readonly Transaction[]) => void,
 *   stop: (store: Store) => void,
 * }>} RunningView
 */

/** @type {Facet<RunningView, readonly RunningView[]>} */
const viewPlugins = listFacet()

/**
 * What a store's view shows, from the state: the first extension to say, in precedence order. A component's
 * extensions say it (a listbox's list, rendered), so one view serves every instance, each with its own store.
 * @type {Facet<(state: Store['state']) => TemplateResult, ((state: Store['state']) => TemplateResult) | undefined>}
 */
const viewContent = defineFacet((inputs) => inputs[0])

/**
 * A view plugin: what of an extension needs the page. It is made when the view first renders, given the element its
 * view is in, which it may listen to and measure; it dispatches to the store as anything else does. It is an
 * extension.
 * @template {ViewPluginInstance} P
 */
class ViewPlugin {
  /**
   * @readonly
   * @type {(store: Store, root: HTMLElement) => P}
   */
  #create
  /**
   * @readonly
   * @type {WeakMap<Store, P>}
   */
  #instances = new WeakMap()

  /** @param {(store: Store, root: HTMLElement) => P} create - Makes its instance for a store and its view's element */
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
    viewPlugins.of(this).install(into, level)
  }

  /**
   * Makes its instance.
   * @param {Store} store - The store
   * @param {HTMLElement} root - Where the view is
   * @returns {void}
   */
  start(store, root) {
    this.#instances.set(store, this.#create(store, root))
  }

  /**
   * Tells its instance of a render.
   * @param {Store} store - The store
   * @param {readonly Transaction[]} transactions - What was applied since the render before
   * @returns {void}
   */
  rendered(store, transactions) {
    this.#instances.get(store)?.rendered?.(transactions)
  }

  /**
   * Stops its instance.
   * @param {Store} store - The store
   * @returns {void}
   */
  stop(store) {
    this.#instances.get(store)?.destroy?.()
    this.#instances.delete(store)
  }

  /**
   * Its instance for a store, while the store's view is in the page.
   * @param {Store} store - The store
   * @returns {P | undefined} The instance
   */
  instanceIn(store) {
    return this.#instances.get(store)
  }
}

/**
 * A view plugin.
 * @template {ViewPluginInstance} P
 * @param {(store: Store, root: HTMLElement) => P} create - Makes its instance for a store and its view's element
 * @returns {ViewPlugin<P>} The plugin
 */
function viewPlugin(create) {
  return new ViewPlugin(create)
}

/**
 * What a store's view shows now.
 * @param {Store} store - The store
 * @returns {TemplateResult} What its extensions render its state as
 * @throws {Error} If none says what the view shows
 */
function contentOf(store) {
  const content = store.state.facet(viewContent)
  if (content === undefined) {
    throw new Error('Nothing says what this view shows: include an extension giving viewContent')
  }
  return content(store.state)
}

/**
 * A web view of a store: it renders what the store's extensions say it shows (`viewContent`), and runs the store's
 * view plugins beside it, telling them after each render what was applied since the one before.
 * @param {Readonly<{ kind: string, styles: Stylesheet }>} options - Its kind and its stylesheet
 * @returns {View<Store>} The view
 */
function storeView({ kind, styles }) {
  /** @type {WeakMap<Store, Readonly<{ applied: Transaction[], stop: () => void }>>} */
  const mounted = new WeakMap()
  return {
    disconnected: (store) => {
      mounted.get(store)?.stop()
      mounted.delete(store)
      for (const plugin of store.state.facet(viewPlugins)) {
        plugin.stop(store)
      }
    },
    kind,
    render: contentOf,
    rendered: (store, root) => {
      let mount = mounted.get(store)
      if (mount === undefined) {
        /** @type {Transaction[]} */
        const applied = []
        const stop = store.subscribe((transaction) => {
          applied.push(transaction)
        })
        mount = { applied, stop }
        mounted.set(store, mount)
        for (const plugin of store.state.facet(viewPlugins)) {
          plugin.start(store, root)
        }
      }
      const transactions = mount.applied.splice(0)
      for (const plugin of store.state.facet(viewPlugins)) {
        plugin.rendered(store, transactions)
      }
    },
    styles,
  }
}

export { ViewPlugin, storeView, viewContent, viewPlugin }
