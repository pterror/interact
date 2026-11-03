/**
 * Command buttons: every element with `data-command="<id>"` under a root runs that command through a bridge when
 * pressed, and is disabled while the command can't run, following the bridge as its list changes.
 * @import { CommandBridge } from './command-bridge.js'
 */

const SELECTOR = '[data-command]'

/**
 * Disables each command button under a root whose command can't run now, and enables the rest.
 * @template C
 * @param {Element} root - Where the buttons are
 * @param {CommandBridge<C>} bridge - The bridge
 * @param {C} context - The context the buttons' commands are listed in
 * @returns {void}
 */
function paint(root, bridge, context) {
  const enabled = new Map(bridge.list(context).map((command) => [command.id, command.enabled]))
  for (const button of root.querySelectorAll(SELECTOR)) {
    if (button instanceof HTMLElement) {
      const off = enabled.get(button.dataset['command'] ?? '') !== true
      if (button instanceof HTMLButtonElement) {
        button.disabled = off
      } else {
        button.toggleAttribute('aria-disabled', off)
      }
    }
  }
}

/**
 * The command of the button an event happened on, under a root.
 * @param {Event} event - The event
 * @returns {string | undefined} The command's id
 */
function commandOf(event) {
  const { currentTarget, target } = event
  const button = target instanceof Element ? target.closest(SELECTOR) : undefined
  if (!(button instanceof HTMLElement) || !(currentTarget instanceof Element) || !currentTarget.contains(button)) {
    return undefined
  }
  const id = button.dataset['command']
  return id === '' ? undefined : id
}

/**
 * Makes the command buttons under a root run their commands through a bridge, and be disabled while a command can't
 * run: painted now, and again whenever the bridge says the list may have changed.
 * @template C
 * @param {Element} root - Where the buttons are
 * @param {CommandBridge<C>} bridge - The bridge
 * @param {() => C} context - The context the buttons' commands are listed and run in, as it is when asked
 * @returns {() => void} Stops
 */
function bindCommandButtons(root, bridge, context) {
  /**
   * @param {Event} event - A press under the root
   * @returns {void}
   */
  function pressed(event) {
    const id = commandOf(event)
    if (id !== undefined && bridge.run(id, context())) {
      event.preventDefault()
    }
  }
  root.addEventListener('click', pressed)
  paint(root, bridge, context())
  const stop = bridge.subscribe(() => {
    paint(root, bridge, context())
  })
  return () => {
    root.removeEventListener('click', pressed)
    stop()
  }
}

export { bindCommandButtons }
