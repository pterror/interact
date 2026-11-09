/**
 * Several ways of finding a press's handlers as one: each one's handlers in turn, each handler once.
 */
export type Find<Q, H> = (query: Q) => readonly H[];
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
declare function anyOf<Q, H>(...finds: readonly Find<Q, H>[]): Find<Q, H>;
export { anyOf };
