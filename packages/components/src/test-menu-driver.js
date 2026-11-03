/**
 * How the menu's browser tests drive a page from outside it: putting a menu in it, real keys and pointer moves, and
 * reading back what shows.
 * @import { Page } from 'playwright-core'
 * @import { Box, MenuSeen } from './test-page-menu.js'
 */

const HALF = 2
const EDGE = 5
const REST = 400
const STEPS = 12
const FIRST = 0
const SECOND = 1
const ONE = 1
const NOWHERE = { height: Number.NaN, width: Number.NaN, x: Number.NaN, y: Number.NaN }

/**
 * What the page's menu shows.
 * @param {Page} page - The page
 * @returns {Promise<MenuSeen>} What it shows
 */
async function look(page) {
  return page.evaluate(async () => {
    const pages = await import('./test-page-menu.js')
    return pages.seen()
  })
}

/**
 * Presses keys in turn.
 * @param {Page} page - The page
 * @param {readonly string[]} pressed - The keys
 * @returns {Promise<void>} When they have been pressed
 */
async function keys(page, pressed) {
  const [key, ...rest] = pressed
  if (key !== undefined) {
    await page.keyboard.press(key)
    await keys(page, rest)
  }
}

/**
 * The box of a row.
 * @param {Page} page - The page
 * @param {string} id - The row's id
 * @returns {Promise<Box>} Its box
 */
async function rowBox(page, id) {
  return page.evaluate(async (row) => {
    const pages = await import('./test-page-menu.js')
    return pages.rowBox(row)
  }, id)
}

/**
 * The middle of a box.
 * @param {Box} box - The box
 * @returns {Readonly<{ x: number, y: number }>} Its middle
 */
function middle(box) {
  return { x: box.x + box.width / HALF, y: box.y + box.height / HALF }
}

/**
 * An overlay's box, or one of nowhere if there is no such overlay.
 * @param {MenuSeen} seen - What showed
 * @param {number} which - Which overlay: the menu's, then each submenu's
 * @returns {Box} Its box
 */
function boxAt(seen, which) {
  return seen.boxes.at(which) ?? NOWHERE
}

/**
 * Whether the submenu sits beside the menu, toward the inline end.
 * @param {MenuSeen} seen - What showed
 * @returns {boolean} Whether it does
 */
function besideMenu(seen) {
  const menu = boxAt(seen, FIRST)
  return boxAt(seen, SECOND).x >= menu.x + menu.width - ONE
}

/**
 * Opens the menu with a press on its button, and rests the pointer on the Share entry until its submenu opens.
 * @param {Page} page - The page
 * @returns {Promise<MenuSeen>} What shows then
 */
async function restOnShare(page) {
  const box = await page.evaluate(async () => {
    const pages = await import('./test-page-menu.js')
    return pages.buttonBox()
  })
  const pressed = middle(box)
  await page.mouse.click(pressed.x, pressed.y)
  const share = middle(await rowBox(page, 'edit-5'))
  await page.mouse.move(share.x, share.y)
  await page.waitForTimeout(REST)
  return look(page)
}

/**
 * Rests on Share, then moves the pointer from the end of its row diagonally down to the submenu's lower corner,
 * across the entries below it, and clicks Copy link.
 * @param {Page} page - The page
 * @returns {Promise<readonly MenuSeen[]>} What showed after resting, after crossing, and after the click
 */
async function crossToSubmenu(page) {
  const rested = await restOnShare(page)
  const submenu = boxAt(rested, SECOND)
  const share = await rowBox(page, 'edit-5')
  await page.mouse.move(share.x + share.width - EDGE, share.y + share.height / HALF)
  await page.mouse.move(submenu.x + EDGE + EDGE, submenu.y + submenu.height - EDGE, { steps: STEPS })
  const crossed = await look(page)
  const link = middle(await rowBox(page, 'edit-5-1'))
  await page.mouse.click(link.x, link.y)
  return [rested, crossed, await look(page)]
}

/**
 * Rests on Share, then moves the pointer from the start of its row straight down to Large, away from the submenu.
 * @param {Page} page - The page
 * @returns {Promise<MenuSeen>} What shows then
 */
async function strayFromSubmenu(page) {
  await restOnShare(page)
  const share = await rowBox(page, 'edit-5')
  await page.mouse.move(share.x + EDGE, share.y + share.height / HALF)
  const large = middle(await rowBox(page, 'edit-8'))
  await page.mouse.move(share.x + EDGE, large.y, { steps: STEPS })
  return look(page)
}

export { besideMenu, boxAt, crossToSubmenu, keys, look, strayFromSubmenu }
