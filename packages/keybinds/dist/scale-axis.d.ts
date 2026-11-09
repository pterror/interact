/**
 * An axis scaled: its position and delta times a factor; -1 inverts it ("-mouse:y").
 */
export type AxisValue = Readonly<{
    position: number;
    delta: number;
}>;
/**
 * @typedef {Readonly<{ position: number, delta: number }>} AxisValue
 */
/**
 * The axis scaled
 * @param {() => AxisValue} value - The axis
 * @param {number} factor - The factor
 * @returns {() => AxisValue} It, times the factor
 */
declare function scaleAxis(value: () => AxisValue, factor: number): () => AxisValue;
export { scaleAxis };
