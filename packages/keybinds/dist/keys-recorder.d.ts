/**
 * Recording a key binding from what's pressed next: a press, or with `release` the press and its release.
 */
export type RecordOptions = Readonly<{
    ignore: (event: Event) => boolean;
    release: boolean;
    target?: Window;
}>;
export type RecordTo = Readonly<{
    done: (binding: string) => void;
    toBinding: (event: KeyboardEvent) => string | undefined;
}>;
/**
 * How recording goes: whether it records a release, what events to leave alone, and where to listen (the window
 * recording happens in; default the global one)
 * @typedef {Readonly<{ ignore: (event: Event) => boolean, release: boolean, target?: Window }>} RecordOptions
 */
/**
 * What a recording gives its binding to, and how a key event is written as one (undefined if it can't be)
 * @typedef {Readonly<{ done: (binding: string) => void, toBinding: (event: KeyboardEvent) => string | undefined }>}
 *   RecordTo
 */
/** One recording of a key binding */
declare class KeyRecorder {
    #private;
    /**
     * Starts listening for the next key
     * @param {RecordOptions} options - How recording goes
     * @param {RecordTo} to - What gets the binding, and its syntax
     */
    constructor(options: RecordOptions, to: RecordTo);
    /**
     * Hears the keyboard
     * @param {Event} event - A keydown or keyup
     * @returns {void}
     */
    handleEvent(event: Event): void;
    /** @returns {void} */
    stop(): void;
}
export { KeyRecorder };
