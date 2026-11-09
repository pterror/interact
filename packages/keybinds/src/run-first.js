/**
 * Running a handler for an event: the first of some that applies (its `when` holds, and it may run where the event
 * happened) and doesn't return false takes the event, whose default is then prevented and which goes no further.
 */

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
function applies(handler, typing) {
  return (!typing || handler.typing === true) && (handler.when?.() ?? true)
}

/**
 * Makes an event a handler's: its default is prevented and it goes no further
 * @param {Event} event - The event
 * @returns {void}
 */
function take(event) {
  event.preventDefault()
  event.stopPropagation()
}

/**
 * Runs the first handler that applies and doesn't return false, which takes the event
 * @template {Handler} H
 * @param {readonly H[]} handlers - The handlers, best first
 * @param {Event} event - The event
 * @param {boolean} typing - Whether it happened where text is typed
 * @returns {H | undefined} The handler that took it, if any
 */
function runFirst(handlers, event, typing) {
  for (const handler of handlers) {
    if (applies(handler, typing) && handler.run(event) !== false) {
      take(event)
      return handler
    }
  }
  return undefined
}

export { applies, runFirst, take }
