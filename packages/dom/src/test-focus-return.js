/**
 * The page for the focus-return browser tests: a button that opened an overlay, the overlay with a button in it, and
 * another button.
 */

import { giveFocusBack } from './focus-return.js'

/**
 * What happened before the overlay hid: focus stayed inside it, something else took it, or the button that opened it
 * left the page.
 * @typedef {'stays inside' | 'taken elsewhere' | 'opener gone'} Before
 */

/**
 * Where no overlay's focus came from.
 * @returns {undefined} Nowhere
 */
function nowhere() {
  return undefined
}

/**
 * Focus goes to the overlay's button, then what happened before it hid happens.
 * @param {Before} before - What happened
 * @param {HTMLElement} opener - The button that opened it
 * @returns {void}
 */
function happenBefore(before, opener) {
  document.querySelector('#inside')?.closest('button')?.focus()
  if (before === 'taken elsewhere') {
    document.querySelector('#other')?.closest('button')?.focus()
  } else if (before === 'opener gone') {
    opener.remove()
  }
}

/**
 * Builds the page, does what happened before the overlay hid, gives focus back, and says where focus is.
 * @param {Before} before - What happened
 * @returns {Promise<string>} The id of the focused element
 */
async function focusBack(before) {
  document.body.innerHTML =
    '<button id="opener">Open</button><div id="overlay"><button id="inside">In</button></div><button id="other">Other</button>'
  const overlay = document.querySelector('#overlay')
  const opener = document.querySelector('#opener')
  if (!(overlay instanceof HTMLElement) || !(opener instanceof HTMLElement)) {
    throw new TypeError('The page is missing its parts')
  }
  happenBefore(before, opener)
  await giveFocusBack(overlay, opener, nowhere)
  return document.activeElement?.id ?? 'nowhere'
}

export { focusBack }
