/**
 * Asking before a binding takes another id's: a binding offered for a slot goes in, unless another id has the same
 * binding in that field, which waits as the question until it is accepted (the other id's goes, this one goes in) or
 * cancelled. One question at a time; a new offer replaces it.
 */

import { findConflict } from './find-conflict.js'

/** @typedef {'axes' | 'keys' | 'mouse' | 'pad'} Field */

/**
 * @typedef {Readonly<{ keys?: readonly string[], mouse?: readonly string[], pad?: readonly string[],
 *   axes?: readonly string[] }>} Fields
 */

/** @typedef {Readonly<{ id: string, field: Field, index?: number | undefined }>} Slot */

/**
 * The question: the slot and binding offered, and the id that has it
 * @typedef {Readonly<{ slot: Slot, binding: string, taken: string }>} Question
 */

/**
 * @typedef {Readonly<{
 *   bindings: Readonly<{ get: () => Readonly<Record<string, Fields>> }>,
 *   lookupOf: (field: Field) => (binding: string) => string,
 *   put: (slot: Slot, binding: string) => void,
 *   replace: (slot: Slot, binding: string, from: string, same: (binding: string) => boolean) => void,
 * }>} ConflictQuestionOptions
 */

/**
 * Whether two bindings are the same through a normal form; one that doesn't parse is the same as nothing
 * @param {(binding: string) => string} lookup - The normal form
 * @param {string} binding - One binding
 * @returns {(other: string) => boolean} Whether another is the same
 */
function sameAs(lookup, binding) {
  const wanted = lookup(binding)
  return (other) => {
    try {
      return lookup(other) === wanted
    } catch {
      return false
    }
  }
}

/**
 * The question, as state
 * @param {ConflictQuestionOptions} options - The bindings in effect; a field's normal form (its input's lookup);
 *   putting a binding in a slot; and putting one in a slot in place of another id's same ones (rebind()'s)
 * @returns {Readonly<{ get: () => Question | undefined, watch: (listener: () => void) => () => void,
 *   offer: (slot: Slot, binding: string) => void, accept: () => void, cancel: () => void }>} The question asked now;
 *   hearing it change; offering a binding; and answering
 */
function conflictQuestion({ bindings, lookupOf, put, replace }) {
  /** @type {Question | undefined} */
  let question = undefined
  /** @type {Set<() => void>} */
  const listeners = new Set()
  /**
   * @param {Question | undefined} next - The question from now
   * @returns {void}
   */
  const ask = (next) => {
    if (next !== question) {
      question = next
      for (const listener of listeners) {
        listener()
      }
    }
  }
  return {
    accept() {
      const asked = question
      ask(undefined)
      if (asked !== undefined) {
        const { binding, slot, taken } = asked
        replace(slot, binding, taken, sameAs(lookupOf(slot.field), binding))
      }
    },
    cancel() {
      ask(undefined)
    },
    get: () => question,
    offer(slot, binding) {
      const taken = findConflict(bindings.get(), {
        binding,
        except: slot.id,
        field: slot.field,
        lookup: lookupOf(slot.field),
      })
      ask(taken === undefined ? undefined : { binding, slot, taken })
      if (taken === undefined) {
        put(slot, binding)
      }
    },
    watch(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export { conflictQuestion }
