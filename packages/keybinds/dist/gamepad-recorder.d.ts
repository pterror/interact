/**
 * Recording a gamepad binding from the next button pressed, or with `release` pressed and let go. Every pad is read
 * each frame; buttons already down when recording starts don't count until they've been let go.
 */
/** One recording of a gamepad binding */
declare class GamepadRecorder {
    #private;
    /**
     * Starts reading pads
     * @param {boolean} release - Whether to record a release
     * @param {(binding: string) => void} done - Gets the binding
     */
    constructor(release: boolean, done: (binding: string) => void);
    /** @returns {void} */
    stop(): void;
}
export { GamepadRecorder };
