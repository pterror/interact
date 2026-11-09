/**
 * A binding string's parts: its steps ("g i" is two) and the suffix that names its phase (":up", ":hold", ":tap"),
 * whatever syntax is on.
 */

/** @typedef {'' | ':hold' | ':tap' | ':up'} Suffix */

/** @type {readonly Suffix[]} */
const SUFFIXES = [':hold', ':tap', ':up']

/**
 * Splits a binding
 * @param {string} binding - The binding: "ctrl + k:HOLD", "g  i"
 * @returns {Readonly<{ steps: readonly string[], suffix: Suffix }>} Its steps, in order, with spaces around "+"
 *   taken out; and its suffix, lowercase, or "" for a press
 */
function splitBinding(binding) {
  const trimmed = binding.trim()
  const lower = trimmed.toLowerCase()
  const suffix = SUFFIXES.find((each) => lower.endsWith(each)) ?? ''
  const steps = trimmed
    .slice(0, trimmed.length - suffix.length)
    .replaceAll(/\s*\+\s*/gu, '+')
    .split(/\s+/u)
    .filter((step) => step !== '')
  return { steps, suffix }
}

export { splitBinding }
