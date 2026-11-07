/**
 * Commands with `anyModifiers: true`: their bindings match whatever other modifiers are held, as a game's movement
 * keys should. A binding's own modifiers are still required, and a command bound exactly to what was pressed comes
 * first.
 */

/**
 * @import { ParsedBinding } from './binding.js'
 * @import { Modifiers } from './binding-mods.js'
 * @import { Command } from './command.js'
 */

import { holdsAll } from './binding-mods.js'

/**
 * One input's `anyModifiers` commands: `add` one binding, `find` the ones matching loose lookups with the modifiers
 * held (after the exact `found`), and `size`
 * @typedef {Readonly<{
 *   add: (parsed: ParsedBinding, command: Command) => void,
 *   find: (loose: readonly string[], mods: Modifiers, found: readonly Command[] | undefined) =>
 *     readonly Command[] | undefined,
 *   size: () => number,
 * }>} LooseTable
 */

/**
 * Finds `anyModifiers` commands: what anyModifiers() gives keybinds(), one table per input
 * @typedef {Readonly<{ table: () => LooseTable }>} AnyModifiers
 */

/**
 * A binding found by its lookup without modifiers, with the modifiers it still needs
 * @typedef {Readonly<{ command: Command, mods: Modifiers }>} Loose
 */

/** One input's `anyModifiers` bindings, by their lookups without modifiers */
class LooseBindings {
  /**
   * @readonly
   * @type {Map<string, Loose[]>}
   */
  #byLookup = new Map()

  /**
   * Adds one binding
   * @param {ParsedBinding} parsed - The binding
   * @param {Command} command - Whose it is
   * @returns {void}
   */
  add(parsed, command) {
    const list = this.#byLookup.get(parsed.loose)
    if (list === undefined) {
      this.#byLookup.set(parsed.loose, [{ command, mods: parsed.mods }])
    } else {
      list.push({ command, mods: parsed.mods })
    }
  }

  /**
   * The commands bound to the first loose lookup that has any, whose own modifiers are held
   * @param {readonly string[]} loose - An event's lookups without modifiers, best first
   * @param {Modifiers} mods - The modifiers held
   * @param {readonly Command[] | undefined} found - What exact bindings found, which come first
   * @returns {readonly Command[] | undefined} Those, then the ones found here
   */
  find(loose, mods, found) {
    const bound = this.#bound(loose)
    const exact = found ?? []
    const extra = bound
      .filter((each) => holdsAll(each.mods, mods) && !exact.includes(each.command))
      .map((each) => each.command)
    return extra.length === 0 ? found : [...exact, ...extra]
  }

  /**
   * The bindings of the first loose lookup that has any
   * @param {readonly string[]} loose - An event's lookups without modifiers, best first
   * @returns {readonly Loose[]} Its bindings, or none
   */
  #bound(loose) {
    for (const lookup of loose) {
      const list = this.#byLookup.get(lookup)
      if (list !== undefined) {
        return list
      }
    }
    return []
  }

  /** @returns {number} How many loose lookups have bindings */
  size() {
    return this.#byLookup.size
  }
}

/**
 * For keybinds({ anyModifiers: anyModifiers() })
 * @returns {AnyModifiers} What keybinds() finds `anyModifiers` commands with
 */
function anyModifiers() {
  return { table: () => new LooseBindings() }
}

export { anyModifiers }
