/**
 * Recording a binding in the settings panel: which binding is being recorded, what's captured (a press, or a release,
 * hold or tap), whether it takes several steps and the steps so far, and Escape to stop.
 */
import type { InputUI } from './input.js';
export type Slot = Readonly<{
    id: string;
    index: number | undefined;
    input: InputUI;
}>;
export type RecordingState = Readonly<{
    sequence: boolean;
    slot: Slot | undefined;
    steps: readonly string[];
    suffix: string;
}>;
export type RecordingHooks = Readonly<{
    changed: () => void;
    done: (binding: string) => void;
    ignore: (event: Event) => boolean;
    pause: () => number;
}>;
/**
 * Which binding: a command's, through an input, and which of its bindings (undefined for a new one)
 * @typedef {Readonly<{ id: string, index: number | undefined, input: InputUI }>} Slot
 */
/**
 * Recording as it is now: the binding being recorded, what's captured (a press "", or ":up", ":hold", ":tap"), whether
 * it takes several steps, and the steps so far
 * @typedef {Readonly<{ sequence: boolean, slot: Slot | undefined, steps: readonly string[], suffix: string }>}
 *   RecordingState
 */
/**
 * What recording tells the panel and asks of it: a binding was recorded, its state changed, which events not to
 * record, and how long a sequence waits after a step
 * @typedef {Readonly<{ changed: () => void, done: (binding: string) => void, ignore: (event: Event) => boolean, pause:
 *   () => number }>} RecordingHooks
 */
/** Recording one binding at a time */
declare class Recording {
    #private;
    /**
     * Records for a panel
     * @param {RecordingHooks} hooks - What it tells the panel and asks of it
     */
    constructor(hooks: RecordingHooks);
    /** @returns {RecordingState} Recording as it is now */
    get state(): RecordingState;
    /**
     * Starts recording a binding from what's done next in a window, until it's recorded, Escape, or stop()
     * @param {Slot} slot - Which binding
     * @param {Window} window - Where to listen
     * @returns {void}
     */
    start(slot: Slot, window: Window): void;
    /**
     * Marks a binding as the one being changed, without recording: a switch to it waiting on a conflict
     * @param {Slot} slot - Which binding
     * @returns {void}
     */
    hold(slot: Slot): void;
    /**
     * Stops recording, and forgets what it was recording
     * @returns {void}
     */
    stop(): void;
    /**
     * Switches what's captured; choosing what's already chosen goes back to a press
     * @param {string} suffix - ":up", ":hold" or ":tap"
     * @returns {void}
     */
    capture(suffix: string): void;
    /**
     * Switches between one step and several
     * @returns {void}
     */
    toggleSteps(): void;
    /**
     * Takes the steps recorded so far as the binding
     * @returns {void}
     */
    finish(): void;
    /**
     * Stops recording on Escape, which isn't recorded
     * @param {Event} event - A key going down in the window
     * @returns {void}
     */
    handleEvent(event: Event): void;
}
export { Recording };
