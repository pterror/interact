/**
 * An axis that reads zero while it doesn't apply: while its binding's `when` is false, or while an overlay holds focus.
 * It is still read then, so movement made meanwhile isn't kept for later.
 */
export type AxisValue = Readonly<{
    position: number;
    delta: number;
}>;
/**
 * The axis, while it applies
 * @param {() => AxisValue} value - The axis
 * @param {() => boolean} when - Whether it applies now
 * @returns {() => AxisValue} It, or zero
 */
declare function axisWhen(value: () => AxisValue, when: () => boolean): () => AxisValue;
export { axisWhen };
