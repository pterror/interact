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
 * Where store views are mounted, so an element in one mounted inside another is known to be the inner one's.
 * @type {WeakSet<Node>}
 */
const mountedRoots = new WeakSet()

/**
 * A store's view plugins running on an element: told after each render of what applied since the one before.
 * @typedef {Readonly<{ rendered: () => void, destroy: () => void }>} Mount
 */

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
 * Runs a store's view plugins on the element its view is in: started now, told after each render what was applied
 * since the one before, and stopped by `destroy`. A view inside another's (a submenu's, in its menu's overlay) is
 * mounted on its own element, which then belongs to it rather than to the view around it (`inOwnView`).
 * @param {Store} store - The store
 * @param {HTMLElement} root - The element its view is in
 * @returns {Mount} The running plugins
 */
function mountStore(store, root) {
  /** @type {Transaction[]} */
  const applied = []
  const stop = store.subscribe((transaction) => {
    applied.push(transaction)
  })
  mountedRoots.add(root)
  const running = store.state.facet(viewPlugins)
  for (const plugin of running) {
    plugin.start(store, root)
  }
  return {
    destroy: () => {
      stop()
      mountedRoots.delete(root)
      for (const plugin of running) {
        plugin.stop(store)
      }
    },
    rendered: () => {
      const transactions = applied.splice(0)
      for (const plugin of running) {
        plugin.rendered(store, transactions)
      }
    },
  }
}

/**
 * Whether a node belongs to the view mounted on `root` rather than to a view mounted inside it: no element between
 * them, the node's own parent up, is another view's.
 * @param {HTMLElement} root - Where the view is mounted
 * @param {Node} node - The node
 * @returns {boolean} Whether it is the view's own
 */
function inOwnView(root, node) {
  for (let at = node.parentNode; at !== null; at = at.parentNode) {
    if (at === root) {
      return true
    }
    if (mountedRoots.has(at)) {
      return false
    }
  }
  return false
}

/**
 * The first element in a view's own part of `root` that matches a selector, passing over those in views mounted inside
 * it.
 * @param {HTMLElement} root - Where the view is mounted
 * @param {string} selector - The selector
 * @returns {HTMLElement | undefined} The element
 */
function ownElement(root, selector) {
  for (const found of root.querySelectorAll(selector)) {
    if (found instanceof HTMLElement && inOwnView(root, found)) {
      return found
    }
  }
  return undefined
}

/**
 * A web view of a store: it renders what the store's extensions say it shows (`viewContent`), and runs the store's
 * view plugins on its element (`mountStore`).
 * @param {Readonly<{ kind: string, styles: Stylesheet }>} options - Its kind and its stylesheet
 * @returns {View<Store>} The view
 */
function storeView({ kind, styles }) {
  /** @type {WeakMap<Store, Mount>} */
  const mounted = new WeakMap()
  return {
    disconnected: (store) => {
      mounted.get(store)?.destroy()
      mounted.delete(store)
    },
    kind,
    render: contentOf,
    rendered: (store, root) => {
      let mount = mounted.get(store)
      if (mount === undefined) {
        mount = mountStore(store, root)
        mounted.set(store, mount)
      }
      mount.rendered()
    },
    styles,
  }
}

export { ViewPlugin, contentOf, inOwnView, mountStore, ownElement, storeView, viewContent, viewPlugin }
