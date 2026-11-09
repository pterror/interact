/**
 * Several axes as one: their positions added and kept from -1 to 1, their deltas added.
 */
export type AxisValue = Readonly<{
    position: number;
    delta: number;
}>;
/**
 * @typedef {Readonly<{ position: number, delta: number }>} AxisValue
 */
/**
 * The axes as one
 * @param {readonly (() => AxisValue)[]} values - The axes
 * @returns {() => AxisValue} Their sum now
 */
declare function sumAxis(values: readonly (() => AxisValue)[]): () => AxisValue;
export { sumAxis };
