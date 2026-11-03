/**
 * Recording a mouse binding from what's done next: a click or a scroll, or with `release` a button's press and its
 * release. Scrolling has no release.
 */
import type { RecordOptions } from './keys-recorder.js';
export type RecordTo = Readonly<{
    done: (binding: string) => void;
    toBinding: (event: MouseEvent) => string | undefined;
}>;
/** One recording of a mouse binding */
declare class MouseRecorder {
    #private;
    /**
     * Starts listening for the next click or scroll
     * @param {RecordOptions} options - How recording goes
     * @param {RecordTo} to - What gets the binding, and how an event is written
     */
    constructor(options: RecordOptions, to: RecordTo);
    /**
     * Hears the mouse
     * @param {Event} event - A mousedown, mouseup or wheel
     * @returns {void}
     */
    handleEvent(event: Event): void;
    /** @returns {void} */
    stop(): void;
}
export { MouseRecorder };
