/**
 * Giving focus back: closing the settings panel returns focus to where it was (the text being edited,
 * say), before the chosen command runs; the command can still move it elsewhere.
 */
/** Where focus was outside the overlays, and putting it back when one closes */
declare class FocusReturn {
    #private;
    /**
     * Starts following focus, and the overlays closing
     * @param {readonly HTMLElement[]} overlays - The settings panel, if there is one
     */
    constructor(overlays: readonly HTMLElement[]);
    /**
     * Notes where focus went, or gives it back when an overlay closes
     * @param {Event} event - A focusin, or an overlay's close
     * @returns {void}
     */
    handleEvent(event: Event): void;
    /**
     * Stops following focus
     * @returns {void}
     */
    stop(): void;
}
export { FocusReturn };
