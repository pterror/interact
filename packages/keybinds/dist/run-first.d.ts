/**
 * Running a handler for an event: the first of some that applies (its `when` holds, and it may run where the event
 * happened) and doesn't return false takes the event, whose default is then prevented and which goes no further.
 */
export type Handler = Readonly<{
    run: (event: Event) => boolean | void;
    when?: () => boolean;
    typing?: boolean;
}>;
/**
 * What runs for an event, when it applies, and whether it also runs while text is typed into a field
 * @typedef {Readonly<{ run: (event: Event) => boolean | void, when?: () => boolean, typing?: boolean }>} Handler
 */
/**
 * Whether a handler applies now
 * @param {Handler} handler - The handler
 * @param {boolean} typing - Whether the event happened where text is typed
 * @returns {boolean} Whether its `when` holds (or it has none) and it may run there
 */
declare function applies(handler: Handler, typing: boolean): boolean;
/**
 * Makes an event a handler's: its default is prevented and it goes no further
 * @param {Event} event - The event
 * @returns {void}
 */
declare function take(event: Event): void;
/**
 * Runs the first handler that applies and doesn't return false, which takes the event
 * @template {Handler} H
 * @param {readonly H[]} handlers - The handlers, best first
 * @param {Event} event - The event
 * @param {boolean} typing - Whether it happened where text is typed
 * @returns {H | undefined} The handler that took it, if any
 */
declare function runFirst<H extends Handler>(handlers: readonly H[], event: Event, typing: boolean): H | undefined;
export { applies, runFirst, take };
