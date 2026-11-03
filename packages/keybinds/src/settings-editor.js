/**
 * The settings panel's edits to its store, each saved and announced: a binding put in its slot, one taken away, a
 * taken binding moved from another command, and resets.
 */

/**
 * @import { InputUI } from './input.js'
 * @import { Lists } from './settings-edit.js'
 * @import { Slot } from './settings-record.js'
 * @import { AnyBindingsStore } from './store.js'
 */

import { listsOf, resetOne, saveLists, withBinding, withoutBinding, withoutSame } from './settings-edit.js'

/**
 * What an editor works on, read when it edits: the store (if there is one), the inputs shown, and where its events go
 * @typedef {Readonly<{ dispatch: (event: Event) => void, inputs: () => readonly InputUI[], store: () => AnyBindingsStore |
 *   undefined }>} EditorHooks
 */

/** A settings panel's edits */
class BindingEditor {
  /**
   * @readonly
   * @type {EditorHooks}
   */
  #hooks

  /**
   * Edits for a panel
   * @param {EditorHooks} hooks - What it works on
   */
  constructor(hooks) {
    this.#hooks = hooks
  }

  /**
   * Puts a binding in its slot
   * @param {Slot} slot - Which binding
   * @param {string} binding - The binding
   * @returns {void}
   */
  apply(slot, binding) {
    const lists = this.#lists(slot.id)
    if (lists !== undefined) {
      this.#save(slot.id, withBinding(lists, { binding, field: slot.input.field, index: slot.index }))
    }
  }

  /**
   * Takes a binding from another command, and puts it in a slot
   * @param {string} from - The other command
   * @param {Slot} slot - Which binding it goes to
   * @param {string} binding - The binding
   * @returns {void}
   */
  move(from, slot, binding) {
    const lists = this.#lists(from)
    if (lists !== undefined) {
      this.#save(from, withoutSame(lists, slot.input, binding))
    }
    this.apply(slot, binding)
  }

  /**
   * Takes a binding away
   * @param {Slot} slot - Which binding
   * @returns {void}
   */
  remove({ id, index, input }) {
    const lists = this.#lists(id)
    if (lists !== undefined && index !== undefined) {
      this.#save(id, withoutBinding(lists, input.field, index))
    }
  }

  /**
   * Resets one command to its defaults
   * @param {string} id - The command
   * @returns {void}
   */
  reset(id) {
    const store = this.#hooks.store()
    if (store !== undefined) {
      resetOne(store, id)
      this.#hooks.dispatch(new CustomEvent('reset', { detail: { commandId: id } }))
    }
  }

  /**
   * Resets every command to its defaults
   * @returns {void}
   */
  resetAll() {
    const store = this.#hooks.store()
    if (store !== undefined) {
      store.save({})
      this.#hooks.dispatch(new CustomEvent('reset', { detail: {} }))
    }
  }

  /**
   * A command's bindings in the fields shown, if there's a store
   * @param {string} id - The command
   * @returns {Lists | undefined} Its bindings
   */
  #lists(id) {
    const store = this.#hooks.store()
    return store === undefined ? undefined : listsOf(store, id, this.#hooks.inputs())
  }

  /**
   * Saves a command's bindings, and says so
   * @param {string} id - The command
   * @param {Lists} lists - Its bindings
   * @returns {void}
   */
  #save(id, lists) {
    const store = this.#hooks.store()
    if (store !== undefined) {
      saveLists(store, id, lists)
      this.#hooks.dispatch(new CustomEvent('change', { detail: { bindings: lists, commandId: id } }))
    }
  }
}

export { BindingEditor }
