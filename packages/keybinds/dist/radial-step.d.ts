/**
 * Moving through a radial menu's slots, which are filled from the top on clockwise: round the filled slots, as a Step
 * (Tab and Shift+Tab), and toward a direction (an arrow), to the filled slot nearest it.
 */
/**
 * Steps over the slots
 * @template K
 * @param {() => readonly K[]} keys - The slots' keys now, from the top on clockwise
 * @returns {Readonly<{ step: (from: K | undefined, by: number) => Promise<K | undefined>,
 *   toward: (slot: number) => K | undefined }>} The Step: `step(none, 1)` is the first slot, `step(none, -1)` the
 *   last, `step(k, n)` the slot `n` on round from `k`; and the filled slot nearest a slot (0 is the top, 2 the right,
 *   4 the bottom, 6 the left), clockwise first at each distance
 */
declare function radialStep<K>(keys: () => readonly K[]): Readonly<{
    step: (from: K | undefined, by: number) => Promise<K | undefined>;
    toward: (slot: number) => K | undefined;
}>;
export { radialStep };
