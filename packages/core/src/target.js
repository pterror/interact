/** @import { Target } from './compose.js' */

/**
 * A stable internal identity for a structured part, independent of any renderer's naming.
 * @param {Target} target - The part
 * @returns {string} Its identity, keeping paths and opaque string/number keys distinct
 */
function identity(target) {
  return JSON.stringify([target.owner, target.part, target.item])
}

export { identity }
