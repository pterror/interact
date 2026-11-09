/**
 * A pair of keys as an axis: the first held pushes toward -1, the second toward 1, both or neither rest at 0. It reads
 * the keys keyListen() holds, by their lookups without modifiers, so it follows the layout as bindings do.
 */
export type AxisValue = Readonly<{
    position: number;
    delta: number;
}>;
/**
 * @typedef {Readonly<{ position: number, delta: number }>} AxisValue
 */
/**
 * The axis
 * @param {Readonly<{ has: (lookup: string) => boolean }>} held - The keys held, by lookup without modifiers
 * @param {string} negative - The key toward -1: "a"
 * @param {string} positive - The key toward 1: "d"
 * @returns {() => AxisValue} Its position now; a key pair has no delta
 */
declare function keyPairAxis(held: Readonly<{
    has: (lookup: string) => boolean;
}>, negative: string, positive: string): () => AxisValue;
export { keyPairAxis };
