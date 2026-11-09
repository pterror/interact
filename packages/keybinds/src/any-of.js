/**
 * Several ways of finding a press's handlers as one: each one's handlers in turn, each handler once.
 */

/**
 * @template Q, H
 * @typedef {(query: Q) => readonly H[]} Find
 */

/**
 * Finds through several in order (exact bindings before loose ones)
 * @template Q, H
 * @param {readonly Find<Q, H>[]} finds - The ways of finding, best first
 * @returns {Find<Q, H>} Every one's handlers, in order, each once
 */
function anyOf(...finds) {
  return (query) => [...new Set(finds.flatMap((find) => find(query)))]
}

export { anyOf }
