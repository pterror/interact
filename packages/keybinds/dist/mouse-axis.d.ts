/**
 * Mouse movement along one direction as an axis: each read gives how far the mouse moved since the last read, in px.
 */
export type AxisValue = Readonly<{
    position: number;
    delta: number;
}>;
/**
 * @typedef {Readonly<{ position: number, delta: number }>} AxisValue
 */
/**
 * Listens to the mouse moving
 * @param {Readonly<{ target: EventTarget, axis: 'x' | 'y', capture?: boolean }>} options - Where to listen; which
 *   direction; and whether in the capture phase
 * @returns {Readonly<{ read: () => AxisValue, stop: () => void }>} Reading the movement since the last read (its
 *   delta; it has no position), and stopping
 */
declare function mouseAxis({ axis, capture, target }: Readonly<{
    target: EventTarget;
    axis: 'x' | 'y';
    capture?: boolean;
}>): Readonly<{
    read: () => AxisValue;
    stop: () => void;
}>;
export { mouseAxis };
