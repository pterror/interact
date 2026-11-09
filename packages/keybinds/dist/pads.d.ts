/**
 * The gamepads connected, as they read each frame. Gamepads have no events for their buttons or sticks, so one loop
 * reads them every animation frame, but only while a pad is connected and something watches.
 */
export type Pad = Readonly<{
    index: number;
    axes: readonly number[];
    buttons: readonly Readonly<{
        pressed: boolean;
        value: number;
    }>[];
}>;
/**
 * The pads, read every frame while watched
 * @param {EventTarget} [view] - The window whose pads connect (default the global one)
 * @returns {Readonly<{ get: () => readonly Pad[], watch: (listener: () => void) => () => void }>} The pads now; and
 *   hearing each frame's reading
 */
declare function pads(view?: EventTarget): Readonly<{
    get: () => readonly Pad[];
    watch: (listener: () => void) => () => void;
}>;
export { pads };
