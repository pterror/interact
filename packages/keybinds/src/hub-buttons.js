/**
 * Command buttons: every element with `data-command="<id>"` under a root runs that command when clicked, and is
 * disabled while the command doesn't apply.
 */

const SELECTOR = '[data-command]'

/**
 * What buttons need from the hub: whether a command applies now, and running it
 * @typedef {Readonly<{ applies: (id: string) => boolean, run: (id: string, event?: Event) => boolean }>} ButtonCommands
 */

/** The command buttons under every root a hub keeps in step */
class CommandButtons {
  /**
   * @readonly
   * @type {ButtonCommands}
   */
  #commands
  /**
   * @readonly
   * @type {Set<Element>}
   */
  #roots = new Set()

  /**
   * Buttons under no root yet
   * @param {ButtonCommands} commands - Whether each command applies, and running it
   */
  constructor(commands) {
    this.#commands = commands
  }

  /**
   * Starts running the commands of the buttons under a root, and shows which apply
   * @param {Element} root - Where the buttons are
   * @returns {() => void} A function that stops
   */
  bind(root) {
    root.addEventListener('click', this)
    this.#roots.add(root)
    this.#paint(root)
    return () => {
      root.removeEventListener('click', this)
      this.#roots.delete(root)
    }
  }

  /**
   * Runs the command of a button clicked
   * @param {Event} event - A click under a root
   * @returns {void}
   */
  handleEvent(event) {
    const { currentTarget, target } = event
    const button = target instanceof Element ? target.closest(SELECTOR) : undefined
    if (!(button instanceof HTMLElement) || !(currentTarget instanceof Element) || !currentTarget.contains(button)) {
      return
    }
    const id = button.dataset['command']
    if (id !== undefined && id !== '' && this.#commands.run(id, event)) {
      event.preventDefault()
    }
  }

  /**
   * Disables each button whose command doesn't apply now, and enables the rest, under every root
   * @returns {void}
   */
  paint() {
    for (const root of this.#roots) {
      this.#paint(root)
    }
  }

  /**
   * Stops every root's buttons
   * @returns {void}
   */
  stop() {
    for (const root of this.#roots) {
      root.removeEventListener('click', this)
    }
    this.#roots.clear()
  }

  /**
   * @param {Element} root - Where the buttons are
   * @returns {void}
   */
  #paint(root) {
    for (const button of root.querySelectorAll(SELECTOR)) {
      if (button instanceof HTMLElement) {
        const off = !this.#commands.applies(button.dataset['command'] ?? '')
        if ('disabled' in button) {
          button.disabled = off
        } else {
          button.toggleAttribute('aria-disabled', off)
        }
      }
    }
  }
}

export { CommandButtons }
