/**
 * A stick or trigger of the standard gamepad layout as an axis, summed over every pad connected: a stick from -1 to 1
 * with its drift around the middle taken out, a trigger's pull from 0 to 1.
 */
export type AxisValue = Readonly<{
    position: number;
    delta: number;
}>;
export type Pad = Readonly<{
    axes: readonly number[];
    buttons: readonly Readonly<{
        value: number;
    }>[];
}>;
/**
 * The axis
 * @param {Readonly<{ get: () => readonly Pad[] }>} pads - The pads connected
 * @param {string} axis - "lx", "ly", "rx", "ry", "lt" or "rt"
 * @returns {() => AxisValue} Its position now; a stick has no delta
 */
declare function padAxis(pads: Readonly<{
    get: () => readonly Pad[];
}>, axis: string): () => AxisValue;
export { padAxis };
