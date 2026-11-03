/**
 * How the overlay browser tests drive a page from outside it: putting fixtures in it, real presses and keys, and
 * reading back what shows and where focus is.
 * @import { Page } from 'playwright-core'
 * @import { Point } from './anchored.js'
 * @import { DomMode } from './css.js'
 * @import { Box, Showing } from './test-overlay-page.js'
 */

/**
 * A fixture to put in the page: its kind and id, its DOM mode, and where: at a point on the page, or inside another
 * fixture's overlay.
 * @typedef {Readonly<{ kind: 'popup' | 'modal', id: string, mode: DomMode, at?: Point, inside?: string }>} Where
 */

const HALF = 2

/**
 * Puts a fixture in a page.
 * @param {Page} page - The page
 * @param {Where} where - What and where
 * @returns {Promise<void>} When it is there
 */
async function put(page, where) {
  await page.evaluate(async (placed) => {
    const pages = await import('./test-overlay-page.js')
    pages.put(placed)
    await pages.settle()
  }, where)
}

/**
 * What a fixture shows, once renders and frames have passed.
 * @param {Page} page - The page
 * @param {string} id - The fixture's id
 * @returns {Promise<Showing>} What it shows
 */
async function look(page, id) {
  return page.evaluate(async (which) => {
    const pages = await import('./test-overlay-page.js')
    await pages.settle()
    return pages.showing(which)
  }, id)
}

/**
 * Which fixtures are open, in order.
 * @param {Page} page - The page
 * @param {readonly string[]} ids - The fixtures' ids
 * @returns {Promise<boolean[]>} Whether each is open
 */
async function openNow(page, ids) {
  return page.evaluate(async (which) => {
    const pages = await import('./test-overlay-page.js')
    await pages.settle()
    return which.map((id) => pages.showing(id).open)
  }, ids)
}

/**
 * Where focus is, by name.
 * @param {Page} page - The page
 * @returns {Promise<string>} The name
 */
async function focused(page) {
  return page.evaluate(async () => {
    const pages = await import('./test-overlay-page.js')
    await pages.settle()
    return pages.focusName()
  })
}

/**
 * Presses with the mouse at the middle of a box.
 * @param {Page} page - The page
 * @param {Box} box - Where
 * @returns {Promise<void>} When it has
 */
async function pressMiddle(page, box) {
  await page.mouse.click(box.x + box.width / HALF, box.y + box.height / HALF)
}

/**
 * Opens a fixture by pressing its button.
 * @param {Page} page - The page
 * @param {string} id - The fixture's id
 * @returns {Promise<Showing>} What it shows then
 */
async function open(page, id) {
  const before = await look(page, id)
  await pressMiddle(page, before.trigger)
  return look(page, id)
}

/**
 * Presses keys one after another, noting where focus is after each.
 * @param {Page} page - The page
 * @param {readonly string[]} keys - The keys, as playwright names them
 * @param {readonly string[]} [noted] - Where focus was after the keys pressed so far
 * @returns {Promise<readonly string[]>} Where focus was after each
 */
async function focusAfter(page, keys, noted = []) {
  const [key, ...rest] = keys
  if (key === undefined) {
    return noted
  }
  await page.keyboard.press(key)
  return focusAfter(page, rest, [...noted, await focused(page)])
}

/**
 * Tries to focus the button after the fixtures, from inside the page.
 * @param {Page} page - The page
 * @returns {Promise<boolean>} Whether it took focus
 */
async function tryFocusingOutside(page) {
  return page.evaluate(async () => {
    const pages = await import('./test-overlay-page.js')
    return pages.tryFocusingOutside()
  })
}

/**
 * The dismissals a fixture's layer has heard, by reason.
 * @param {Page} page - The page
 * @param {string} id - The fixture's id, whose dismissals to hear from now on
 * @returns {Promise<void>} When it is listening
 */
async function hearDismissals(page, id) {
  await page.evaluate(async (which) => {
    const pages = await import('./test-overlay-page.js')
    pages.hearDismissals(which)
  }, id)
}

/**
 * The dismissals heard so far.
 * @param {Page} page - The page
 * @returns {Promise<readonly string[]>} Their reasons, in order
 */
async function dismissals(page) {
  return page.evaluate(async () => {
    const pages = await import('./test-overlay-page.js')
    return pages.dismissals()
  })
}

/**
 * Opens or closes a fixture as the app would, setting its layer's open state.
 * @param {Page} page - The page
 * @param {string} id - The fixture's id
 * @param {boolean} opened - Whether it is open
 * @returns {Promise<void>} When it has rendered
 */
async function setOpen(page, id, opened) {
  /** @type {Readonly<{ id: string, opened: boolean }>} */
  const change = { id, opened }
  await page.evaluate(async (asked) => {
    const pages = await import('./test-overlay-page.js')
    pages.popupOf(asked.id).layer.open.set(asked.opened)
    await pages.settle()
  }, change)
}

/**
 * Tries to show a popover outside the page's open modal dialog.
 * @param {Page} page - The page
 * @returns {Promise<string>} Why it couldn't, or "shown"
 */
async function openOverModal(page) {
  return page.evaluate(async () => {
    const scenes = await import('./test-overlay-scenes.js')
    return scenes.openOverModal()
  })
}

/**
 * Takes a fixture out of the page and puts it back.
 * @param {Page} page - The page
 * @param {string} id - The fixture's id
 * @returns {Promise<Readonly<{ stackedWhileOut: number, openWhileOut: boolean, shownBack: boolean }>>} What happened
 */
async function detachAndReattach(page, id) {
  return page.evaluate(async (which) => {
    const scenes = await import('./test-overlay-scenes.js')
    return scenes.detachAndReattach(which)
  }, id)
}

/**
 * Adopts the server-rendered popup in the page, registering the fixtures; its id is "server".
 * @param {Page} page - The page
 * @returns {Promise<Readonly<{ same: boolean, moved: boolean, hiddenBefore: boolean, hiddenAfter: boolean }>>} What
 *   adopting left
 */
async function adoptServer(page) {
  return page.evaluate(async () => {
    const scenes = await import('./test-overlay-scenes.js')
    return scenes.adoptServer()
  })
}

export {
  adoptServer,
  detachAndReattach,
  dismissals,
  focusAfter,
  focused,
  hearDismissals,
  look,
  open,
  openNow,
  openOverModal,
  pressMiddle,
  put,
  setOpen,
  tryFocusingOutside,
}
