/**
 * Recording a gamepad binding from the next button pressed, or with `release` pressed and let go ("a:up"). Buttons
 * already down when recording starts don't count until let go. It reads the pads given, the loop that reads them
 * for listening too.
 */
export type Pad = Readonly<{
    index: number;
    buttons: readonly Readonly<{
        pressed: boolean;
    }>[];
}>;
export type RecordPadOptions = Readonly<{
    pads: Readonly<{
        get: () => readonly Pad[];
        watch: (listener: () => void) => () => void;
    }>;
    done: (binding: string) => void;
    release?: boolean;
}>;
/**
 * @typedef {Readonly<{ index: number, buttons: readonly Readonly<{ pressed: boolean }>[] }>} Pad
 */
/**
 * @typedef {Readonly<{
 *   pads: Readonly<{ get: () => readonly Pad[], watch: (listener: () => void) => () => void }>,
 *   done: (binding: string) => void,
 *   release?: boolean,
 * }>} RecordPadOptions
 */
/**
 * Records a gamepad binding from the next button pressed
 * @param {RecordPadOptions} options - The pads; what gets the binding; and whether to record a release
 * @returns {() => void} Stopping
 */
declare function recordPad({ done, pads, release }: RecordPadOptions): () => void;
export { recordPad };
