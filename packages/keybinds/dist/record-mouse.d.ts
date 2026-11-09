/**
 * Recording a mouse binding from the next click or scroll, or with `release` a button pressed and let go
 * ("middle:up", bound with the modifiers held as it went down). Scrolling has no release.
 */
export type RecordMouseOptions = Readonly<{
    done: (binding: string) => void;
    target?: EventTarget;
    release?: boolean;
    ignore?: (event: Event) => boolean;
}>;
/**
 * @typedef {Readonly<{
 *   done: (binding: string) => void,
 *   target?: EventTarget,
 *   release?: boolean,
 *   ignore?: (event: Event) => boolean,
 * }>} RecordMouseOptions
 */
/**
 * A mouse or wheel event as a binding ("$mod+click", "scrollup")
 * @param {MouseEvent} event - The mousedown or wheel event
 * @returns {string | undefined} The binding, without a suffix; nothing for a button no binding names, or a wheel
 *   event that doesn't scroll
 */
declare function mouseBinding(event: MouseEvent): string | undefined;
/**
 * Records a mouse binding from the next click or scroll
 * @param {RecordMouseOptions} options - What gets the binding; where to listen (default the window); whether to
 *   record a release; and which events to leave alone (the recording's own controls)
 * @returns {() => void} Stopping
 */
declare function recordMouse({ done, ignore, release, target }: RecordMouseOptions): () => void;
export { mouseBinding, recordMouse };
