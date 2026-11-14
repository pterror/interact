/**
 * Stepping that wraps: a step that stays where it is because it is at the list's edge goes to the other edge instead.
 */
/**
 * A Step that wraps from one end of the list to the other
 * @template K
 * @param {(from: K | undefined, by: number) => Promise<K | undefined>} step - The Step it wraps, which stops at the
 *   ends
 * @returns {(from: K | undefined, by: number) => Promise<K | undefined>} The Step: as `step`, except that from a key
 *   at the edge it is going towards it goes to the other edge (the first key going on, the last going back)
 */
declare function wrapStep<K>(step: (from: K | undefined, by: number) => Promise<K | undefined>): (from: K | undefined, by: number) => Promise<K | undefined>;
export { wrapStep };
