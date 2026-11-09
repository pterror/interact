/**
 * Gamepad bindings as strings: one button of the browser's "standard" layout, by its name ("a", "rt", "start") or an
 * alias ("south", "r2", "dpadUp"). Face buttons are named by position: an Xbox pad's A and a PlayStation pad's cross
 * are both "a". Buttons take no modifiers.
 */

/**
 * @typedef {Readonly<{ ctrl: boolean, alt: boolean, shift: boolean, meta: boolean }>} Modifiers
 */

/**
 * @typedef {Readonly<{ lookup: string, bare: string, mods: Modifiers }>} ParsedPad
 */

/**
 * The standard layout's buttons, by index
 * @type {readonly string[]}
 */
const padButtonNames = 'a b x y lb rb lt rt back start ls rs up down left right home'.split(' ')

/**
 * Other names for buttons: by direction, PlayStation's, and the controls' own
 * @type {ReadonlyMap<string, string>}
 */
const padAliases = new Map([
  ['dpaddown', 'down'],
  ['dpadleft', 'left'],
  ['dpadright', 'right'],
  ['dpadup', 'up'],
  ['east', 'b'],
  ['guide', 'home'],
  ['l1', 'lb'],
  ['l2', 'lt'],
  ['l3', 'ls'],
  ['menu', 'start'],
  ['north', 'y'],
  ['r1', 'rb'],
  ['r2', 'rt'],
  ['r3', 'rs'],
  ['select', 'back'],
  ['south', 'a'],
  ['view', 'back'],
  ['west', 'x'],
])

/** @type {Readonly<Modifiers>} */
const NONE = { alt: false, ctrl: false, meta: false, shift: false }

/**
 * Parses one gamepad binding, without a suffix or other steps
 * @param {string} binding - The binding: "south"
 * @returns {ParsedPad} Its button's standard name, as its lookup
 * @throws {Error} If no button has that name
 */
function padParse(binding) {
  const name = binding.trim().toLowerCase()
  const button = padAliases.get(name) ?? name
  if (!padButtonNames.includes(button)) {
    throw new Error(`Unknown gamepad button "${name}" in binding "${binding}". Valid: ${padButtonNames.join(', ')}`)
  }
  return { bare: button, lookup: button, mods: NONE }
}

export { padAliases, padButtonNames, padParse }
